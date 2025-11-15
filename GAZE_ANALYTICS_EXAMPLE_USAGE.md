# Gaze Analytics Example Usage & Benchmarking

## Example: Analyzing User Session Data

### Sample Gaze Analytics Output

```javascript
{
  "rawGazePointCount": 600,
  "fixationCount": 25,
  "totalFixationTimeMs": 6500,
  "avgFixationDurationMs": 260,
  "saccadeCount": 24,
  "avgSaccadeAmplitudePx": 185.3,
  "avgSaccadeVelocityPxPerMs": 2.8,
  "readingPatternCount": 8,
  "rereadingEventCount": 3,

  "fixations": [
    {
      "centroid": { "x": 450, "y": 300 },
      "startTime": 1736941800000,
      "endTime": 1736941800250,
      "durationMs": 250,
      "pointCount": 15
    },
    {
      "centroid": { "x": 650, "y": 320 },
      "startTime": 1736941800330,
      "endTime": 1736941800590,
      "durationMs": 260,
      "pointCount": 16
    },
    // ... 23 more fixations
  ],

  "saccades": [
    {
      "fromFixation": 0,
      "toFixation": 1,
      "startPoint": { "x": 450, "y": 300 },
      "endPoint": { "x": 650, "y": 320 },
      "amplitudePx": 201.5,
      "velocityPxPerMs": 2.5,
      "durationMs": 80,
      "angleDegrees": 5.7
    },
    // ... 23 more saccades
  ],

  "readingPatterns": [
    {
      "fixationIndices": [0, 1, 2, 3, 4],
      "startTime": 1736941800000,
      "endTime": 1736941800310,
      "durationMs": 1310,
      "fixationCount": 5,
      "averageY": 350.5
    },
    {
      "fixationIndices": [8, 9, 10, 11],
      "startTime": 1736941802000,
      "endTime": 1736941802800,
      "durationMs": 800,
      "fixationCount": 4,
      "averageY": 390.2
    },
    // ... 6 more reading patterns
  ],

  "rereadingEvents": [
    {
      "currentPatternIndex": 5,
      "previousPatternIndex": 2,
      "verticalDistancePx": 25,
      "timeBetweenMs": 1500,
      "currentY": 350,
      "previousY": 325
    },
    {
      "currentPatternIndex": 7,
      "previousPatternIndex": 3,
      "verticalDistancePx": 18,
      "timeBetweenMs": 2200,
      "currentY": 392,
      "previousY": 374
    },
    {
      "currentPatternIndex": 8,
      "previousPatternIndex": 5,
      "verticalDistancePx": 30,
      "timeBetweenMs": 950,
      "currentY": 355,
      "previousY": 385
    }
  ],

  "regionFocusDurations": {
    "R0C0": {
      "row": 0,
      "col": 0,
      "totalDurationMs": 450,
      "fixationCount": 2
    },
    "R0C1": {
      "row": 0,
      "col": 1,
      "totalDurationMs": 820,
      "fixationCount": 3
    },
    "R1C1": {
      "row": 1,
      "col": 1,
      "totalDurationMs": 2500,
      "fixationCount": 10
    },
    "R1C2": {
      "row": 1,
      "col": 2,
      "totalDurationMs": 1800,
      "fixationCount": 7
    },
    "R2C1": {
      "row": 2,
      "col": 1,
      "totalDurationMs": 930,
      "fixationCount": 3
    }
    // ... more regions
  }
}
```

## Interpretation Guide

### 1. Attention Metrics

**Total Gaze Activity**:
- 600 raw gaze points over 10 seconds = 60 points/second (good tracking rate)
- 25 fixations = 2.5 fixations/second (normal for reading/browsing)

**Fixation Quality**:
- Average fixation: 260ms (typical for reading comprehension)
- Total fixation time: 6.5 seconds out of 10 seconds (65% engaged)
- 35% time in saccades or blinks (normal)

**Interpretation**:
```
✓ User is actively engaged (65% fixation time)
✓ Normal reading pace (260ms per fixation)
✓ Healthy attention distribution
```

### 2. Reading Behavior

**Reading Patterns**:
- 8 reading sequences detected
- Average 4-5 fixations per sequence
- Consistent horizontal left-to-right movement

