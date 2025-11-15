# Cognitive Tracker

A browser-based system for passive cognitive monitoring through multi-modal behavioral tracking.

## Overview

This system tracks user interactions (keyboard, mouse, eye movements) to detect possible early cognitive or memory decline by identifying deviations from each user's personal baseline. **No diagnosis is made** - the system only tracks changes from baseline and surfaces trends with gentle language.

## Architecture

The system integrates multiple open-source components:

- **[WebGazer.js](https://github.com/brownhci/WebGazer)** - Webcam-based eye tracking
- **[MediaPipe](https://github.com/google-ai-edge/mediapipe)** - Hand tracking, facial analysis, precise iris tracking
- **[MKLogger](https://github.com/kavehbc/MKLogger)** - Mouse/keyboard logging (adapted for privacy)
- **[keystroke-biometrics](https://github.com/njanakiev/keystroke-biometrics)** - Keystroke timing analysis approach

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## Key Features

### Multi-Modal Data Collection
- **Keystroke Dynamics**: Typing rhythm (H, DD, UD intervals), error rate, speed
- **Mouse Tracking**: Movement speed, precision, hesitation patterns
- **Eye Tracking**: Gaze patterns, fixation duration, saccades
- **Hand Tracking** (via MediaPipe): Tremor detection, fine motor control

### Privacy-Preserving
- No actual text content stored (only timing and key categories)
- No video uploaded (WebGazer runs client-side)
- Keys classified as: letter, number, backspace, enter, other
- Client-side processing with batched aggregation

### Baseline & Deviation Detection
- Establishes per-user baseline from first 2-4 weeks
- Detects deviations >2 standard deviations from baseline
- Multi-modal correlation scoring
- Gentle, non-diagnostic language

## Project Structure

```
.
├── WebGazer/              # Eye tracking (cloned repo)
├── mediapipe/             # Hand/face tracking (cloned repo)
├── MKLogger/              # Mouse/keyboard logger (cloned repo)
├── keystroke-biometrics/  # Timing analysis (cloned repo)
├── integration/           # Unified tracker module (TypeScript)
│   ├── src/
│   │   ├── unified-tracker.ts   # Main integration layer
│   │   ├── types.ts             # Type definitions
│   │   └── index.ts
│   └── package.json
├── server/                # Backend API (Node + Express + Postgres)
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   ├── src/
│   │   ├── index.ts             # Express server
│   │   ├── routes/
│   │   │   └── metrics.ts       # API endpoints
│   │   └── scripts/
│   │       ├── computeDailySummaries.ts    # Daily aggregation
│   │       ├── computeBaselines.ts         # Baseline establishment
│   │       └── detectDeviations.ts         # Anomaly detection
│   └── package.json
├── examples/
│   └── demo.html          # Demo page
└── ARCHITECTURE.md        # System design doc
```

## Setup Instructions

### Prerequisites
- Node.js v18+
- PostgreSQL database
- npm or yarn

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install integration layer dependencies
cd integration
npm install
cd ..

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Build WebGazer

```bash
cd WebGazer
npm install
npm run build
cd ..
```

### 3. Build Integration Layer

```bash
cd integration
npm run build
cd ..
```

### 4. Set Up Database

```bash
# Copy environment template
cd server
cp .env.example .env

# Edit .env and set your DATABASE_URL
# Example: DATABASE_URL="postgresql://user:password@localhost:5432/cognitive_tracker"

# Run migrations
npm run db:push
npm run db:generate
cd ..
```

### 5. Start the Backend

```bash
cd server
npm run dev
# Server runs on http://localhost:3000
```

### 6. Run the Demo

```bash
# Serve the demo (requires a local server)
cd examples
python3 -m http.server 8000
# Open http://localhost:8000/demo.html
```

## How It Works: Detection Logic

### Phase 1: Data Collection (Continuous)

Every 10 seconds, the browser sends batched metrics:

```typescript
{
  userId: "user123",
  startedAt: "2024-01-15T10:00:00Z",
  endedAt: "2024-01-15T10:00:10Z",
  keyboard: {
    keyPressCount: 45,
    backspaceCount: 3,
    meanInterKeyIntervalMs: 120,
    stdInterKeyIntervalMs: 45,
    holdTimes: [80, 75, 90, ...],      // H intervals
    downDownIntervals: [120, 115, ...], // DD intervals
    upDownIntervals: [40, 35, ...]      // UD intervals
  },
  mouse: {
    meanSpeedPxPerSec: 450,
    totalDistancePx: 2340,
    clickCount: 2
  },
  gaze: {
    meanFixationDurationMs: 250,
    saccadeCount: 8,
    gazePoints: [...]
  }
}
```

### Phase 2: Daily Summarization (Runs nightly)

```bash
npm run computeDailySummaries
```

Aggregates all batches for each user into a `DailySummary`:
- Average typing speed, error rate, timing variability
- Average mouse speed and precision
- Average gaze metrics

### Phase 3: Baseline Computation (After 2-4 weeks)

```bash
npm run computeBaselines --all
```

For each user, computes baseline averages from their first 2-4 weeks:
- Baseline typing speed: 3.2 keys/sec
- Baseline error rate: 5.1%
- Baseline inter-key variability: 42ms
- Etc.

### Phase 4: Deviation Detection (Daily)

```bash
npm run detectDeviations --all
```

**This is where problems are identified!**

For each day:
1. Compare current metrics to baseline
2. Compute standard deviations from baseline
3. Flag any metric >2σ from baseline
4. Calculate correlation score (% of metrics deviating)

Example deviation detection:

```
User: alice
Date: 2024-02-15

Deviations detected:
- Typing error rate: 12.3% (baseline: 5.1%, +3.2σ) ✓ FLAGGED
- Typing speed: 2.1 keys/sec (baseline: 3.2, -2.5σ) ✓ FLAGGED
- Keystroke timing variability: 68ms (baseline: 42ms, +2.8σ) ✓ FLAGGED
- Mouse speed: 380 px/sec (baseline: 450, -1.8σ) - within range
- Gaze fixation: 310ms (baseline: 250ms, +2.1σ) ✓ FLAGGED

Correlation score: 4/5 = 80%

Alert created: HIGH severity
Summary: "We noticed typing error rate increased by 7.2%, typing slowed down,
typing rhythm became less consistent, eye fixation duration became longer.
This may just be normal variation."
```

### Phase 5: Alert Retrieval

```bash
GET /api/metrics/:userId/alerts
```

Returns gentle alerts for the user or their care team.

## API Endpoints

### POST /api/metrics
Submit batch metrics from browser

### GET /api/metrics/:userId/summary?startDate=2024-01-01&endDate=2024-01-31
Get daily summaries

### GET /api/metrics/:userId/baseline
Get user's baseline

### GET /api/metrics/:userId/alerts?status=new
Get deviation alerts

## Cron Jobs (Production)

```cron
# Daily summary (runs at 1 AM)
0 1 * * * cd /path/to/server && npm run computeDailySummaries

# Baseline computation (weekly, runs Sundays at 2 AM)
0 2 * * 0 cd /path/to/server && npm run computeBaselines --all

# Deviation detection (runs at 3 AM)
0 3 * * * cd /path/to/server && npm run detectDeviations --all
```

## Metrics for Cognitive Decline Detection

### From Keystroke Dynamics
- ↑ Error rate (more backspaces)
- ↓ Typing speed
- ↑ Timing variability (less consistent rhythm)
- ↑ Hold times (slower key releases)

### From Mouse Movement
- ↓ Movement speed
- ↑ Movement variability (less smooth)
- ↓ Precision (larger target errors)

### From Eye Tracking
- ↑ Fixation duration (slower processing)
- ↓ Saccade speed
- ↑ Re-reading patterns
- ↓ Attention span

### Multi-Modal Correlation
**Critical:** Changes in ONE metric could be noise. Changes in MULTIPLE metrics (high correlation score) are more significant.

## Privacy Considerations

1. **No Content Storage**: Never store actual typed text, only timing/categories
2. **Client-Side Processing**: WebGazer processes video locally
3. **Aggregated Metrics**: Store pre-computed summaries, not raw events
4. **User Consent**: Require explicit consent before tracking
5. **Data Minimization**: Sample gaze points (every 10th) to reduce payload

## Future Enhancements

- [ ] Integrate MediaPipe hand tracking for tremor detection
- [ ] Add voice analysis (speech patterns, pauses)
- [ ] Build dashboard for visualizing trends
- [ ] Implement ML model for multi-variate anomaly detection
- [ ] Add notification system for care teams
- [ ] Support for mobile browsers

## References

- [WebGazer.js Paper](https://webgazer.cs.brown.edu)
- [Keystroke Dynamics Research](https://www.cs.cmu.edu/~keystroke/)
- [MediaPipe Documentation](https://developers.google.com/mediapipe)

## License

This integration layer is provided as-is. Individual components have their own licenses:
- WebGazer: GPL-3.0
- MediaPipe: Apache-2.0
- MKLogger: (see repo)
- keystroke-biometrics: MIT

## Support

For questions or issues, please open a GitHub issue.
