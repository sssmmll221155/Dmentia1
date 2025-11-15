# Enhanced WebGazer Gaze Analytics - Implementation Summary

## Overview
The WebGazer eye tracking implementation has been enhanced with comprehensive gaze analytics algorithms that capture detailed behavioral and cognitive metrics.

## Files Modified

### 1. `/Users/brandonshore/Dmentia1/desktop-app/src/dashboard-new.html`
Enhanced with advanced gaze analytics algorithms and real-time processing.

### 2. `/Users/brandonshore/Dmentia1/desktop-app/src/main.js`
Updated to receive and include gaze analytics in metrics batches.

## Key Features Implemented

### 1. Fixation Detection
**Algorithm**: Density-based clustering with temporal continuity

```javascript
function detectFixations(gazePoints) {
  // Groups gaze points within 50px radius
  // Filters by minimum duration (100ms)
  // Returns fixation centroids with duration and point count
}
```

**Output Example**:
```javascript
{
  centroid: { x: 450, y: 300 },
  startTime: 1736941800000,
  endTime: 1736941800250,
  durationMs: 250,
  pointCount: 15
}
```

### 2. Saccade Detection
**Algorithm**: Inter-fixation movement analysis

```javascript
function detectSaccades(fixations) {
  // Calculates distance between consecutive fixations
  // Computes velocity (px/ms) and direction (degrees)
  // Filters by minimum distance (100px)
}
```

**Output Example**:
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

**Cognitive Significance**:
- High velocity: Visual search, scanning behavior
- Low velocity: Careful examination, reading
- Large amplitude: Attention shifts, context switching

### 3. Reading Pattern Detection
**Algorithm**: Horizontal movement sequence analysis

```javascript
function detectReadingPatterns(fixations) {
  // Identifies left-to-right horizontal movements (dx > 50px)
  // Ensures same-line constraint (dy < 40px)
  // Groups consecutive reading fixations
}
```

**Output Example**:
```javascript
{
  fixationIndices: [0, 1, 2, 3, 4],
  startTime: 1736941800000,
  endTime: 1736941800310,
  durationMs: 310,
  fixationCount: 5,
  averageY: 350.5
}
```

**Cognitive Significance**:
- More patterns: Text-heavy content, reading comprehension
- Longer sequences: Sustained attention, engagement
- Irregular patterns: Difficulty, confusion

### 4. Re-reading Detection
**Algorithm**: Vertical region overlap analysis

```javascript
function detectRereading(fixations, readingPatterns) {
  // Compares vertical positions of reading patterns
  // Detects overlap within tolerance (50px)
  // Calculates temporal gap between visits
}
```

**Output Example**:
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

**Cognitive Significance**:
- Comprehension difficulty
- Information verification
- Memory consolidation
- Confusion or cognitive overload

### 5. Screen Region Focus Duration
**Algorithm**: Grid-based attention heatmap

```javascript
function calculateRegionFocusDurations(fixations) {
  // Divides screen into 4×4 grid (16 regions)
  // Sums fixation duration per region
  // Tracks fixation count per region
}
```

**Output Example**:
```javascript
{
  "R0C0": { row: 0, col: 0, totalDurationMs: 2500, fixationCount: 10 },
  "R0C1": { row: 0, col: 1, totalDurationMs: 1200, fixationCount: 5 },
  "R1C2": { row: 1, col: 2, totalDurationMs: 1800, fixationCount: 7 }
  // ... 13 more regions
}
```

**Cognitive Significance**:
- Top-left bias: F-pattern reading
- Scattered focus: Visual search, exploration
- Concentrated focus: Deep engagement, task focus

## Complete Metrics Structure

```javascript
{
  // Summary Statistics
  rawGazePointCount: 600,
  fixationCount: 25,
  totalFixationTimeMs: 6500,
  avgFixationDurationMs: 260,
  saccadeCount: 24,
  avgSaccadeAmplitudePx: 185.3,
  avgSaccadeVelocityPxPerMs: 2.8,
  readingPatternCount: 8,
  rereadingEventCount: 3,

  // Detailed Data Arrays
  fixations: [
    {
      centroid: { x: 450, y: 300 },
      startTime: 1736941800000,
      endTime: 1736941800250,
      durationMs: 250,
      pointCount: 15
    },
    // ... more fixations
  ],

  saccades: [
    {
      fromFixation: 0,
      toFixation: 1,
      amplitudePx: 201.5,
      velocityPxPerMs: 2.5,
      durationMs: 80,
      angleDegrees: 5.7
    },
    // ... more saccades
  ],

  readingPatterns: [
    {
      fixationIndices: [0, 1, 2, 3, 4],
      durationMs: 310,
      fixationCount: 5,
      averageY: 350.5
    },
    // ... more patterns
  ],

  rereadingEvents: [
    {
      currentPatternIndex: 5,
      previousPatternIndex: 2,
      verticalDistancePx: 25,
      timeBetweenMs: 1500
    },
    // ... more events
  ],

  regionFocusDurations: {
    "R0C0": { totalDurationMs: 2500, fixationCount: 10 },
    "R0C1": { totalDurationMs: 1200, fixationCount: 5 },
    // ... all 16 regions
  }
}
```

