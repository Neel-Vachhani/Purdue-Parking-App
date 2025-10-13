from ultralytics import YOLO
import cv2
import cvzone 
import math

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

while True:
    success, img = cap.read()
    imgRegion = cv2.bitwise_and(img, mask)
    results = model(imgRegion, stream = True)
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
            if currentClass == 'car' or currentClass == 'truck' or currentClass == 'bus' or currentClass == 'motorbike' and conf > 0.3:
                cvzone.putTextRect(img, f'{currentClass} {conf}', (max(0, x1), max(35, y1)), scale=1, thickness = 2)
                cvzone.cornerRect(img, bbox=bbox, l=9)
    cv2.imshow("Image", img)
    cv2.waitKey(0)