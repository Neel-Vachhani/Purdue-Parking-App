from ultralytics import YOLO
import cv2

model = YOLO("Yolo-Weights/yolov8l.pt")

for i in range(1, 4):

    results = model("Images/" + str(i) + ".png")

    annotated_frame = results[0].plot()
    cv2.imwrite("output_" + str(i) + ".png", annotated_frame)

    print("Saved annotated image as output.png")
