from ultralytics import YOLO
import cv2
import cvzone 
import math
from sort import *
import numpy as np

cap = cv2.VideoCapture("Backend/my_project/cv_model/Videos/cars.mp4")


model = YOLO("Yolo-Weights/yolov8n.pt")

classNames = [
    "person", "bicycle", "car", "motorbike", "aeroplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
    "sofa", "pottedplant", "bed", "diningtable", "toilet", "tvmonitor", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator",
    "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

mask = cv2.imread("Backend/my_project/cv_model/mask.png")

tracker = Sort(max_age=20, min_hits = 3, iou_threshold=0.3)

limits = [420, 297, 673, 297]
total = set()
while True:
    success, img = cap.read()
    if not success:
        break
    imgRegion = cv2.bitwise_and(img, mask)
    imgGraphics = cv2.imread("Backend/my_project/cv_model/graphics.png", cv2.IMREAD_UNCHANGED)
    cvzone.overlayPNG(img, imgGraphics, (0, 0))
    results = model(imgRegion, stream = True)
    detections = np.empty((0, 5))
    for r in results:
        boxes = r.boxes
        for box in boxes:
            # Bouding box
            x1, y1, x2, y2 = box.xyxy[0]
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            w = x2 - x1
            h = y2 - y1
            bbox = int(x1), int(y1), int(w), int(h)
            

            # Confidence
            conf = math.ceil(box.conf[0] * 100) / 100

            # Class name
            cls = int(box.cls[0])
            currentClass = classNames[cls]
            if currentClass in ['car', 'truck', 'bus', 'motorbike'] and conf > 0.3:
                #cvzone.putTextRect(img, f'{currentClass} {conf}', (max(0, x1), max(35, y1)), scale=1, thickness = 2)
                #cvzone.cornerRect(img, bbox=bbox, l=9, rt = 5)
                currentArray = np.array([x1, y1, x2, y2, conf])
                detections = np.vstack((detections, currentArray))
    trackerResults = tracker.update(detections)
    cv2.line(img, (limits[0], limits[1]), (limits[2], limits[3]), (0, 0, 255), 5)
    for res in trackerResults:
        x1,y1,x2,y2,id = res
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        id = int(id)
        w = x2 - x1
        h = y2 - y1
        cvzone.cornerRect(img, (x1, y1, w, h), l = 9, rt = 2, colorR=(255, 0, 255))
        cvzone.putTextRect(img, f'{currentClass} {id}', (max(0, x1), max(35, y1)), scale=2, thickness = 3, offset=10)

        cx, cy = x1 + w // 2, y1 + h // 2
        cv2.circle(img, (cx, cy), 5, (255, 0, 255), cv2.FILLED)

        if limits[0] <= cx <= limits[2] and limits[1] - 15 <= cy <= limits[1] + 15:
            total.add(id)
            cv2.line(img, (limits[0], limits[1]), (limits[2], limits[3]), (0, 255, 0), 5)


    #cvzone.putTextRect(img, f' Count {len(total)}', (50, 50))
    cv2.putText(img, str(len(total)), (255, 100), cv2.FONT_HERSHEY_PLAIN, 5, (50, 50, 255), 8)
    cv2.imshow("Image", img)
    #cv2.imshow("ImageRegion", imgRegion)
    cv2.waitKey(1)