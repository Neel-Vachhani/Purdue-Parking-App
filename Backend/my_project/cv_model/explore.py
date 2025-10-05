from ultralytics import YOLO
import cv2

model = YOLO("Yolo-Weights/yolov8l.pt")
results = model("Images/1.png")

annotated_frame = results[0].plot()
cv2.imwrite("output.png", annotated_frame)

print("Saved annotated image as output.png")
