from ultralytics import YOLO
import cv2
import cvzone 
import math

cap = cv2.VideoCapture(0)
cap.set(3, 1280)
cap.set(4, 720)

model = YOLO("Yolo-Weights/yolov8n.pt")


while True:
    success, img = cap.read()
    results = model(img, stream = True)
    for r in results:
        boxes = r.boxes
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0]
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

            #x1, y1, w, h = box.xywh[0]
            w = x2 - x1
            h = y2 - y1
            bbox = int(x1), int(y1), int(w), int(h)
            #print(x1, y1, x2, y2)
            #cv2.rectangle(img, (x1, y1), (x2, y2), (255, 0, 255), 3)

            cvzone.cornerRect(img, bbox=bbox)
            conf = math.ceil(box.conf[0] * 100) / 100
            cvzone.putTextRect(img, f'{conf}', (max(0, x1), max(35, y1)))
            print(conf)
    cv2.imshow("Image", img)
    cv2.waitKey(10)