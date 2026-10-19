# Quick Start Guide - Drone Mission Control

## 🚀 Getting Started in 3 Steps

### Step 1: Install Python Dependencies

Open Command Prompt or PowerShell and run:

```bash
cd s:\Dashboard\drone-mission-control
pip install opencv-python numpy
```

### Step 2: Run the Application

**Option A: Double-click the batch file**
- Simply double-click `run_drone_mission.bat`

**Option B: Run from command line**
```bash
python drone_detection.py
```

### Step 3: Configure and Launch Mission

1. **Enter Mission Location**
   - State: (e.g., Maharashtra)
   - District: (e.g., Mumbai)
   - City: (e.g., Mumbai)

2. **Press SPACE** to launch the mission

3. **Camera will open automatically**

4. **Press SPACE again** to start object detection

5. **Press R** to generate a rescue report

6. **Press Q** to quit

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| **SPACE** | Toggle Detection ON/OFF |
| **R** | Generate Rescue Report |
| **Q** or **ESC** | Quit Application |

---

## 📊 What Gets Detected?

### People
- ✅ Persons (using face detection)
- ✅ Full body detection

### Animals (with YOLO model)
- ✅ Dogs
- ✅ Cats
- ✅ Birds
- ✅ Horses
- ✅ Cows
- ✅ Sheep
- ✅ And more...

---

## 📝 Report Generation

When you press **R**, the system generates a report containing:

1. **Mission Details**
   - Location (State, District, City)
   - Timestamp

2. **Detection Summary**
   - Total number of detections
   - Count by object type

3. **Detailed Log**
   - Time-stamped list of all detections
   - Confidence scores

Reports are saved as: `rescue_report_YYYYMMDD_HHMMSS.txt`

---

## 🔧 Troubleshooting

### Camera Not Opening?
- Make sure no other application is using the camera
- Close Skype, Teams, or other video apps
- Try restarting the application

### Detection Not Working?
- Ensure good lighting
- Position yourself in front of the camera
- Press SPACE to toggle detection ON

### Want Better Detection?
Run the YOLO setup script for improved accuracy:
```bash
python setup_yolo.py
```
This will download advanced detection models (~240 MB)

---

## 💡 Tips for Best Results

1. **Good Lighting**: Ensure the area is well-lit
2. **Clear View**: Position camera to have unobstructed view
3. **Stable Position**: Keep camera steady for better detection
4. **Multiple Angles**: Scan area from different angles
5. **Save Reports**: Press R regularly to save progress

---

## 🆘 Emergency Use Case

**During Flood/Earthquake:**

1. Launch drone and start the application
2. Enter the disaster location (State, District, City)
3. Turn on detection (SPACE key)
4. Scan the affected area
5. System will automatically detect people and animals
6. Generate report (R key) when detection is complete
7. Send report to rescue team

---

## 📞 Support

For issues or questions:
- Check the README.md file
- Review the troubleshooting section
- Ensure all dependencies are installed

---

## ⚠️ Important Notes

- **Camera Permission**: Allow camera access when prompted
- **Internet**: Not required for basic detection (required for YOLO download)
- **Performance**: Works best on systems with decent CPU
- **Privacy**: All processing is done locally on your machine

---

## 🎯 Example Workflow

```
1. Run: python drone_detection.py
2. Enter: Maharashtra → Mumbai → Mumbai
3. Press: SPACE (launch mission)
4. Camera opens automatically
5. Press: SPACE (start detection)
6. System detects people/animals
7. Press: R (generate report)
8. Report saved: rescue_report_20251004_181145.txt
9. Press: Q (quit)
```

---

## 🌟 Features

✅ Real-time object detection
✅ Automatic report generation
✅ Time-stamped detections
✅ Confidence scores
✅ Multiple detection methods
✅ Easy-to-use interface
✅ No internet required (basic mode)
✅ Works with any webcam

---

**Ready to save lives! 🚁💪**
