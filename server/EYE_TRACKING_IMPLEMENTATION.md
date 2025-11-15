# Eye Tracking Implementation Guide

## Overview

This document describes the database schema and backend API for storing detailed eye tracking metrics in the Cognitive Tracking System. The implementation captures comprehensive eye movement data for benchmark analysis and cognitive assessment.

## Database Schema Changes

### New Models

#### 1. FixationEvent
Stores data when the user's gaze remains on a specific region.

```prisma
model FixationEvent {
  id             String        @id @default(uuid())
  batchId        String
  batch          MetricsBatch  @relation(fields: [batchId], references: [id], onDelete: Cascade)

  timestamp      BigInt        // Unix timestamp when fixation started
  x              Float         // Fixation center X coordinate
  y              Float         // Fixation center Y coordinate
  durationMs     Float         // How long the fixation lasted
  regionId       String?       // Optional screen region identifier

  @@index([batchId])
}
```

**Use Cases:**
- Identifying areas of interest
- Measuring attention duration
- Detecting cognitive load (longer fixations may indicate confusion)

#### 2. SaccadeEvent
Records rapid eye movements between fixations.

```prisma
model SaccadeEvent {
  id             String        @id @default(uuid())
  batchId        String
  batch          MetricsBatch  @relation(fields: [batchId], references: [id], onDelete: Cascade)

  timestamp      BigInt        // Unix timestamp when saccade started
  fromX          Float         // Starting X coordinate
  fromY          Float         // Starting Y coordinate
  toX            Float         // Ending X coordinate
  toY            Float         // Ending Y coordinate
  velocityPxPerSec Float       // Saccade velocity
  amplitudePx    Float         // Euclidean distance traveled
  durationMs     Float         // Saccade duration

  @@index([batchId])
}
```

**Use Cases:**
- Measuring search efficiency
- Detecting disorientation (erratic saccades)
- Analyzing reading patterns

#### 3. ReadingPattern
Captures reading behavior during text-heavy interactions.

```prisma
model ReadingPattern {
  id             String        @id @default(uuid())
  batchId        String
  batch          MetricsBatch  @relation(fields: [batchId], references: [id], onDelete: Cascade)

  timestamp      BigInt        // Unix timestamp when pattern detected
  direction      String        // 'left-to-right', 'right-to-left', 'top-to-bottom', 'irregular'
  speedWordsPerMin Float?      // Estimated reading speed
  lineCount      Int           // Number of lines traversed
  regressionCount Int          // Number of backward saccades (re-reading)

  @@index([batchId])
}
```

**Use Cases:**
- Detecting reading comprehension issues (high regression count)
- Measuring cognitive processing speed
- Identifying language/orientation difficulties

#### 4. RereadingEvent
Tracks when users revisit the same screen region multiple times.

```prisma
model RereadingEvent {
  id             String        @id @default(uuid())
  batchId        String
  batch          MetricsBatch  @relation(fields: [batchId], references: [id], onDelete: Cascade)

  regionId       String        // Screen region identifier
  visitCount     Int           // Number of times this region was revisited
  timestamps     String        // JSON array of visit timestamps
  totalDurationMs Float        // Total time spent in this region across all visits

  @@index([batchId])
  @@index([regionId])
}
```

**Use Cases:**
- Detecting memory issues (excessive re-reading)
- Identifying confusion points in UI
- Measuring information retention

#### 5. RegionFocus
Aggregates focus time per screen region.

```prisma
model RegionFocus {
  id             String        @id @default(uuid())
  batchId        String
  batch          MetricsBatch  @relation(fields: [batchId], references: [id], onDelete: Cascade)

  regionId       String        // Screen region identifier
  regionLabel    String?       // Human-readable label (e.g., "navigation", "content", "sidebar")
  x              Float         // Region center X
  y              Float         // Region center Y
  width          Float         // Region width
  height         Float         // Region height
  focusDurationMs Float        // Total focus time in this region
  fixationCount  Int           // Number of fixations in this region
  firstVisitTimestamp BigInt   // When region was first viewed
  lastVisitTimestamp  BigInt   // When region was last viewed

  @@index([batchId])
  @@index([regionId])
}
```

