# Gaze Analytics Algorithms - Quick Reference

## Algorithm 1: Fixation Detection

### Purpose
Identify periods where gaze remains stable within a small spatial region, indicating focused attention.

### Input
Array of raw gaze points: `[{x, y, timestamp}, ...]`

### Algorithm
```
1. Initialize currentFixation with first gaze point
2. For each subsequent gaze point:
   a. Calculate centroid of currentFixation (average x, y)
   b. Calculate distance from point to centroid
   c. If distance <= fixationRadiusPx:
      - Add point to currentFixation
      - Update endTime
   d. Else:
      - If currentFixation duration >= minDuration:
        * Save fixation with centroid, times, duration
      - Start new fixation with current point
3. Save final fixation if meets duration threshold
```

### Parameters
- `fixationRadiusPx`: 50 (spatial tolerance)
- `fixationMinDurationMs`: 100 (temporal threshold)

### Output
```javascript
{
  centroid: { x: 450, y: 300 },
  startTime: 1736941800000,
  endTime: 1736941800250,
  durationMs: 250,
  pointCount: 15
}
```

### Complexity
O(n) where n = number of gaze points

---

## Algorithm 2: Saccade Detection

### Purpose
Identify rapid eye movements between fixation points, indicating attention shifts.

### Input
Array of fixations from Algorithm 1

### Algorithm
```
1. For each consecutive pair of fixations (i, i+1):
   a. Calculate distance between centroids
   b. If distance >= saccadeMinDistancePx:
      - Calculate timeDelta = fixation[i+1].startTime - fixation[i].endTime
      - Calculate velocity = distance / timeDelta
      - Calculate angle = atan2(dy, dx) * 180/π
      - Save saccade with all metrics
```

### Parameters
- `saccadeMinDistancePx`: 100

### Output
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

### Complexity
O(f) where f = number of fixations

---

## Algorithm 3: Reading Pattern Detection

### Purpose
Identify sequences of left-to-right horizontal eye movements characteristic of reading.

### Input
Array of fixations

### Algorithm
```
1. Initialize empty currentSequence
2. For each consecutive pair of fixations (i-1, i):
   a. Calculate dx = fixation[i].x - fixation[i-1].x
   b. Calculate dy = |fixation[i].y - fixation[i-1].y|
   c. If dx > readingMinHorizontalDistancePx AND dy < readingLineHeightPx:
      - If currentSequence empty, add fixation[i-1]
      - Add fixation[i] to sequence
   d. Else:
      - If currentSequence length >= 3:
        * Calculate sequence stats (duration, averageY)
        * Save reading pattern
      - Clear currentSequence
3. Save final sequence if length >= 3
```

### Parameters
- `readingMinHorizontalDistancePx`: 50
- `readingLineHeightPx`: 40

### Output
```javascript
{
  fixationIndices: [0, 1, 2, 3, 4],
  startTime: 1736941800000,
  endTime: 1736941800310,
  durationMs: 1310,
  fixationCount: 5,
  averageY: 350.5
}
```

### Complexity
O(f) where f = number of fixations

---

## Algorithm 4: Re-reading Detection

### Purpose
Detect when user returns to previously viewed content, indicating review or comprehension difficulty.

### Input
- Array of fixations
- Array of reading patterns from Algorithm 3

### Algorithm
```
1. For each reading pattern[i] where i >= 1:
   a. For each previous pattern[j] where j < i:
      - Calculate verticalDistance = |pattern[i].averageY - pattern[j].averageY|
      - If verticalDistance < rereadingVerticalTolerancePx:
        * Calculate timeBetween = pattern[i].startTime - pattern[j].endTime
        * Save re-reading event
```

### Parameters
- `rereadingVerticalTolerancePx`: 50

### Output
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

### Complexity
O(p²) where p = number of reading patterns (typically small, ~10)

---

## Algorithm 5: Region Focus Duration

### Purpose
Calculate total attention time for different screen areas using a grid layout.

### Input
Array of fixations

### Algorithm
```
1. Calculate region dimensions:
   - regionWidth = screenWidth / screenRegionCols
   - regionHeight = screenHeight / screenRegionRows
2. Initialize regionDurations = {}
3. For each fixation:
   a. Calculate row = floor(fixation.y / regionHeight)
   b. Calculate col = floor(fixation.x / regionWidth)
   c. Ensure row and col within bounds (0 to rows-1, 0 to cols-1)
   d. Create regionKey = "R{row}C{col}"
   e. If region not in regionDurations:
      - Initialize with row, col, totalDurationMs=0, fixationCount=0
   f. Add fixation.durationMs to region.totalDurationMs
   g. Increment region.fixationCount
4. Return regionDurations
```

### Parameters
- `screenRegionRows`: 4
- `screenRegionCols`: 4

### Output
```javascript
{
  "R0C0": { row: 0, col: 0, totalDurationMs: 2500, fixationCount: 10 },
  "R0C1": { row: 0, col: 1, totalDurationMs: 1200, fixationCount: 5 },
  "R1C2": { row: 1, col: 2, totalDurationMs: 1800, fixationCount: 7 },
  // ... up to 16 regions
}
```

### Complexity
O(f) where f = number of fixations

---

## Summary Statistics Computation

### Purpose
Aggregate all individual metrics into high-level summary.

### Algorithm
```
1. Run all 5 algorithms to get detailed data
2. Calculate summary statistics:
   - rawGazePointCount = gazePoints.length
   - fixationCount = fixations.length
   - totalFixationTimeMs = sum(fixation.durationMs for all fixations)
   - avgFixationDurationMs = totalFixationTimeMs / fixationCount
   - saccadeCount = saccades.length
   - avgSaccadeAmplitudePx = sum(saccade.amplitudePx) / saccadeCount
   - avgSaccadeVelocityPxPerMs = sum(saccade.velocityPxPerMs) / saccadeCount
   - readingPatternCount = readingPatterns.length
   - rereadingEventCount = rereadingEvents.length
3. Return complete analytics object
```

