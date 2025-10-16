import cv2
import math
import numpy as np
from ultralytics import YOLO
import cvzone
from sort import Sort

class CarCounter:
    def __init__(self, video_path, yolo_weights, mask_path=None, graphics_path=None, conf_threshold=0.3, emptyCapacity = 150):
        # Video and YOLO model
        self.cap = cv2.VideoCapture(video_path)
        self.model = YOLO(yolo_weights)
        
        # Mask and graphics
        self.mask = cv2.imread(mask_path) if mask_path else None
        self.graphics = cv2.imread(graphics_path, cv2.IMREAD_UNCHANGED) if graphics_path else None

        # Stretch graphics once
        if self.graphics is not None:
            h, w = self.graphics.shape[:2]
            new_w = int(w + 30)  # stretch horizontally
            self.graphics = cv2.resize(self.graphics, (new_w, h))

        # Tracker
        self.tracker = Sort(max_age=20, min_hits=3, iou_threshold=0.3)
        
        # Counting
        self.incoming = set()
        self.outgoing = set()
        self.prev_positions = {}  # {obj_id: cy}
        self.obj_colors = {}      # persist colors per object
        self.line_limits = [420, 297, 673, 297]  # Example line
        self.conf_threshold = conf_threshold
        self.emptyCapacity = emptyCapacity
        self.currCapacity = emptyCapacity
        # Classes to detect
        self.detection_classes = ['car', 'truck', 'bus', 'motorbike']

    def process_frame(self):
        success, frame = self.cap.read()
        if not success:
            return None, 0, False

        # Apply mask if exists
        frame_region = cv2.bitwise_and(frame, self.mask) if self.mask is not None else frame

        # Overlay graphics
        if self.graphics is not None:
            cvzone.overlayPNG(frame, self.graphics, (0, 0))

        # YOLO Detection
        results = self.model(frame_region, stream=True)
        detections = np.empty((0, 5))

        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                class_name = self.model.names[cls]

                if class_name in self.detection_classes and conf > self.conf_threshold:
                    detections = np.vstack((detections, [x1, y1, x2, y2, conf]))

        # Update tracker
        tracker_results = self.tracker.update(detections)

        # Prepare for line color change
        crossed_ids = set()
        line_color = (255, 0, 0)  # default blue

        # Process tracked objects
        for res in tracker_results:
            x1, y1, x2, y2, obj_id = map(int, res)
            w, h = x2 - x1, y2 - y1
            cx, cy = x1 + w // 2, y1 + h // 2

            # Use persisted color if exists
            box_color = self.obj_colors.get(obj_id, (255, 0, 255))  # magenta default

            # Check if within ±15 of the line and moving in correct direction
            if obj_id not in self.obj_colors and obj_id in self.prev_positions:
                prev_cy = self.prev_positions[obj_id]

                # Entering: moving down
                if abs(cy - self.line_limits[1]) <= 15 and cy > prev_cy:
                    self.incoming.add(obj_id)
                    box_color = (0, 0, 255)  # Red
                    self.obj_colors[obj_id] = box_color  # persist
                    crossed_ids.add(obj_id)

                # Leaving: moving up
                elif abs(cy - self.line_limits[1]) <= 15 and cy < prev_cy:
                    self.outgoing.add(obj_id)
                    box_color = (0, 100, 0)  # Dark green
                    self.obj_colors[obj_id] = box_color  # persist
                    crossed_ids.add(obj_id)

            # Save current position
            self.prev_positions[obj_id] = cy

            # Draw bounding box and ID
            cvzone.cornerRect(frame, (x1, y1, w, h), l=9, rt=2, colorR=box_color)
            cvzone.putTextRect(frame, f'ID {obj_id}', (x1, max(35, y1)), scale=2, thickness=3, offset=10)
            cv2.circle(frame, (cx, cy), 5, (255, 0, 255), cv2.FILLED)

        # Change line color if any car is within ±15 of line
        if crossed_ids:
            if any(obj_id in self.incoming for obj_id in crossed_ids):
                line_color = (0, 0, 255)  # Red for entering
            if any(obj_id in self.outgoing for obj_id in crossed_ids):
                line_color = (0, 100, 0)  # Dark green for leaving

        # Draw counting line
        cv2.line(frame, (self.line_limits[0], self.line_limits[1]),
                 (self.line_limits[2], self.line_limits[3]), line_color, 5)

        # Total cars in lot
        self.capacity = self.emptyCapacity - len(self.incoming) + len(self.outgoing)
        cv2.putText(frame, f'Capacity: {self.capacity}', (210, 90),
                    cv2.FONT_HERSHEY_PLAIN, 1.8, (0, 0, 255), 3)

        return frame, self.capacity, True

    def run(self):
        while True:
            frame, count, success = self.process_frame()
            if not success:
                break

            cv2.imshow("Parking Counter", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):  # wait for key to debug
                break

        self.cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    counter = CarCounter(
        video_path="Backend/my_project/cv_model/Videos/cars.mp4",
        yolo_weights="Yolo-Weights/yolov8n.pt",
        mask_path="Backend/my_project/cv_model/mask.png",
        graphics_path="Backend/my_project/cv_model/graphics.png"
    )
    counter.run()
