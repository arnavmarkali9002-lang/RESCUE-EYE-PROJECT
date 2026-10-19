# System Flow Diagram

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DRONE MISSION CONTROL SYSTEM                  │
│                     Object Detection for Rescue                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: MISSION CONFIGURATION                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User Input:                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  State   │ → │ District │ → │   City   │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
│                                                                   │
│  Example: Maharashtra → Mumbai → Mumbai                          │
│                                                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: DRONE LAUNCH                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Press SPACE to Launch Mission                                   │
│                                                                   │
│  ┌─────────────────────────────────────────┐                    │
│  │  Camera Initialization                   │                    │
│  │  ├─ Open Camera Feed (cv2.VideoCapture) │                    │
│  │  ├─ Set Resolution                       │                    │
│  │  └─ Start Video Stream                   │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: DETECTION METHOD SELECTION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  System Auto-Selects Best Method:                                │
│                                                                   │
│  ┌──────────────────────────────────────────┐                   │
│  │  Check for YOLO Files                    │                   │
│  │  (yolov3.weights, yolov3.cfg, coco.names)│                   │
│  └────────────┬─────────────────────────────┘                   │
│               │                                                   │
│       ┌───────┴───────┐                                          │
│       │               │                                          │
│   ✅ Found        ❌ Not Found                                   │
│       │               │                                          │
│       ▼               ▼                                          │
│  ┌─────────┐    ┌──────────────┐                               │
│  │  YOLO   │    │ Haar Cascade │                               │
│  │   v3    │    │   (Fallback) │                               │
│  └─────────┘    └──────────────┘                               │
│                                                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: OBJECT DETECTION LOOP                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Press SPACE to Start Detection                                  │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │  While Detection Active:                           │         │
│  │                                                     │         │
│  │  1. Capture Frame                                  │         │
│  │     ├─ success, frame = cam.read()                │         │
│  │     └─ Check if frame valid                       │         │
│  │                                                     │         │
│  │  2. Preprocess Frame                               │         │
│  │     ├─ Resize if needed                           │         │
│  │     ├─ Convert color space (for Haar)             │         │
│  │     └─ Create blob (for YOLO)                     │         │
│  │                                                     │         │
│  │  3. Run Detection                                  │         │
│  │     ├─ YOLO: net.forward(output_layers)           │         │
│  │     └─ Haar: cascade.detectMultiScale()           │         │
│  │                                                     │         │
│  │  4. Process Results                                │         │
│  │     ├─ Filter by confidence threshold             │         │
│  │     ├─ Apply non-max suppression                  │         │
│  │     └─ Filter target classes                      │         │
│  │                                                     │         │
│  │  5. Draw Overlays                                  │         │
│  │     ├─ Bounding boxes                             │         │
│  │     ├─ Labels                                     │         │
│  │     └─ Confidence scores                          │         │
│  │                                                     │         │
│  │  6. Log Detections                                 │         │
│  │     ├─ Object class                               │         │
│  │     ├─ Confidence score                           │         │
│  │     └─ Timestamp                                  │         │
│  │                                                     │         │
│  │  7. Display Frame                                  │         │
│  │     └─ cv2.imshow('Drone Camera Feed', frame)    │         │
│  │                                                     │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: REPORT GENERATION                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Press R to Generate Report                                      │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │  Report Components:                                │         │
│  │                                                     │         │
│  │  1. Mission Details                                │         │
│  │     ├─ Location (State, District, City)           │         │
│  │     ├─ Start time                                 │         │
│  │     └─ Report generation time                     │         │
│  │                                                     │         │
│  │  2. Detection Summary                              │         │
│  │     ├─ Total detections                           │         │
│  │     ├─ Count by object type                       │         │
│  │     └─ Average confidence                         │         │
│  │                                                     │         │
│  │  3. Detailed Log                                   │         │
│  │     ├─ Timestamp for each detection               │         │
│  │     ├─ Object class                               │         │
│  │     └─ Confidence score                           │         │
│  │                                                     │         │
│  │  4. Save to File                                   │         │
│  │     └─ rescue_report_YYYYMMDD_HHMMSS.txt         │         │
│  │                                                     │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: MISSION END                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Press Q or ESC to End Mission                                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │  Cleanup:                                          │         │
│  │  ├─ Stop detection loop                           │         │
│  │  ├─ Release camera (cam.release())                │         │
│  │  ├─ Close windows (cv2.destroyAllWindows())       │         │
│  │  ├─ Generate final report                         │         │
│  │  └─ Display summary                               │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detection Pipeline Detail

```
┌─────────────────────────────────────────────────────────────────┐
│                    OBJECT DETECTION PIPELINE                     │
└─────────────────────────────────────────────────────────────────┘

INPUT: Video Frame (640x480 or higher)
   │
   ▼
┌──────────────────────────────────────┐
│  METHOD 1: YOLO v3                   │
├──────────────────────────────────────┤
│                                      │
│  1. Blob Creation                    │
│     └─ cv2.dnn.blobFromImage()      │
│                                      │
│  2. Forward Pass                     │
│     └─ net.forward(output_layers)   │
│                                      │
│  3. Parse Detections                 │
│     ├─ Extract bounding boxes       │
│     ├─ Get confidence scores        │
│     └─ Identify class IDs           │
│                                      │
│  4. Non-Max Suppression              │
│     └─ cv2.dnn.NMSBoxes()           │
│                                      │
│  5. Filter Target Classes            │
│     └─ person, dog, cat, etc.       │
│                                      │
└──────────────────────────────────────┘
   │
   ▼
OUTPUT: Detected Objects with Bounding Boxes

┌──────────────────────────────────────┐
│  METHOD 2: Haar Cascade              │
├──────────────────────────────────────┤
│                                      │
│  1. Grayscale Conversion             │
│     └─ cv2.cvtColor(BGR2GRAY)       │
│                                      │
│  2. Face Detection                   │
│     └─ face_cascade.detectMultiScale│
│                                      │
│  3. Body Detection                   │
│     └─ body_cascade.detectMultiScale│
│                                      │
│  4. Combine Results                  │
│     └─ Merge face + body detections │
│                                      │
└──────────────────────────────────────┘
   │
   ▼
OUTPUT: Person Detections with Bounding Boxes
```