**Re-reading Analysis**:
- 3 re-reading events (38% of reading patterns)
- Average delay before re-reading: 1.55 seconds
- Close vertical alignment (25px average)

**Interpretation**:
```
✓ User is reading text content
⚠ Moderate re-reading suggests some comprehension difficulty
  or careful review behavior
✓ Quick re-reading (1.5s delay) indicates active engagement
  rather than confusion
```

### 3. Visual Attention Distribution

**Region Focus Breakdown**:
```
Top-Left (R0C0):    450ms  (7%)   - Minimal attention
Top-Center (R0C1):  820ms  (13%)  - Header/navigation
Mid-Center (R1C1): 2500ms  (38%)  - Primary content focus
Mid-Right (R1C2):  1800ms  (28%)  - Secondary content
Bottom-Left (R2C1): 930ms  (14%)  - Additional content
```

**Attention Heatmap** (ASCII visualization):
```
   Col0   Col1   Col2   Col3
Row0  ░░    ▒▒    ░░    ░░     Top (navigation)
Row1  ░░    ████  ███   ░░     Middle (main content)
Row2  ░░    ▒▒    ░░    ░░     Bottom
Row3  ░░    ░░    ░░    ░░     Footer

Legend: ░░ = Low (0-10%)  ▒▒ = Medium (10-20%)  ███ = High (20-40%)  ████ = Very High (>40%)
```

**Interpretation**:
```
✓ Strong center focus (F-pattern reading)
✓ Primary attention on main content area (R1C1, R1C2)
✓ Natural reading flow from left to right
⚠ Low attention to top-left (might miss logo/branding)
```

### 4. Eye Movement Dynamics

**Saccade Analysis**:
- 24 saccades in 10 seconds = 2.4 saccades/second
- Average amplitude: 185px (medium-range movements)
- Average velocity: 2.8 px/ms = 280 px/100ms (normal reading speed)

**Movement Patterns**:
```javascript
// Sample saccade analysis
const horizontalSaccades = saccades.filter(s =>
  Math.abs(s.angleDegrees) < 30 || Math.abs(s.angleDegrees) > 150
);
const verticalSaccades = saccades.filter(s =>
  Math.abs(s.angleDegrees) >= 60 && Math.abs(s.angleDegrees) <= 120
);

// Result:
// Horizontal: 18 (75%) - Reading behavior
// Vertical: 6 (25%) - Line changes, scanning
```

**Interpretation**:
```
✓ Predominantly horizontal saccades (75%) = reading text
✓ Moderate velocity indicates comfortable reading pace
✓ Medium amplitude suggests paragraph-level reading
  (not word-by-word or skimming)
```

## Cognitive Benchmarking Examples

### Benchmark 1: Attention Span

```javascript
function calculateAttentionSpan(gazeAnalytics) {
  const totalTime = 10000; // 10 seconds
  const engagedTime = gazeAnalytics.totalFixationTimeMs;
  const attentionSpan = (engagedTime / totalTime) * 100;

  return {
    attentionSpanPercent: attentionSpan,
    rating: attentionSpan > 60 ? 'Good' :
            attentionSpan > 40 ? 'Moderate' : 'Low',
    recommendation: attentionSpan < 60 ?
      'Consider breaks or reducing distractions' :
      'Attention level is healthy'
  };
}

// Example output:
{
  attentionSpanPercent: 65,
  rating: 'Good',
  recommendation: 'Attention level is healthy'
}
```

### Benchmark 2: Reading Comprehension Difficulty