**Use Cases:**
- Heatmap generation
- UI/UX analysis
- Attention distribution analysis

## API Endpoints

### POST /api/metrics
**Extended to accept detailed eye tracking data**

#### Request Body Structure

```json
{
  "userId": "user-uuid",
  "startedAt": "2024-01-15T10:00:00Z",
  "endedAt": "2024-01-15T10:00:10Z",
  "page": {
    "url": "https://example.com/article",
    "domain": "example.com"
  },
  "keyboard": { ... },
  "mouse": { ... },
  "scroll": { ... },
  "gaze": {
    "gazeEventCount": 150,
    "meanFixationDurationMs": 250,
    "saccadeCount": 45,
    "meanSaccadeLengthPx": 120,
    "gazePoints": [
      { "x": 100, "y": 200, "timestamp": 1705315200000 }
    ],
    // NEW DETAILED METRICS
    "fixations": [
      {
        "timestamp": 1705315200000,
        "x": 100,
        "y": 200,
        "durationMs": 250,
        "regionId": "content-area"
      }
    ],
    "saccades": [
      {
        "timestamp": 1705315200500,
        "fromX": 100,
        "fromY": 200,
        "toX": 150,
        "toY": 220,
        "velocityPxPerSec": 450,
        "amplitudePx": 53.85,
        "durationMs": 35
      }
    ],
    "readingPatterns": [
      {
        "timestamp": 1705315200000,
        "direction": "left-to-right",
        "speedWordsPerMin": 250,
        "lineCount": 5,
        "regressionCount": 2
      }
    ],
    "rereadingEvents": [
      {
        "regionId": "top-paragraph",
        "visitCount": 3,
        "timestamps": [1705315200000, 1705315202000, 1705315205000],
        "totalDurationMs": 1500
      }
    ],
    "regionFocuses": [
      {
        "regionId": "navigation",
        "regionLabel": "Top Navigation Bar",
        "x": 512,
        "y": 50,
        "width": 1024,
        "height": 100,
        "focusDurationMs": 500,
        "fixationCount": 3,
        "firstVisitTimestamp": 1705315200000,
        "lastVisitTimestamp": 1705315201000
      }
    ]
  }
}
```

#### Response

```json
{
  "success": true,
  "batchId": "batch-uuid"
}
```

### GET /api/metrics/batch/:batchId/eye-tracking
**Retrieve detailed eye tracking data for a specific batch**

#### Response

```json
{
  "success": true,
  "data": {
    "batchId": "batch-uuid",
    "userId": "user-uuid",
    "startedAt": "2024-01-15T10:00:00Z",
    "endedAt": "2024-01-15T10:00:10Z",
    "url": "https://example.com/article",
    "domain": "example.com",
    "gazeEvents": [...],
    "fixationEvents": [...],
    "saccadeEvents": [...],
    "readingPatterns": [...],
    "rereadingEvents": [...],
    "regionFocuses": [...]
  }
}
```

### GET /api/metrics/:userId/eye-tracking/analysis
**Get aggregated eye tracking analysis over a date range**

#### Query Parameters
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

#### Response