## Integration with Batch System

### Dashboard → Main Process Communication

```javascript
// In dashboard-new.html
function startGazeAnalysis() {
  gazeAnalysisInterval = setInterval(() => {
    const gazeAnalytics = computeGazeAnalytics();
    if (gazeAnalytics) {
      // Send to main process
      ipcRenderer.send('gaze-analytics', gazeAnalytics);
    }
  }, 1000); // Every 1 second
}
```

### Main Process → Backend Integration

```javascript
// In main.js
ipcMain.on('gaze-analytics', (event, gazeAnalytics) => {
  latestGazeAnalytics = gazeAnalytics;
  // Will be included in next batch
});

function computeBatchMetrics(startTime, endTime) {
  return {
    userId,
    startedAt: new Date(startTime).toISOString(),
    endedAt: new Date(endTime).toISOString(),
    keyboard: { ... },
    mouse: { ... },
    scroll: { ... },
    gaze: latestGazeAnalytics, // ← GAZE ANALYTICS INCLUDED HERE
    page: { ... }
  };
}
```

## Configuration & Tuning

```javascript
const GAZE_CONFIG = {
  // Fixation Detection
  fixationRadiusPx: 50,              // Spatial tolerance
  fixationMinDurationMs: 100,        // Temporal threshold

  // Saccade Detection
  saccadeMinDistancePx: 100,         // Movement threshold

  // Reading Pattern Detection
  readingLineHeightPx: 40,           // Vertical line tolerance
  readingMinHorizontalDistancePx: 50,// Horizontal progress minimum

  // Re-reading Detection
  rereadingVerticalTolerancePx: 50,  // Same-line detection

  // Screen Regions
  screenRegionRows: 4,               // Grid rows
  screenRegionCols: 4,               // Grid columns

  // Analysis Frequency
  analysisIntervalMs: 1000           // Process every 1 second
};
```

### Tuning Recommendations by Use Case

**High Precision Analysis** (Research):
```javascript
fixationRadiusPx: 30
fixationMinDurationMs: 80
analysisIntervalMs: 500
```

**General Cognitive Tracking** (Default):
```javascript
fixationRadiusPx: 50
fixationMinDurationMs: 100
analysisIntervalMs: 1000
```

**Low Resource / Battery Saving**:
```javascript
fixationRadiusPx: 60
fixationMinDurationMs: 150
analysisIntervalMs: 2000
```

## Usage Example

### Starting Eye Tracking
1. User opens dashboard
2. Clicks "Start Eye Tracking"
3. Grants webcam permission
4. WebGazer initializes with TensorFlow face mesh
5. User calibrates by clicking around screen
6. Red dot appears showing gaze position
7. Analytics begin processing every 1 second