```javascript
function assessReadingDifficulty(gazeAnalytics) {
  const rereadingRate = gazeAnalytics.rereadingEventCount /
                        gazeAnalytics.readingPatternCount;
  const avgFixationDuration = gazeAnalytics.avgFixationDurationMs;

  let difficultyScore = 0;

  // High re-reading suggests difficulty
  if (rereadingRate > 0.5) difficultyScore += 2;
  else if (rereadingRate > 0.3) difficultyScore += 1;

  // Long fixations suggest careful processing or difficulty
  if (avgFixationDuration > 350) difficultyScore += 2;
  else if (avgFixationDuration > 300) difficultyScore += 1;

  return {
    rereadingRate: rereadingRate.toFixed(2),
    avgFixationDuration,
    difficultyScore,
    assessment: difficultyScore >= 3 ? 'High Difficulty' :
                difficultyScore >= 2 ? 'Moderate Difficulty' :
                'Low Difficulty',
    recommendation: difficultyScore >= 3 ?
      'Content may be too complex or user may be fatigued' :
      'Reading comprehension appears normal'
  };
}

// Example output:
{
  rereadingRate: '0.38',
  avgFixationDuration: 260,
  difficultyScore: 1,
  assessment: 'Low Difficulty',
  recommendation: 'Reading comprehension appears normal'
}
```

### Benchmark 3: Visual Search Efficiency

```javascript
function assessSearchEfficiency(gazeAnalytics) {
  const { saccades, regionFocusDurations } = gazeAnalytics;

  // Calculate region coverage
  const activeRegions = Object.keys(regionFocusDurations).length;
  const totalRegions = 16; // 4x4 grid
  const coveragePercent = (activeRegions / totalRegions) * 100;

  // Calculate search speed
  const avgSaccadeVelocity = gazeAnalytics.avgSaccadeVelocityPxPerMs;

  // Calculate focus concentration
  const regionDurations = Object.values(regionFocusDurations)
    .map(r => r.totalDurationMs);
  const maxDuration = Math.max(...regionDurations);
  const concentration = maxDuration / gazeAnalytics.totalFixationTimeMs;

  return {
    coveragePercent: coveragePercent.toFixed(1),
    avgSaccadeVelocity: avgSaccadeVelocity.toFixed(2),
    concentrationRatio: concentration.toFixed(2),
    searchPattern: concentration > 0.5 ? 'Focused' :
                   coveragePercent > 60 ? 'Scattered' : 'Targeted',
    efficiency: avgSaccadeVelocity > 3 && coveragePercent > 60 ? 'High' :
                avgSaccadeVelocity > 2 && coveragePercent > 40 ? 'Moderate' :
                'Low'
  };
}

// Example output:
{
  coveragePercent: '31.3',
  avgSaccadeVelocity: '2.80',
  concentrationRatio: '0.38',
  searchPattern: 'Targeted',
  efficiency: 'Moderate'
}
```

### Benchmark 4: Cognitive Load Estimation

```javascript
function estimateCognitiveLoad(gazeAnalytics) {
  const { avgFixationDurationMs, avgSaccadeVelocityPxPerMs,
          rereadingEventCount, readingPatternCount } = gazeAnalytics;

  let loadScore = 0;

  // Longer fixations = higher processing demand
  if (avgFixationDurationMs > 350) loadScore += 3;
  else if (avgFixationDurationMs > 280) loadScore += 2;
  else if (avgFixationDurationMs > 220) loadScore += 1;

  // Faster saccades = higher cognitive arousal
  if (avgSaccadeVelocityPxPerMs > 4) loadScore += 2;
  else if (avgSaccadeVelocityPxPerMs > 3) loadScore += 1;

  // More re-reading = higher difficulty
  const rereadRate = rereadingEventCount / readingPatternCount;
  if (rereadRate > 0.5) loadScore += 3;
  else if (rereadRate > 0.3) loadScore += 1;

  return {
    cognitiveLoadScore: loadScore,
    loadLevel: loadScore >= 6 ? 'Very High' :
               loadScore >= 4 ? 'High' :
               loadScore >= 2 ? 'Moderate' :
               'Low',
    interpretation: loadScore >= 6 ?
      'User appears to be under significant cognitive strain' :
      loadScore >= 4 ?
      'User is engaged in demanding cognitive processing' :
      loadScore >= 2 ?
      'User is comfortably processing information' :
      'User is in low-demand state (possibly skimming)',
    recommendation: loadScore >= 6 ?
      'Consider simplifying content or suggesting a break' :
      loadScore >= 4 ?
      'Monitor for fatigue, ensure adequate difficulty level' :
      'Cognitive load is within healthy range'
  };
}

// Example output:
{
  cognitiveLoadScore: 3,
  loadLevel: 'Moderate',
  interpretation: 'User is comfortably processing information',
  recommendation: 'Cognitive load is within healthy range'
}
```