```json
{
  "success": true,
  "data": {
    "dateRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-15T23:59:59Z"
    },
    "totalBatches": 150,
    "fixations": {
      "total": 12500,
      "avgDurationMs": 245.3
    },
    "saccades": {
      "total": 8200,
      "avgVelocityPxPerSec": 420.5,
      "avgAmplitudePx": 115.2
    },
    "readingPatterns": {
      "total": 45,
      "directions": {
        "left-to-right": 40,
        "irregular": 5
      },
      "avgSpeedWordsPerMin": 245.6
    },
    "regionFocuses": [
      {
        "regionId": "content",
        "regionLabel": "Main Content",
        "totalFocusDurationMs": 45000,
        "totalFixations": 180,
        "occurrences": 50,
        "avgFocusDurationMs": 900,
        "avgFixationsPerOccurrence": 3.6
      }
    ],
    "rereadingEvents": [
      {
        "regionId": "top-paragraph",
        "totalVisits": 15,
        "totalDurationMs": 5000,
        "occurrences": 10,
        "avgVisitsPerOccurrence": 1.5,
        "avgDurationMsPerOccurrence": 500
      }
    ]
  }
}
```

## Database Migration

To apply the schema changes:

```bash
cd server
npx prisma migrate dev --name add_detailed_eye_tracking
npx prisma generate
```

## Benchmark Analysis Use Cases

### 1. Cognitive Decline Detection

**Indicators to monitor:**
- Increasing fixation durations (slower processing)
- Decreasing reading speed
- Increasing regression count (re-reading)
- More erratic saccade patterns
- Longer time spent on previously familiar regions

**Query example:**
```typescript
// Compare current vs baseline reading speed
const analysis = await fetch(
  `/api/metrics/${userId}/eye-tracking/analysis?startDate=${lastWeek}&endDate=${today}`
);
const baseline = await fetch(
  `/api/metrics/${userId}/baseline`
);
// Compare analysis.data.readingPatterns.avgSpeedWordsPerMin with baseline
```

### 2. Screen Region Heatmaps

Use `RegionFocus` data to generate attention heatmaps:

```typescript
const batch = await fetch(`/api/metrics/batch/${batchId}/eye-tracking`);
const regions = batch.data.regionFocuses;
// Render heatmap based on focusDurationMs per region
```

### 3. Re-reading Pattern Analysis

Detect confusion or memory issues:

```typescript
const analysis = await fetch(
  `/api/metrics/${userId}/eye-tracking/analysis?startDate=${startDate}&endDate=${endDate}`
);
const highRereadRegions = analysis.data.rereadingEvents
  .filter(event => event.avgVisitsPerOccurrence > 2.5)
  .sort((a, b) => b.avgVisitsPerOccurrence - a.avgVisitsPerOccurrence);
```

### 4. Fixation-Saccade Ratio

Calculate visual search efficiency:

```typescript
const analysis = await fetch(`/api/metrics/${userId}/eye-tracking/analysis`);
const ratio = analysis.data.fixations.total / analysis.data.saccades.total;
// Higher ratio = more focused attention
// Lower ratio = more exploratory behavior
```

## Data Storage Format

### JSON Fields
The following fields store JSON arrays:
- `MetricsBatch.keyboardHoldTimes`
- `MetricsBatch.keyboardDownDownIntervals`
- `MetricsBatch.keyboardUpDownIntervals`
- `RereadingEvent.timestamps`

These are stored as JSON strings and should be parsed when retrieved.

### BigInt Fields
Timestamp fields use `BigInt` for precision:
- `GazeEvent.timestamp`
- `FixationEvent.timestamp`
- `SaccadeEvent.timestamp`
- `ReadingPattern.timestamp`
- `RegionFocus.firstVisitTimestamp`
- `RegionFocus.lastVisitTimestamp`

## Performance Considerations

### Indexing
All eye tracking models are indexed by `batchId` for efficient querying.
Additional indexes:
- `RereadingEvent`: indexed by `regionId`
- `RegionFocus`: indexed by `regionId`

### Data Volume
With 10-second batches, expect:
- 50-200 fixations per batch
- 30-150 saccades per batch
- 1-5 reading patterns per batch
- 5-20 region focuses per batch
- 1-10 re-reading events per batch

**Daily storage estimate per user:**
- Active time: 8 hours = 28,800 seconds
- Batches: 2,880 batches
- Fixations: ~288,000 records
- Saccades: ~172,800 records

