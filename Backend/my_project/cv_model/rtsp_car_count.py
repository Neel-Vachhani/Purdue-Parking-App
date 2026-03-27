import cv2
import numpy as np
from ultralytics import YOLO
import cvzone
from sort import Sort
import redis
from decouple import config
from multiprocessing import Process

# --- Redis Setup ---
r = redis.Redis(
    host=config("REDIS_HOST"),
    port=config("REDIS_PORT"),
    decode_responses=True,
    username=config("REDIS_USERNAME"),
    password=config("REDIS_PASSWORD"),
)

# --- Camera RTSP Settings (EDIT THESE) ---
RTSP_USERNAME = "admin"                      # from plaintext password section
RTSP_PASSWORD = "BoilerPark2025"  # you set this
CAMERA_IP = "192.168.1.52"                   # your camera’s LAN IP
RTSP_PORT = 10554                            # from manual
RTSP_PATH = "tcp/av0_0"                      # from manual

RTSP_URL = f"rtsp://{RTSP_USERNAME}:{RTSP_PASSWORD}@{CAMERA_IP}:{RTSP_PORT}/{RTSP_PATH}"

# --- Garage definitions ---
GARAGES = {
    "Harrison": {"redis_key": "PGH_availability", "capacity": 240},
    "GrantStreet": {"redis_key": "PGG_availability", "capacity": 240},
    "UniversityStreet": {"redis_key": "PGU_availability", "capacity": 240},
    "Northwestern": {"redis_key": "PGNW_availability", "capacity": 240},
    "DSAI": {"redis_key": "DSAI_availability", "capacity": 60},
}

MASK_PATH = "Backend/my_project/cv_model/mask.png"
GRAPHICS_PATH = "Backend/my_project/cv_model/graphics.png"
YOLO_WEIGHTS = "Yolo-Weights/yolov8n.pt"


class CarCounter:
    def __init__(self, rtsp_url, yolo_weights, redis_key, emptyCapacity=150, mask_path=None, graphics_path=None, conf_threshold=0.3):
        # --- Change: Use RTSP stream instead of video file ---
        self.cap = cv2.VideoCapture(rtsp_url)

        if not self.cap.isOpened():
            print(f"❌ Failed to open RTSP stream: {rtsp_url}")
        else:
            print(f"✅ Connected to RTSP stream: {rtsp_url}")

        # YOLO
        self.model = YOLO(yolo_weights)

        # Mask + graphics
        self.mask = cv2.imread(mask_path) if mask_path else None
        self.graphics = cv2.imread(
            graphics_path, cv2.IMREAD_UNCHANGED) if graphics_path else None

        if self.graphics is not None:
            h, w = self.graphics.shape[:2]
            self.graphics = cv2.resize(self.graphics, (w * 2, h * 2))

        # Tracker
        self.tracker = Sort(max_age=20, min_hits=3, iou_threshold=0.3)

        # Counting logic
        self.incoming = set()
        self.outgoing = set()
        self.prev_positions = {}
        self.obj_colors = {}
        self.line_limits = [150, 1200, 653, 1050]
        self.conf_threshold = conf_threshold
        self.emptyCapacity = emptyCapacity
        self.capacity = emptyCapacity
        self.redis_key = redis_key
        self.detection_classes = ['car', 'truck', 'bus', 'motorbike']
        self.update_redis()

    def update_redis(self):
        try:
            r.set(self.redis_key, self.capacity)
            current_value = r.get(self.redis_key)
            print(f"{self.redis_key} updated to {self.capacity}, read back as {current_value}")
        except Exception as e:
            print(f"Redis update failed for {self.redis_key}: {e}")

    def process_frame(self):
        success, frame = self.cap.read()
        if not success:
            print("❌ Failed to read frame from RTSP camera")
            return None, 0, False

        # frame_region = cv2.bitwise_and(frame, self.mask) if self.mask is not None else frame
        frame_region = frame

        if self.graphics is not None:
            cvzone.overlayPNG(frame, self.graphics, (0, 0))

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

        tracker_results = self.tracker.update(detections)
        crossed_ids = set()
        line_color = (255, 0, 0)

        for res in tracker_results:
            x1, y1, x2, y2, obj_id = map(int, res)
            w, h = x2 - x1, y2 - y1
            cx, cy = x1 + w // 2, y1 + h // 2
            box_color = self.obj_colors.get(obj_id, (255, 0, 255))

            if obj_id in self.prev_positions:
                x1l, y1l, x2l, y2l = self.line_limits

                side_prev = (x2l - x1l) * (self.prev_positions[obj_id] - y1l) - (y2l - y1l) * (cx - x1l)
                side_curr = (x2l - x1l) * (cy - y1l) - (y2l - y1l) * (cx - x1l)

                if side_prev * side_curr < 0:
                    if side_prev > 0 and side_curr < 0:
                        self.outgoing.add(obj_id)
                        self.obj_colors[obj_id] = (0, 100, 0)
                        crossed_ids.add(obj_id)
                    elif side_prev < 0 and side_curr > 0:
                        self.incoming.add(obj_id)
                        self.obj_colors[obj_id] = (0, 0, 255)
                        crossed_ids.add(obj_id)

            self.prev_positions[obj_id] = cy

            cvzone.cornerRect(frame, (x1, y1, w, h), l=9, rt=2, colorR=box_color)
            cvzone.putTextRect(frame, f'ID {obj_id}', (x1, max(35, y1)), scale=2, thickness=3, offset=10)
            cv2.circle(frame, (cx, cy), 5, (255, 0, 255), cv2.FILLED)

        if crossed_ids:
            if any(obj_id in self.incoming for obj_id in crossed_ids):
                line_color = (0, 0, 255)
            if any(obj_id in self.outgoing for obj_id in crossed_ids):
                line_color = (0, 100, 0)

        cv2.line(frame, (self.line_limits[0], self.line_limits[1]),
                 (self.line_limits[2], self.line_limits[3]), line_color, 5)

        self.capacity = self.emptyCapacity - len(self.incoming) + len(self.outgoing)
        if crossed_ids:
            self.update_redis()

        cv2.putText(frame, "Availability:", (420, 120),
                    cv2.FONT_HERSHEY_PLAIN, 3.5, (0, 0, 255), 5)
        cv2.putText(frame, f"{self.capacity}", (420, 200),
                    cv2.FONT_HERSHEY_PLAIN, 3.5, (0, 0, 255), 5)

        return frame, self.capacity, True

    def run(self):
        while True:
            frame, count, success = self.process_frame()
            if not success:
                break
            cv2.imshow(f"Parking Counter - {self.redis_key}", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        self.cap.release()
        cv2.destroyAllWindows()


def run_counter(name, info):
    counter = CarCounter(
        rtsp_url=RTSP_URL,
        yolo_weights=YOLO_WEIGHTS,
        mask_path=MASK_PATH,
        graphics_path=GRAPHICS_PATH,
        redis_key=info["redis_key"],
        emptyCapacity=info["capacity"]
    )
    counter.run()


if __name__ == "__main__":
    single_garage = "Harrison"
    info = GARAGES[single_garage]

    counter = CarCounter(
        rtsp_url=RTSP_URL,
        yolo_weights=YOLO_WEIGHTS,
        mask_path=MASK_PATH,
        graphics_path=GRAPHICS_PATH,
        redis_key=info["redis_key"],
        emptyCapacity=info["capacity"]
    )

    counter.update_redis()
    counter.run()
    counter.update_redis()