### Benchmark 5: Reading Speed Estimation

```javascript
function estimateReadingSpeed(gazeAnalytics) {
  const { readingPatterns, fixations } = gazeAnalytics;

  if (readingPatterns.length === 0) {
    return { wordsPerMinute: 0, assessment: 'No reading detected' };
  }

  // Average reading pattern stats
  const avgFixationsPerPattern = readingPatterns.reduce((sum, p) =>
    sum + p.fixationCount, 0) / readingPatterns.length;

  const avgPatternDuration = readingPatterns.reduce((sum, p) =>
    sum + p.durationMs, 0) / readingPatterns.length;

  // Estimate words (assuming ~1.2 words per fixation for average readers)
  const wordsPerFixation = 1.2;
  const wordsPerPattern = avgFixationsPerPattern * wordsPerFixation;

  // Calculate words per minute
  const patternsPerMinute = (60000 / avgPatternDuration);
  const wordsPerMinute = wordsPerPattern * patternsPerMinute;

  return {
    wordsPerMinute: Math.round(wordsPerMinute),
    fixationsPerPattern: avgFixationsPerPattern.toFixed(1),
    readingSpeed: wordsPerMinute > 300 ? 'Fast' :
                  wordsPerMinute > 200 ? 'Average' :
                  wordsPerMinute > 100 ? 'Slow' :
                  'Very Slow',
    comprehensionNote: wordsPerMinute > 400 ?
      'Very fast - may be skimming rather than deep reading' :
      wordsPerMinute > 200 ?
      'Healthy reading speed with likely good comprehension' :
      'Slow, careful reading - may indicate difficulty or detailed analysis'
  };
}

// Example output:
{
  wordsPerMinute: 245,
  fixationsPerPattern: '4.5',
  readingSpeed: 'Average',
  comprehensionNote: 'Healthy reading speed with likely good comprehension'
}
```

## Longitudinal Analysis Examples

### Tracking Cognitive Decline

```javascript
function analyzeProgressionOverTime(gazeDataArray) {
  // gazeDataArray = array of gaze analytics from multiple sessions

  const sessions = gazeDataArray.map((session, index) => ({
    sessionNumber: index + 1,
    avgFixationDuration: session.avgFixationDurationMs,
    rereadingRate: session.rereadingEventCount / session.readingPatternCount,
    saccadeVelocity: session.avgSaccadeVelocityPxPerMs,
    attentionSpan: (session.totalFixationTimeMs / 10000) * 100
  }));

  // Calculate trends
  const fixationTrend = calculateTrend(sessions.map(s => s.avgFixationDuration));
  const rereadTrend = calculateTrend(sessions.map(s => s.rereadingRate));
  const attentionTrend = calculateTrend(sessions.map(s => s.attentionSpan));

  return {
    sessions,
    trends: {
      fixationDuration: fixationTrend > 0 ? 'Increasing' : 'Decreasing',
      rereadingRate: rereadTrend > 0 ? 'Increasing' : 'Decreasing',
      attentionSpan: attentionTrend > 0 ? 'Improving' : 'Declining'
    },
    alerts: generateAlerts(fixationTrend, rereadTrend, attentionTrend)
  };
}

function calculateTrend(values) {
  // Simple linear regression slope
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b) / n;

  let numerator = 0;
  let denominator = 0;

  values.forEach((y, x) => {
    numerator += (x - xMean) * (y - yMean);
    denominator += (x - xMean) ** 2;
  });

  return numerator / denominator;
}

function generateAlerts(fixationTrend, rereadTrend, attentionTrend) {
  const alerts = [];

  if (fixationTrend > 50) {
    alerts.push('⚠ Fixation duration increasing significantly - may indicate processing difficulty');
  }

  if (rereadTrend > 0.1) {
    alerts.push('⚠ Re-reading rate increasing - comprehension may be declining');
  }

  if (attentionTrend < -5) {
    alerts.push('⚠ Attention span declining - recommend monitoring fatigue levels');
  }

  return alerts.length > 0 ? alerts : ['✓ All metrics within normal ranges'];
}
```

## API Integration Example