**Recommendation:** Implement data retention policy (e.g., keep detailed events for 30 days, aggregate older data).

## Example Client Implementation

```typescript
// Eye tracking data collector (client-side)
class EyeTrackingCollector {
  private fixations: FixationData[] = [];
  private saccades: SaccadeData[] = [];
  private readingPatterns: ReadingPatternData[] = [];
  private rereadingEvents: Map<string, RereadingEventData> = new Map();
  private regionFocuses: Map<string, RegionFocusData> = new Map();

  addFixation(x: number, y: number, duration: number) {
    const regionId = this.getRegionId(x, y);
    this.fixations.push({
      timestamp: Date.now(),
      x,
      y,
      durationMs: duration,
      regionId,
    });
    this.updateRegionFocus(regionId, x, y, duration);
  }

  addSaccade(fromX: number, fromY: number, toX: number, toY: number, duration: number) {
    const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
    const velocity = (distance / duration) * 1000; // px/sec

    this.saccades.push({
      timestamp: Date.now(),
      fromX,
      fromY,
      toX,
      toY,
      velocityPxPerSec: velocity,
      amplitudePx: distance,
      durationMs: duration,
    });
  }

  detectReadingPattern(fixations: FixationData[]) {
    // Analyze fixation sequence to detect reading direction
    // Calculate reading speed based on fixation count and time
    // Count regressions (backward saccades)
    // Return ReadingPatternData
  }

  async sendToServer() {
    const payload = {
      userId: this.userId,
      startedAt: this.batchStart.toISOString(),
      endedAt: new Date().toISOString(),
      // ... other metrics
      gaze: {
        gazeEventCount: this.gazePoints.length,
        fixations: this.fixations,
        saccades: this.saccades,
        readingPatterns: this.readingPatterns,
        rereadingEvents: Array.from(this.rereadingEvents.values()),
        regionFocuses: Array.from(this.regionFocuses.values()),
      },
    };

    await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}
```

## Testing

### Sample Test Data

```typescript
// Test fixation event storage
const testPayload = {
  userId: 'test-user-123',
  startedAt: new Date().toISOString(),
  endedAt: new Date(Date.now() + 10000).toISOString(),
  page: { url: 'https://test.com', domain: 'test.com' },
  keyboard: { /* minimal valid data */ },
  mouse: { /* minimal valid data */ },
  scroll: { /* minimal valid data */ },
  gaze: {
    gazeEventCount: 5,
    meanFixationDurationMs: 250,
    saccadeCount: 3,
    meanSaccadeLengthPx: 100,
    gazePoints: [
      { x: 100, y: 200, timestamp: Date.now() }
    ],
    fixations: [
      {
        timestamp: Date.now(),
        x: 100,
        y: 200,
        durationMs: 250,
        regionId: 'test-region'
      }
    ],
    saccades: [
      {
        timestamp: Date.now(),
        fromX: 100,
        fromY: 200,
        toX: 150,
        toY: 220,
        velocityPxPerSec: 450,
        amplitudePx: 53.85,
        durationMs: 35
      }
    ],
  }
};

const response = await fetch('http://localhost:3000/api/metrics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testPayload),
});

console.log(await response.json());
```

## Future Enhancements

1. **Pupil Diameter Tracking**: Add cognitive load measurement
2. **Blink Rate**: Monitor fatigue and stress
3. **Smooth Pursuit**: Track moving objects
4. **Attention Maps**: 2D spatial attention distribution
5. **Temporal Clustering**: Identify temporal patterns in eye movements
6. **Multi-screen Support**: Track gaze across multiple monitors
7. **Context-aware Regions**: Automatically label regions based on DOM elements

## References

- Fixation-Saccade Classification: I-VT, I-DT algorithms
- Reading Pattern Detection: E-Z Reader model
- Cognitive Load Assessment: Index of Cognitive Activity (ICA)
- Heatmap Generation: Kernel density estimation
