# WebGazer Enhanced Gaze Analytics Implementation

## Overview
This document describes the comprehensive gaze analytics system implemented in the Cognitive Tracker application. The system captures and analyzes eye-tracking data to provide detailed insights into visual attention, reading patterns, and cognitive engagement.

## Architecture

### Data Flow
1. **WebGazer Capture**: Raw gaze coordinates (x, y) captured at high frequency (~60Hz)
2. **Real-time Analysis**: Gaze points analyzed every 1 second using sophisticated algorithms
3. **IPC Communication**: Analytics sent from renderer (dashboard) to main process
4. **Batch Integration**: Gaze analytics included in metrics batch sent to backend

### File Structure
- `/desktop-app/src/dashboard-new.html` - Enhanced WebGazer implementation with analytics algorithms
- `/desktop-app/src/main.js` - IPC handler and batch integration

## Gaze Analytics Metrics

### 1. Fixations
**Definition**: Periods where gaze remains within a small radius (50px) for >100ms

**Algorithm**:
- Groups consecutive gaze points within fixation radius
- Calculates centroid (average x, y position) of each fixation
- Filters out micro-fixations below duration threshold

**Output Structure**:
```javascript
{
  centroid: { x: 450, y: 300 },
  startTime: 1234567890,
  endTime: 1234567992,
  durationMs: 250,
  pointCount: 15
}
```

**Metrics Captured**:
- `fixationCount`: Total number of fixations detected
- `totalFixationTimeMs`: Sum of all fixation durations
- `avgFixationDurationMs`: Mean fixation duration

### 2. Saccades
**Definition**: Rapid eye movements between fixation points (>100px distance)

**Algorithm**:
- Calculates distance between consecutive fixation centroids
- Computes velocity (px/ms) and amplitude (px)
- Determines movement direction (angle in degrees)

**Output Structure**:
```javascript
{
  fromFixation: 0,
  toFixation: 1,
  startPoint: { x: 450, y: 300 },
  endPoint: { x: 650, y: 320 },
  amplitudePx: 201.5,
  velocityPxPerMs: 2.5,
  durationMs: 80,
  angleDegrees: 5.7
}
```

**Metrics Captured**:
- `saccadeCount`: Total number of saccades
- `avgSaccadeAmplitudePx`: Mean saccade distance
- `avgSaccadeVelocityPxPerMs`: Mean saccade speed

**Cognitive Implications**:
- High saccade velocity may indicate visual search or scanning behavior
- Low amplitude saccades suggest focused reading or detailed examination

### 3. Reading Patterns
**Definition**: Left-to-right horizontal eye movements indicating text reading

**Algorithm**:
- Detects sequences of fixations moving horizontally (dx > 50px)
- Ensures fixations remain on same line (dy < 40px)
- Groups consecutive left-to-right movements into reading sequences

**Output Structure**:
```javascript
{
  fixationIndices: [0, 1, 2, 3, 4],
  startTime: 1234567890,
  endTime: 1234568200,
  durationMs: 310,
  fixationCount: 5,
  averageY: 350.5
}
```

**Metrics Captured**:
- `readingPatternCount`: Number of distinct reading sequences
- `fixationCount`: Fixations per reading sequence
- `durationMs`: Time spent on each reading sequence

**Cognitive Implications**:
- More reading patterns suggest text-heavy content consumption
- Longer reading sequences indicate sustained comprehension

### 4. Re-reading Detection
**Definition**: Returning to previously viewed text/areas (same vertical region)

**Algorithm**:
- Compares vertical positions of reading patterns
- Detects when current pattern overlaps with previous pattern (dy < 50px)
- Calculates time elapsed between visits

**Output Structure**:
```javascript
{
  currentPatternIndex: 5,
  previousPatternIndex: 2,
  verticalDistancePx: 25,
  timeBetweenMs: 1500,
  currentY: 350,
  previousY: 325
}
```

**Metrics Captured**:
- `rereadingEventCount`: Number of re-reading instances
- `timeBetweenMs`: Delay before returning to area
- `verticalDistancePx`: Precision of return

**Cognitive Implications**:
- Re-reading may indicate:
  - Difficulty comprehending content
  - Information verification
  - Memory consolidation
  - Confusion or cognitive load

### 5. Screen Region Focus Duration
**Definition**: Time spent fixating on different areas of screen (4x4 grid)

**Algorithm**:
- Divides screen into 16 regions (4 rows × 4 columns)
- Sums fixation durations per region
- Tracks fixation count per region

**Output Structure**:
```javascript
{
  "R0C0": {
    row: 0,
    col: 0,
    totalDurationMs: 2500,
    fixationCount: 10
  },
  "R1C2": {
    row: 1,
    col: 2,
    totalDurationMs: 1800,
    fixationCount: 7
  }
  // ... more regions
}
```

**Cognitive Implications**:
- Uneven distribution suggests areas of high interest
- Top-left bias indicates F-pattern reading
- Center focus may indicate task engagement

## Configuration Parameters

```javascript
const GAZE_CONFIG = {
  fixationRadiusPx: 50,              // Maximum distance for same fixation
  fixationMinDurationMs: 100,        // Minimum fixation duration
  saccadeMinDistancePx: 100,         // Minimum saccade distance
  readingLineHeightPx: 40,           // Vertical tolerance for reading line
  readingMinHorizontalDistancePx: 50,// Minimum horizontal reading movement
  rereadingVerticalTolerancePx: 50,  // Vertical tolerance for re-reading
  screenRegionRows: 4,               // Screen grid rows
  screenRegionCols: 4,               // Screen grid columns
  analysisIntervalMs: 1000           // Analysis frequency
};
```