### Output
Complete gaze analytics object with both summary stats and detailed arrays.

---

## Algorithm Execution Flow

```
Raw Gaze Points (600+ points/10s)
         ↓
   [Algorithm 1: Fixation Detection]
         ↓
   Fixations (~25 fixations/10s)
         ↓
         ├→ [Algorithm 2: Saccade Detection] → Saccades
         ├→ [Algorithm 3: Reading Pattern Detection] → Reading Patterns
         ├→ [Algorithm 5: Region Focus Duration] → Region Heatmap
         └→ Reading Patterns
                  ↓
            [Algorithm 4: Re-reading Detection] → Re-reading Events
                  ↓
         [Summary Statistics]
                  ↓
      Complete Gaze Analytics Object
```

---

## Performance Characteristics

| Algorithm | Complexity | Typical Input | Typical Output | Time |
|-----------|-----------|---------------|----------------|------|
| Fixation Detection | O(n) | 600 points | 25 fixations | ~2ms |
| Saccade Detection | O(f) | 25 fixations | 24 saccades | <1ms |
| Reading Patterns | O(f) | 25 fixations | 8 patterns | <1ms |
| Re-reading | O(p²) | 8 patterns | 3 events | <1ms |
| Region Focus | O(f) | 25 fixations | 16 regions | <1ms |
| **Total** | **O(n)** | **600 points** | **Complete** | **~5ms** |

**Note**: Overall complexity is O(n) dominated by fixation detection. All algorithms combined take <10ms, making real-time analysis feasible.

---

## Tuning Guidelines

### High Precision (Research)
```javascript
fixationRadiusPx: 30           // Tighter clustering
fixationMinDurationMs: 80      // Capture micro-fixations
saccadeMinDistancePx: 80       // Detect smaller movements
readingLineHeightPx: 30        // Stricter line detection
```

### Balanced (Default)
```javascript
fixationRadiusPx: 50
fixationMinDurationMs: 100
saccadeMinDistancePx: 100
readingLineHeightPx: 40
```

### Low Resource (Battery Saving)
```javascript
fixationRadiusPx: 70           // Broader clustering
fixationMinDurationMs: 150     // Filter short fixations
saccadeMinDistancePx: 150      // Only major movements
readingLineHeightPx: 50        // Relaxed line detection
analysisIntervalMs: 2000       // Analyze less frequently
```

---

## Key Metrics Interpretation

### Fixation Duration
- **< 150ms**: Cursory glance, minimal processing
- **150-250ms**: Normal reading/browsing
- **250-400ms**: Careful reading, moderate complexity
- **> 400ms**: Difficulty, confusion, or deep analysis

### Saccade Velocity
- **< 1.5 px/ms**: Slow, careful examination
- **1.5-3.5 px/ms**: Normal reading/browsing
- **> 3.5 px/ms**: Rapid visual search, scanning

### Re-reading Rate
- **< 20%**: Minimal re-reading, good comprehension
- **20-40%**: Moderate review, normal for complex content
- **> 40%**: High re-reading, difficulty or verification

### Attention Distribution
- **Concentrated (>50% in one region)**: Focused task
- **Balanced (20-30% in multiple regions)**: Normal browsing
- **Scattered (<20% everywhere)**: Visual search, confusion

---

## Integration Example

```javascript
// In dashboard-new.html
function computeGazeAnalytics() {
  // Step 1: Detect fixations
  const fixations = detectFixations(liveMetrics.gazePoints);

  // Step 2: Detect saccades
  const saccades = detectSaccades(fixations);

  // Step 3: Detect reading patterns
  const readingPatterns = detectReadingPatterns(fixations);

  // Step 4: Detect re-reading
  const rereadingEvents = detectRereading(fixations, readingPatterns);

  // Step 5: Calculate region focus
  const regionFocusDurations = calculateRegionFocusDurations(fixations);

  // Step 6: Compute summary statistics
  const totalFixationTime = fixations.reduce((sum, f) => sum + f.durationMs, 0);
  const avgFixationDuration = fixations.length > 0 ? totalFixationTime / fixations.length : 0;
  // ... more stats

  // Return complete analytics
  return {
    rawGazePointCount: liveMetrics.gazePoints.length,
    fixationCount: fixations.length,
    totalFixationTimeMs: totalFixationTime,
    avgFixationDurationMs: avgFixationDuration,
    // ... all other metrics
    fixations,
    saccades,
    readingPatterns,
    rereadingEvents,
    regionFocusDurations
  };
}
```

---

## Testing Checklist

- [ ] Fixations detected when staring at static point
- [ ] Saccades detected when jumping between areas
- [ ] Reading patterns detected when scanning text horizontally
- [ ] Re-reading detected when returning to previous lines
- [ ] Region focus shows concentration in active areas
- [ ] Summary statistics calculated correctly
- [ ] Analytics sent via IPC to main process
- [ ] Gaze data included in batch metrics
- [ ] Performance remains smooth (<10ms computation)

---

## References

1. **Fixation Algorithms**: Salvucci & Goldberg (2000) - Dispersion-threshold identification
2. **Reading Patterns**: Rayner (1998) - Eye movements in reading
3. **Saccade Detection**: Andersson et al. (2010) - Velocity-threshold identification
4. **Cognitive Load**: Holmqvist et al. (2011) - Eye tracking metrics