### Sample Console Output
```
[WebGazer] Starting...
[WebGazer] Started successfully!
[GazeAnalytics] Analyzing 342 gaze points...
[GazeAnalytics] Detected 18 fixations
[GazeAnalytics] Detected 17 saccades
[GazeAnalytics] Detected 5 reading patterns
[GazeAnalytics] Detected 2 re-reading events
[GazeAnalytics] Calculated focus durations for 12 regions
[GazeAnalytics] Summary: {
  fixations: 18,
  saccades: 17,
  readingPatterns: 5,
  rereading: 2
}
[Desktop] Received gaze analytics: {
  fixations: 18,
  saccades: 17,
  readingPatterns: 5,
  rereading: 2
}
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      User's Eyes                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Webcam Capture                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  WebGazer.js (TensorFlow Face Mesh + Ridge Regression)         │
│  - Detects face landmarks                                       │
│  - Predicts gaze coordinates (x, y)                             │
│  - Applies Kalman filter smoothing                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Raw Gaze Points Buffer                             │
│  { x: 450, y: 300, timestamp: 1736941800000 }                   │
│  { x: 452, y: 302, timestamp: 1736941800016 }                   │
│  { x: 455, y: 298, timestamp: 1736941800033 }                   │
│  ... (~60 points per second)                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ (Every 1 second)
┌─────────────────────────────────────────────────────────────────┐
│              Gaze Analytics Algorithms                          │
│  1. detectFixations()          → Fixation array                 │
│  2. detectSaccades()           → Saccade array                  │
│  3. detectReadingPatterns()    → Reading pattern array          │
│  4. detectRereading()          → Re-reading events              │
│  5. calculateRegionFocusDurations() → Region heatmap            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           Computed Gaze Analytics Object                        │
│  {                                                               │
│    fixationCount: 25,                                           │
│    avgFixationDurationMs: 260,                                  │
│    saccadeCount: 24,                                            │
│    readingPatternCount: 8,                                      │
│    rereadingEventCount: 3,                                      │
│    fixations: [...],                                            │
│    saccades: [...],                                             │
│    ...                                                           │
│  }                                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ (IPC: 'gaze-analytics')
┌─────────────────────────────────────────────────────────────────┐
│              Main Process (main.js)                             │
│  - Stores in latestGazeAnalytics                                │
│  - Logs summary to console                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ (Every 10 seconds)
┌─────────────────────────────────────────────────────────────────┐
│              Batch Metrics Computation                          │
│  {                                                               │
│    userId: "user-abc123",                                       │
│    keyboard: {...},                                             │
│    mouse: {...},                                                │
│    scroll: {...},                                               │
│    gaze: latestGazeAnalytics, ← INCLUDED HERE                   │
│    page: {...}                                                  │
│  }                                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ (HTTP POST)
┌─────────────────────────────────────────────────────────────────┐
│         Backend API (/api/metrics)                              │
│  - Stores in database                                           │
│  - Available for analysis                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Testing & Validation

### Manual Testing Checklist
- [ ] Start eye tracking successfully
- [ ] Red dot tracks eye movement
- [ ] Console shows gaze analytics every 1 second
- [ ] Fixations detected when staring at one spot
- [ ] Saccades detected when jumping between areas
- [ ] Reading patterns detected when scanning text left-to-right
- [ ] Re-reading detected when returning to previous lines
- [ ] Region focus durations calculated
- [ ] Gaze data included in batch sent to backend

### Expected Behavior Patterns

**Reading Text**:
- High reading pattern count
- Moderate fixation duration (200-300ms)
- Horizontal saccades
- Some re-reading events

**Visual Search**:
- High saccade count
- Short fixation duration (150-200ms)
- Large saccade amplitude
- Scattered region focus

**Focused Work**:
- Long fixation duration (300-500ms)
- Low saccade velocity
- Concentrated region focus
- Few reading patterns

## Performance Metrics

### Computational Complexity
- **Raw Points**: 60 per second = 600 per 10-second batch
- **Fixation Detection**: O(n) where n = gaze points (~600)
- **Saccade Detection**: O(f) where f = fixations (~25)
- **Reading Patterns**: O(f) = ~25 iterations
- **Re-reading**: O(p²) where p = patterns (~8) = 64 iterations
- **Region Focus**: O(f) = ~25 iterations

**Total**: ~700 operations per second of analysis (negligible CPU load)

### Memory Usage
- Gaze points: ~24 bytes × 600 = 14.4 KB per 10 seconds
- Fixations: ~60 bytes × 25 = 1.5 KB
- Saccades: ~80 bytes × 24 = 1.9 KB
- Total gaze data: ~20 KB per batch

**Note**: Consider clearing old gaze points after analysis to prevent unbounded growth

## Cognitive Insights

### Attention Metrics
- **Focus Duration**: Total fixation time in region
- **Attention Shifts**: Saccade count between regions
- **Engagement**: Reading pattern regularity

### Comprehension Indicators
- **Re-reading Rate**: Higher = more difficulty
- **Fixation Duration**: Longer = deeper processing
- **Reading Speed**: Words per fixation

### Cognitive Load
- **Blink Rate**: Not yet implemented (future)
- **Pupil Dilation**: Not available with webcam
- **Saccade Velocity**: Higher = higher cognitive demand

### Fatigue Detection
- **Increasing Fixation Duration**: Over time
- **Decreasing Saccade Velocity**: Over time
- **More Re-reading**: Later in session

## Future Enhancements

### Short Term
1. **Gaze Point Cleanup**: Auto-clear old points to prevent memory growth
2. **Analytics Reset**: Clear analytics when batch is sent
3. **Calibration Quality**: Measure WebGazer accuracy
4. **Performance Mode**: Reduce analysis frequency on low-power devices

### Medium Term
1. **Scanpath Visualization**: Draw user's gaze path on screen
2. **Heatmap Generation**: Visual representation of focus areas
3. **AOI Definition**: Pre-define Areas of Interest for UI elements
4. **Export Analytics**: Save detailed gaze data to file

### Long Term
1. **Machine Learning**: Predict cognitive state from gaze patterns
2. **Real-time Alerts**: Detect fatigue, confusion in real-time
3. **Comparative Analytics**: Benchmark against population norms
4. **Multi-monitor Support**: Track gaze across multiple screens

## Conclusion

The enhanced WebGazer implementation provides comprehensive gaze analytics suitable for:
- **Cognitive research**: Detailed behavioral metrics
- **UX optimization**: Understanding user attention
- **Accessibility**: Detecting reading difficulties
- **Healthcare**: Monitoring cognitive function
- **Education**: Tracking engagement and comprehension

All gaze metrics are automatically captured, analyzed, and included in the standard metrics batch sent to the backend every 10 seconds, enabling long-term tracking and analysis of visual attention patterns.
