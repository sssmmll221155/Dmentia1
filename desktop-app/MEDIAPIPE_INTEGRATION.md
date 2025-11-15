# MediaPipe Integration Guide

## Overview

MediaPipe provides powerful on-device ML for hand tracking, which is PERFECT for detecting:
- **Hand tremors** - Early Parkinson's indicator
- **Fine motor control** - Coordination while typing
- **Hand position stability** - Precision decline
- **Movement smoothness** - Motor planning issues

## Installation

```bash
cd desktop-app
npm install @mediapipe/tasks-vision
npm install @mediapipe/hands
```

## Architecture

```
Electron Desktop App
  ├─ Main Process (main.js)
  │   └─ System-wide keyboard/mouse tracking
  └─ Renderer Process (separate window)
      └─ MediaPipe hand tracking via webcam
```

## Implementation Steps

### 1. Create Hand Tracking Window

Add to `src/main.js`:

```javascript
let handTrackingWindow = null;

function createHandTrackingWindow() {
  handTrackingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: true, // Show for user to see their hands
    frame: false, // Minimal UI
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  handTrackingWindow.loadFile(path.join(__dirname, 'hand-tracking.html'));
}
```

### 2. Create Hand Tracking HTML

**File: `src/hand-tracking.html`**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Hand Tracking</title>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
    <style>
        body {
            margin: 0;
            background: rgba(0,0,0,0.3);
            overflow: hidden;
        }
        #container {
            position: relative;
            width: 400px;
            height: 300px;
        }
        video {
            position: absolute;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        canvas {
            position: absolute;
            width: 100%;
            height: 100%;
        }
        #metrics {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div id="container">
        <video id="video" autoplay></video>
        <canvas id="canvas"></canvas>
        <div id="metrics">
            <div>Tremor: <span id="tremor-score">--</span></div>
            <div>Stability: <span id="stability-score">--</span></div>
            <div>Smoothness: <span id="smoothness-score">--</span></div>
        </div>
    </div>

    <script>
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // MediaPipe Hands setup
        const hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        // Tremor detection state
        const landmarkHistory = {
            left: [],
            right: []
        };

        const HISTORY_LENGTH = 30; // ~1 second at 30fps

        hands.onResults(onResults);

        function onResults(results) {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (results.multiHandLandmarks && results.multiHandedness) {
                for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                    const landmarks = results.multiHandLandmarks[i];
                    const handedness = results.multiHandedness[i].label; // 'Left' or 'Right'

                    // Draw hand landmarks
                    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                        color: '#00FF00',
                        lineWidth: 2
                    });
                    drawLandmarks(ctx, landmarks, {
                        color: '#FF0000',
                        lineWidth: 1
                    });

                    // Detect tremor using index finger tip (landmark 8)
                    const indexTip = landmarks[8];

                    // Store position history
                    const history = landmarkHistory[handedness.toLowerCase()];
                    history.push({
                        x: indexTip.x,
                        y: indexTip.y,
                        z: indexTip.z,
                        timestamp: Date.now()
                    });

                    // Keep only recent history
                    if (history.length > HISTORY_LENGTH) {
                        history.shift();
                    }

                    // Compute tremor metrics
                    if (history.length >= 10) {
                        const tremor = computeTremorScore(history);
                        const stability = computeStabilityScore(history);
                        const smoothness = computeSmoothnessScore(history);

                        // Update UI
                        document.getElementById('tremor-score').textContent = tremor.toFixed(2);
                        document.getElementById('stability-score').textContent = stability.toFixed(2);
                        document.getElementById('smoothness-score').textContent = smoothness.toFixed(2);

                        // Send to main process
                        if (window.ipcRenderer) {
                            window.ipcRenderer.send('hand-tremor-data', {
                                hand: handedness.toLowerCase(),
                                tremor,
                                stability,
                                smoothness,
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            }
        }

        /**
         * Compute tremor score from position variance
         */
        function computeTremorScore(history) {
            if (history.length < 2) return 0;

            // Compute high-frequency oscillations
            const velocities = [];

            for (let i = 1; i < history.length; i++) {
                const prev = history[i - 1];
                const curr = history[i];
                const dt = (curr.timestamp - prev.timestamp) / 1000; // seconds

                if (dt > 0) {
                    const dx = curr.x - prev.x;
                    const dy = curr.y - prev.y;
                    const dz = curr.z - prev.z;
                    const velocity = Math.sqrt(dx*dx + dy*dy + dz*dz) / dt;
                    velocities.push(velocity);
                }
            }

            // Tremor = variance in velocity (unstable movement)
            return computeVariance(velocities);
        }

        /**
         * Compute stability score (inverse of position variance)
         */
        function computeStabilityScore(history) {
            const positions = history.map(h => ({ x: h.x, y: h.y, z: h.z }));

            const xVals = positions.map(p => p.x);
            const yVals = positions.map(p => p.y);
            const zVals = positions.map(p => p.z);

            const xVar = computeVariance(xVals);
            const yVar = computeVariance(yVals);
            const zVar = computeVariance(zVals);

            const totalVar = xVar + yVar + zVar;

            // Lower variance = higher stability
            return 1 / (1 + totalVar * 1000); // Scaled for readability
        }

        /**
         * Compute movement smoothness (jerk analysis)
         */
        function computeSmoothnessScore(history) {
            if (history.length < 3) return 0;

            const accelerations = [];

            for (let i = 2; i < history.length; i++) {
                const p0 = history[i - 2];
                const p1 = history[i - 1];
                const p2 = history[i];

                const dt1 = (p1.timestamp - p0.timestamp) / 1000;
                const dt2 = (p2.timestamp - p1.timestamp) / 1000;

                if (dt1 > 0 && dt2 > 0) {
                    const v1x = (p1.x - p0.x) / dt1;
                    const v1y = (p1.y - p0.y) / dt1;
                    const v2x = (p2.x - p1.x) / dt2;
                    const v2y = (p2.y - p1.y) / dt2;

                    const ax = (v2x - v1x) / dt2;
                    const ay = (v2y - v1y) / dt2;

                    const accel = Math.sqrt(ax*ax + ay*ay);
                    accelerations.push(accel);
                }
            }

            // Smoothness = inverse of acceleration variance (jerk)
            const jerk = computeVariance(accelerations);
            return 1 / (1 + jerk * 100);
        }

        function computeVariance(values) {
            if (values.length === 0) return 0;
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
            return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        }

        // Start camera
        const camera = new Camera(video, {
            onFrame: async () => {
                await hands.send({ image: video });
            },
            width: 400,
            height: 300
        });

        camera.start();
    </script>
</body>
</html>
```

### 3. Update Main Process to Collect Hand Data

Add to `src/main.js`:

```javascript
// Hand tracking data buffer
const handTrackingBuffer = [];

ipcMain.on('hand-tremor-data', (event, data) => {
  handTrackingBuffer.push(data);
});

// In computeBatchMetrics function, add:
function computeBatchMetrics(startTime, endTime) {
  // ... existing code ...

  // Hand tracking metrics
  const handMetrics = computeHandMetrics();

  return {
    // ... existing fields ...
    handTracking: handMetrics
  };
}

function computeHandMetrics() {
  if (handTrackingBuffer.length === 0) return null;

  const leftHand = handTrackingBuffer.filter(d => d.hand === 'left');
  const rightHand = handTrackingBuffer.filter(d => d.hand === 'right');

  const avgLeftTremor = leftHand.length > 0
    ? leftHand.reduce((sum, d) => sum + d.tremor, 0) / leftHand.length
    : null;

  const avgRightTremor = rightHand.length > 0
    ? rightHand.reduce((sum, d) => sum + d.tremor, 0) / rightHand.length
    : null;

  const avgLeftStability = leftHand.length > 0
    ? leftHand.reduce((sum, d) => sum + d.stability, 0) / leftHand.length
    : null;

  const avgRightStability = rightHand.length > 0
    ? rightHand.reduce((sum, d) => sum + d.stability, 0) / rightHand.length
    : null;

  // Clear buffer
  handTrackingBuffer.length = 0;

  return {
    leftHand: {
      tremor: avgLeftTremor,
      stability: avgLeftStability
    },
    rightHand: {
      tremor: avgRightTremor,
      stability: avgRightStability
    }
  };
}
```

### 4. Update Database Schema

Add to `server/prisma/schema.prisma`:

```prisma
model MetricsBatch {
  // ... existing fields ...

  // Hand tracking metrics (nullable)
  handLeftTremor      Float?
  handLeftStability   Float?
  handRightTremor     Float?
  handRightStability  Float?
}

model DailySummary {
  // ... existing fields ...

  // Hand tracking aggregates
  avgHandLeftTremor    Float?
  avgHandRightTremor   Float?
  avgHandLeftStability Float?
  avgHandRightStability Float?
}

model UserBaseline {
  // ... existing fields ...

  // Hand tracking baselines
  baselineLeftTremor    Float?
  baselineRightTremor   Float?
  baselineLeftStability Float?
  baselineRightStability Float?
}
```

## Cognitive Indicators from Hand Tracking

### 1. Tremor Detection
- **Essential Tremor**: High-frequency oscillations (4-12 Hz)
- **Parkinson's**: Rest tremor, decreases with intentional movement
- **Intention Tremor**: Increases when reaching for objects

### 2. Fine Motor Control
- Typing hand position variability
- Coordination between keypress and hand movement
- Hand steadiness during mouse use

### 3. Early Warning Signs
- Increasing tremor over weeks/months
- Decreased stability scores
- Reduced smoothness (jerky movements)

## Privacy Considerations

- Only collect **aggregate metrics** (tremor score, stability score)
- Do NOT record or transmit video
- All processing happens on-device
- Hand tracking window can be minimized or hidden

## Testing

```bash
cd desktop-app
npm install
npm start
```

The hand tracking window should appear showing your hands with metrics overlay.

## Next Steps

1. Correlate hand tremor with typing quality
2. Detect tremor specifically during typing vs rest
3. Add alerts when tremor increases significantly
4. Build visualization of tremor trends over time