### Querying Gaze Analytics from Backend

```javascript
// Example: Fetch and analyze gaze data for a user
async function getUserGazeReport(userId, startDate, endDate) {
  const response = await fetch(
    `/api/metrics?userId=${userId}&startDate=${startDate}&endDate=${endDate}`
  );
  const metrics = await response.json();

  // Extract gaze data from metrics
  const gazeData = metrics
    .filter(m => m.gaze !== null)
    .map(m => m.gaze);

  if (gazeData.length === 0) {
    return { error: 'No gaze data available for this period' };
  }

  // Aggregate statistics
  const aggregated = {
    totalSessions: gazeData.length,
    avgFixationDuration: average(gazeData.map(g => g.avgFixationDurationMs)),
    avgSaccadeVelocity: average(gazeData.map(g => g.avgSaccadeVelocityPxPerMs)),
    avgReadingPatterns: average(gazeData.map(g => g.readingPatternCount)),
    avgRereadingRate: average(gazeData.map(g =>
      g.rereadingEventCount / g.readingPatternCount
    )),
    attentionSpan: average(gazeData.map(g =>
      (g.totalFixationTimeMs / 10000) * 100
    ))
  };

  // Generate comprehensive report
  return {
    userId,
    period: { startDate, endDate },
    sessionCount: gazeData.length,
    aggregated,
    assessments: {
      attention: calculateAttentionSpan(aggregated),
      readingDifficulty: assessReadingDifficulty(aggregated),
      cognitiveLoad: estimateCognitiveLoad(aggregated),
      readingSpeed: estimateReadingSpeed({
        readingPatterns: gazeData.flatMap(g => g.readingPatterns),
        fixations: gazeData.flatMap(g => g.fixations)
      })
    },
    trends: analyzeProgressionOverTime(gazeData),
    rawData: gazeData
  };
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
```

## Visualization Examples

### Heatmap Generation

```javascript
function generateHeatmap(regionFocusDurations) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  const regionWidth = canvas.width / 4;
  const regionHeight = canvas.height / 4;

  // Find max duration for color scaling
  const maxDuration = Math.max(
    ...Object.values(regionFocusDurations).map(r => r.totalDurationMs)
  );

  // Draw heatmap
  Object.entries(regionFocusDurations).forEach(([key, data]) => {
    const { row, col, totalDurationMs } = data;

    // Color intensity based on duration
    const intensity = totalDurationMs / maxDuration;
    const red = Math.floor(255 * intensity);
    const blue = Math.floor(255 * (1 - intensity));

    ctx.fillStyle = `rgb(${red}, 0, ${blue})`;
    ctx.fillRect(
      col * regionWidth,
      row * regionHeight,
      regionWidth,
      regionHeight
    );

    // Add duration text
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(
      `${totalDurationMs}ms`,
      col * regionWidth + 10,
      row * regionHeight + 30
    );
  });

  return canvas.toDataURL();
}
```

### Scanpath Visualization

```javascript
function drawScanpath(fixations, saccades) {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  // Draw fixations as circles
  fixations.forEach((fixation, index) => {
    const radius = Math.sqrt(fixation.durationMs / 10);

    ctx.beginPath();
    ctx.arc(fixation.centroid.x, fixation.centroid.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fill();
    ctx.strokeStyle = 'red';
    ctx.stroke();

    // Number the fixations
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(index + 1, fixation.centroid.x - 5, fixation.centroid.y + 5);
  });

  // Draw saccades as arrows
  saccades.forEach(saccade => {
    ctx.beginPath();
    ctx.moveTo(saccade.startPoint.x, saccade.startPoint.y);
    ctx.lineTo(saccade.endPoint.x, saccade.endPoint.y);
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  return canvas.toDataURL();
}
```

## Conclusion

This gaze analytics system provides rich data for:
- **Real-time monitoring**: Track user attention and engagement
- **Cognitive assessment**: Measure processing speed, comprehension, load
- **Longitudinal studies**: Detect trends and changes over time
- **Behavioral research**: Understand reading patterns and visual search
- **UX optimization**: Identify areas of interest and confusion

All metrics are automatically captured, computed, and stored, ready for analysis and benchmarking.