### Tuning Recommendations
- **Fixation Radius**: Decrease for fine-grained analysis (30-40px), increase for broader patterns (60-80px)
- **Fixation Duration**: Lower threshold (80ms) captures micro-fixations, higher (150ms) focuses on sustained attention
- **Saccade Distance**: Adjust based on screen size and resolution
- **Reading Line Height**: Calibrate based on typical font size in application

## Batch Metrics Structure

The gaze analytics are included in the standard metrics batch:

```javascript
{
  userId: "user-abc123",
  startedAt: "2025-01-15T10:30:00.000Z",
  endedAt: "2025-01-15T10:30:10.000Z",
  keyboard: { ... },
  mouse: { ... },
  scroll: { ... },
  gaze: {
    rawGazePointCount: 600,
    fixationCount: 25,
    totalFixationTimeMs: 6500,
    avgFixationDurationMs: 260,
    saccadeCount: 24,
    avgSaccadeAmplitudePx: 185.3,
    avgSaccadeVelocityPxPerMs: 2.8,
    readingPatternCount: 8,
    rereadingEventCount: 3,
    fixations: [ ... ],        // Detailed fixation data
    saccades: [ ... ],         // Detailed saccade data
    readingPatterns: [ ... ],  // Detailed reading sequences
    rereadingEvents: [ ... ],  // Detailed re-reading events
    regionFocusDurations: { ... } // Region-by-region breakdown
  },
  page: { ... }
}
```

## Usage Instructions

### Starting Eye Tracking

1. Open the dashboard (`dashboard-new.html`)
2. Click "Start Eye Tracking" button
3. Allow webcam access when prompted
4. Look around the screen to calibrate (WebGazer learns your eye patterns)
5. Red dot appears showing real-time gaze position

### Calibration Tips

- Click on various parts of the screen while looking at them
- More calibration = better accuracy
- Recalibrate after significant head position changes
- Works best with good lighting and clear view of face

### Monitoring Analytics

Gaze analytics are:
- Logged to console every 1 second
- Sent to main process via IPC
- Included in 10-second metrics batches
- Transmitted to backend API

## Performance Considerations

### Memory Management
- Gaze points accumulate over time
- Consider clearing old points periodically:
  ```javascript
  // Clear gaze points older than 30 seconds
  const cutoffTime = Date.now() - 30000;
  liveMetrics.gazePoints = liveMetrics.gazePoints.filter(
    p => p.timestamp > cutoffTime
  );
  ```

### Computational Cost
- Fixation detection: O(n) where n = gaze points
- Saccade detection: O(f) where f = fixations
- Reading patterns: O(f²) worst case
- Re-reading detection: O(p²) where p = reading patterns

**Optimization**: Run analysis every 1-2 seconds rather than real-time

### WebGazer Performance
- Runs TensorFlow.js face mesh model
- Requires ~100MB RAM
- GPU acceleration recommended
- May impact battery on laptops

## Research Applications

### Cognitive Assessment
- **Attention**: Fixation duration distribution
- **Processing Speed**: Saccade velocity patterns
- **Memory**: Re-reading frequency
- **Comprehension**: Reading pattern regularity

### Behavioral Benchmarking
- Compare gaze patterns across tasks
- Track changes over time (fatigue, learning)
- Identify cognitive decline indicators
- Measure task engagement

### Machine Learning Features
All gaze metrics can be used as features for:
- Cognitive state classification
- Attention prediction models
- User behavior clustering
- Anomaly detection

## Troubleshooting

### Low Accuracy
- Ensure good lighting
- Recalibrate by clicking around screen
- Check webcam positioning (eye level)
- Avoid glasses glare

### No Gaze Data
- Verify webcam permissions granted
- Check browser console for errors
- Ensure WebGazer.js loaded correctly
- Try different webcam if available

### Performance Issues
- Increase analysis interval (2000ms)
- Reduce fixation detection frequency
- Clear old gaze points more aggressively
- Close other applications using camera

## Future Enhancements

### Potential Additions
1. **Blink Detection**: Track blink rate (fatigue indicator)
2. **Pupil Dilation**: Measure cognitive load (requires better hardware)
3. **Smooth Pursuit**: Track moving object following
4. **Scanpath Visualization**: Generate heatmaps and gaze paths
5. **Attention Zones**: Pre-define AOIs (Areas of Interest)
6. **Calibration Quality**: Measure and display accuracy metrics

### Advanced Algorithms
1. **Hidden Markov Models**: Predict attention state transitions
2. **Machine Learning Classification**: Auto-detect reading vs. scanning
3. **Fractal Analysis**: Measure visual search efficiency
4. **Information Theoretic Metrics**: Calculate gaze entropy

## References

### Eye Tracking Research
- Rayner, K. (1998). Eye movements in reading and information processing
- Holmqvist, K. et al. (2011). Eye tracking: A comprehensive guide to methods and measures
- Salvucci, D. D., & Goldberg, J. H. (2000). Identifying fixations and saccades in eye-tracking protocols

### WebGazer.js
- https://webgazer.cs.brown.edu/
- Papoutsaki, A. et al. (2016). WebGazer: Scalable Webcam Eye Tracking Using User Interactions

## License & Credits

Implementation by: Cognitive Tracker Team
WebGazer.js: Brown University (Apache 2.0 License)
TensorFlow.js: Google (Apache 2.0 License)
