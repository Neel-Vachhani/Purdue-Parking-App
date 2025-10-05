from ultralytics import YOLO
import cv2

# Load YOLOv8 model
model = YOLO("Yolo-Weights/yolov8l.pt")

# Run inference
results = model("Images/1.png")

# Get image with boxes drawn
annotated_frame = results[0].plot()

# Show with OpenCV (this will stay open until 'q' is pressed)
cv2.imshow("YOLO Detection", annotated_frame)
cv2.waitKey(0)  # waits indefinitely for a key press
cv2.destroyAllWindows()
