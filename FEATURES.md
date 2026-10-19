# SentinelEye - Complete Features

## ✅ Implemented Features

### 1. **Disaster Type Selection**
- 🌊 **Flood** - Water disaster response
- 🏚️ **Earthquake** - Structural collapse rescue
- ⛰️ **Landslide** - Mountain/hill disaster
- 🌀 **Cyclone** - Storm disaster response

### 2. **Interactive India Map**
- Dark theme map with Leaflet.js
- 8 Indian states with major cities
- Zoom and pan controls
- Click to select locations

### 3. **Drone Scanning Area**
- **Orange circle** showing 2km drone coverage radius
- **Grid pattern** showing scanning area
- **Disaster zone label** with type indicator
- Visual representation of affected area

### 4. **Object Detection**
- Detects **people** (👤 orange marker)
- Detects **animals** (🐾 orange marker)
- Real-time detection using TensorFlow.js
- Confidence scores displayed

### 5. **Detection Markers on Map**
- Markers appear at detection locations
- Click markers for details (type, confidence, time)
- Auto-manages last 20 markers
- Color-coded by detection type

### 6. **Live Camera Feed**
- Real-time video from device camera
- Simulates drone camera
- Toggle on/off functionality
- Error handling for permissions

### 7. **Detection Counter**
- Shows total survivors identified
- Updates in real-time
- Large visual display
- Clear markers button

### 8. **Mission Workflow**
1. Select disaster type
2. Choose state and city
3. Click "Take Off" to launch drone
4. Click "Scan Area" to show coverage
5. Click "Cam On" to start detection
6. View detections on map and counter

## 🎨 UI Features

- **Dark Theme** - Professional SentinelEye branding
- **Orange Accents** (#ff6b35) - High visibility
- **Responsive Design** - Works on all devices
- **Smooth Animations** - Professional feel
- **Icon-based Navigation** - Easy to understand

## 📊 Visual Elements

### Sidebar
- Logo with toggle switch
- Mission area section
- Disaster type badge
- Location dropdowns
- Action buttons
- Live camera feed
- Detection counter
- Clear markers button

### Map
- India-centered view
- State/city markers
- Drone coverage circle (2km radius)
- Scanning grid pattern
- Detection markers (people/animals)
- Disaster zone popup

## 🔧 Technical Features

- **Leaflet.js** - Interactive maps
- **TensorFlow.js** - Object detection
- **COCO-SSD Model** - Pre-trained detection
- **WebRTC** - Camera access
- **Responsive CSS** - Mobile-friendly
- **Event-driven** - Smooth interactions

## 🎯 Detection Capabilities

### People Detection
- Face recognition
- Full body detection
- Confidence: 60%+ threshold
- Orange circular marker with 👤 icon

### Animal Detection
- Dogs, cats, birds
- Horses, cows, sheep
- Elephants, bears, zebras, giraffes
- Orange circular marker with 🐾 icon

## 📍 Coverage Areas

### States
- Maharashtra (Mumbai, Pune, Nagpur, Nashik)
- Karnataka (Bangalore, Mysore, Mangalore, Hubli)
- Tamil Nadu (Chennai, Coimbatore, Madurai, Salem)
- Delhi (New Delhi, North Delhi, South Delhi)
- West Bengal (Kolkata, Howrah, Durgapur)
- Gujarat (Ahmedabad, Surat, Vadodara)
- Rajasthan (Jaipur, Jodhpur, Udaipur)
- Uttar Pradesh (Lucknow, Kanpur, Agra)

## 🚀 Usage Flow

```
1. Open index.html in browser
   ↓
2. Select Disaster Type (Flood/Earthquake/etc.)
   ↓
3. Select State from dropdown
   ↓
4. Select City from dropdown
   ↓
5. Click "Take Off" button
   ↓
6. Click "Scan Area" button
   → Drone coverage area appears on map
   ↓
7. Click "Cam On" button
   → Camera feed starts
   → Detection begins automatically
   ↓
8. View detections:
   - Markers on map
   - Counter in sidebar
   - Click markers for details
   ↓
9. Click "Clear Map Markers" to reset
```

## 💡 Key Highlights

✅ **Real-time Detection** - Instant object recognition
✅ **Visual Feedback** - Map markers and counters
✅ **Disaster-Specific** - Tailored for emergency response
✅ **Easy to Use** - Simple workflow
✅ **Professional UI** - Dark theme with orange accents
✅ **Scalable** - Easy to add more states/cities
✅ **Offline Capable** - After initial model load

## 🎨 Color Scheme

- **Background**: #1a1a1a (Dark)
- **Sidebar**: #2a2a2a (Medium Dark)
- **Primary**: #ff6b35 (Orange)
- **Text**: #e0e0e0 (Light Gray)
- **Borders**: #3a3a3a, #4a4a4a (Gray)
- **Disaster Colors**:
  - Flood: #3b82f6 (Blue)
  - Earthquake: #ef4444 (Red)
  - Landslide: #8b5cf6 (Purple)
  - Cyclone: #06b6d4 (Cyan)

---

**Built for disaster response and rescue operations** 🚁💪