---

## Data Flow

```
┌─────────────┐
│   Camera    │
│   (Input)   │
└──────┬──────┘
       │
       │ Video Stream
       │
       ▼
┌─────────────────┐
│  Frame Capture  │
│  (cv2.read())   │
└────────┬────────┘
         │
         │ Raw Frame
         │
         ▼
┌──────────────────┐
│   Preprocessing  │
│  (resize, color) │
└────────┬─────────┘
         │
         │ Processed Frame
         │
         ▼
┌──────────────────┐
│ Object Detection │
│  (YOLO/Haar)     │
└────────┬─────────┘
         │
         │ Detection Results
         │
         ▼
┌──────────────────┐
│  Post-processing │
│ (filter, NMS)    │
└────────┬─────────┘
         │
         │ Filtered Detections
         │
         ├──────────────┬──────────────┐
         │              │              │
         ▼              ▼              ▼
┌─────────────┐  ┌──────────┐  ┌──────────┐
│   Display   │  │   Log    │  │  Report  │
│  (Screen)   │  │ (Memory) │  │  (File)  │
└─────────────┘  └──────────┘  └──────────┘
```

---

## State Machine

```
┌─────────────┐
│   STARTUP   │
└──────┬──────┘
       │
       │ Initialize
       │
       ▼
┌─────────────┐
│  CONFIGURE  │ ◄─────────┐
└──────┬──────┘           │
       │                  │
       │ Enter Location   │
       │                  │
       ▼                  │
┌─────────────┐           │
│   READY     │           │
└──────┬──────┘           │
       │                  │
       │ Press SPACE      │
       │                  │
       ▼                  │
┌─────────────┐           │
│  LAUNCHED   │           │
└──────┬──────┘           │
       │                  │
       │ Camera Opens     │
       │                  │
       ▼                  │
┌─────────────┐           │
│  STREAMING  │           │
└──────┬──────┘           │
       │                  │
       │ Press SPACE      │
       │                  │
       ▼                  │
┌─────────────┐           │
│  DETECTING  │ ◄─┐       │
└──────┬──────┘   │       │
       │          │       │
       │ Press R  │       │
       │          │       │
       ▼          │       │
┌─────────────┐   │       │
│  REPORTING  │ ──┘       │
└──────┬──────┘           │
       │                  │
       │ Press Q          │
       │                  │
       ▼                  │
┌─────────────┐           │
│  SHUTDOWN   │ ──────────┘
└─────────────┘
       │
       │ Cleanup
       │
       ▼
┌─────────────┐
│     END     │
└─────────────┘
```

---

## Keyboard Controls Flow

```
┌────────────────────────────────────────┐
│         KEYBOARD CONTROLS              │
└────────────────────────────────────────┘

SPACE Key:
   │
   ├─ In READY state → Launch Mission
   │                   └─ Open Camera
   │
   ├─ In STREAMING state → Start Detection
   │                        └─ Activate Detection Loop
   │
   └─ In DETECTING state → Stop Detection
                           └─ Pause Detection Loop

R Key:
   │
   └─ In any active state → Generate Report
                            ├─ Compile detections
                            ├─ Format report
                            └─ Save to file

Q or ESC Key:
   │
   └─ In any state → Shutdown
                     ├─ Stop detection
                     ├─ Release camera
                     ├─ Close windows
                     └─ Generate final report
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────┐
│         ERROR HANDLING                  │
└─────────────────────────────────────────┘

Camera Error:
   │
   ├─ Camera not found
   │  └─ Display error message
   │     └─ Exit gracefully
   │
   ├─ Camera in use
   │  └─ Suggest closing other apps
   │     └─ Retry or exit
   │
   └─ Permission denied
      └─ Request camera permissions
         └─ Retry or exit

Model Error:
   │
   ├─ YOLO files not found
   │  └─ Fall back to Haar Cascade
   │     └─ Continue with reduced features
   │
   └─ Model loading failed
      └─ Display error
         └─ Exit or retry

Detection Error:
   │
   ├─ Frame read failed
   │  └─ Skip frame
   │     └─ Continue with next frame
   │
   └─ Detection timeout
      └─ Log warning
         └─ Continue operation
```

---

## Performance Optimization Flow

```
┌─────────────────────────────────────────┐
│      PERFORMANCE OPTIMIZATION           │
└─────────────────────────────────────────┘

Frame Processing:
   │
   ├─ Skip frames if CPU overloaded
   │  └─ Process every Nth frame
   │
   ├─ Resize large frames
   │  └─ Maintain aspect ratio
   │
   └─ Use efficient color conversion
      └─ BGR to RGB only when needed

Detection:
   │
   ├─ Adjust confidence threshold
   │  └─ Higher = faster, fewer detections
   │
   ├─ Limit detection region
   │  └─ Focus on center of frame
   │
   └─ Batch processing
      └─ Process multiple frames together

Memory Management:
   │
   ├─ Release unused frames
   │  └─ Clear after processing
   │
   ├─ Limit detection log size
   │  └─ Save to file periodically
   │
   └─ Garbage collection
      └─ Clean up old objects
```

This comprehensive flow diagram shows how all components of the system work together!
