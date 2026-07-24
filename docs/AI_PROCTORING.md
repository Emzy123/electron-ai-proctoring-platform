# AI Proctoring — Technical Documentation

*Chapter material for CUSTECH Osara Final Year Project report*

## 1. Overview

The CUSTECH Osara Online Examination System implements **client-side AI proctoring** using [face-api.js](https://github.com/justadudewhohacks/face-api.js), a JavaScript face detection and recognition library built on TensorFlow.js. All inference runs in the student's browser — no GPU server is required.

### Why Client-Side?

| Benefit | Explanation |
|---------|-------------|
| **Cost** | No cloud GPU or ML API fees |
| **Privacy** | Raw video never uploaded; only violation events and small snapshots sent |
| **Latency** | Real-time detection without network round-trips |
| **Scalability** | Processing load distributed across student devices |

## 2. Architecture

```
Student Webcam
      │
      ▼
face-api.js (Browser)
  ├── TinyFaceDetector    → Is a face present?
  ├── FaceLandmark68Net   → Where are eyes, nose, jaw?
  └── FaceRecognitionNet  → 128-d identity descriptor
      │
      ▼
Violation Engine (useProctoring hook)
  ├── Debounce (10s per type)
  ├── Local warning toast
  ├── IndexedDB queue (offline)
  └── Socket.io → Faculty dashboard
```

## 3. Face-API.js Pipeline

### Model Loading

Three model bundles are loaded from `/public/models/` on first use:

1. **tiny_face_detector** — lightweight SSD MobileNet for face bounding boxes
2. **face_landmark_68** — 68 facial landmark points (eyes, nose, mouth, jaw)
3. **face_recognition** — ResNet-based network producing 128-float face descriptors

### Registration & Verification

At registration, a single face descriptor is extracted and stored in MongoDB:

```javascript
const detection = await faceapi
  .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
  .withFaceLandmarks()
  .withFaceDescriptor();

const descriptor = Array.from(detection.descriptor); // 128 floats
```

Pre-exam verification compares live descriptor to stored descriptor:

```javascript
const distance = faceapi.euclideanDistance(storedDescriptor, liveDescriptor);
const passed = distance < 0.6; // threshold
```

Lower distance = more similar faces. Threshold 0.6 is a common default for face-api.js.

### Proctoring Detection Loop

Every **2 seconds** during an exam:

```javascript
const detections = await faceapi
  .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
  .withFaceLandmarks();
```

| Condition | Violation Type |
|-----------|----------------|
| `detections.length === 0` | `face_missing` |
| `detections.length > 1` | `multiple_faces` |
| Gaze heuristic triggered | `gaze_away` |

## 4. Gaze Estimation Heuristic

Full 3D gaze tracking requires specialized hardware. This system uses a **2D landmark heuristic**:

1. **Nose offset**: Compare nose tip X position to face center X. If offset > 22% of face width, flag as looking away.
2. **Head roll**: Calculate angle between left and right eye midpoints. If roll > 18°, flag as head turned.

```javascript
const noseOffset = Math.abs(noseTip.x - faceCenter) / faceWidth;
const rollDegrees = Math.abs(eyeAngle * 180 / Math.PI);
return noseOffset > 0.22 || rollDegrees > 18;
```

This is approximate and tuned for demonstration. Production systems would use dedicated gaze estimation models.

## 5. Violation Handling

### Detection → Action Flow

1. Violation detected by proctoring loop
2. **Debounce**: Same type not re-fired within 10 seconds
3. **Student warning**: Toast message displayed (exam NOT terminated)
4. **Snapshot**: JPEG thumbnail (~320px) captured from webcam
5. **Persist**: Saved via Socket.io (online) or IndexedDB queue (offline)
6. **Faculty notify**: Real-time update on monitoring dashboard

### Violation Types

| Type | Trigger |
|------|---------|
| `face_missing` | No face in webcam frame |
| `multiple_faces` | More than one face detected |
| `gaze_away` | Head turned or eyes off-screen (heuristic) |
| `tab_switch` | `visibilitychange` or window blur |
| `fullscreen_exit` | User exits fullscreen mode |
| `copy_paste` | Copy/paste/cut attempt |
| `face_verify_failed` | Pre-exam identity check failed |

## 6. Faculty Human-in-the-Loop

AI detections are **advisory only**. Faculty can:

- View violation log with timestamps and optional screenshots
- Mark violations as **Valid** (approved) or **Invalid** (dismissed)
- Send live warning messages to students via Socket.io
- Export integrity reports (CSV/PDF) combining score + violations

This hybrid approach balances automation with academic fairness.

## 7. Offline Resilience

When internet drops during an exam:

1. Answers saved to IndexedDB immediately
2. Violations queued locally
3. Exam continues normally (timer, questions, proctoring all client-side)
4. On reconnect, `useOfflineSync` flushes pending data to server

## 8. Limitations & Ethics

### Technical Limitations
- Cannot block OS-level shortcuts (Alt+Tab) — only detect
- Gaze heuristic is 2D approximation, not true eye tracking
- Poor lighting affects face detection accuracy
- Single webcam angle limits visibility

### Ethical Considerations
- Students must consent to webcam monitoring
- False positives possible — faculty review prevents unfair penalties
- Face data stored as mathematical descriptors, not raw video
- System designed for demonstration, not high-stakes certification

### Future Improvements
- MediaPipe Face Mesh for better gaze estimation
- Audio anomaly detection (background voices)
- Screen recording detection
- ML-based behavior scoring with explainability

## 9. References

- face-api.js: https://github.com/justadudewhohacks/face-api.js
- TensorFlow.js: https://www.tensorflow.org/js
- Euclidean distance threshold research: typical range 0.4–0.6 for face-api.js
