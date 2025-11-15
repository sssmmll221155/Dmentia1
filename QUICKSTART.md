# Quick Start Guide

Get the cognitive tracking system up and running in 10 minutes.

## Prerequisites

- Node.js v18+ installed
- PostgreSQL running locally or accessible
- Git

## Step-by-Step Setup

### 1. You Already Have the Repos!

All necessary repos are already cloned in your project:
- ✅ WebGazer (eye tracking)
- ✅ MediaPipe (hand/face tracking)
- ✅ MKLogger (mouse/keyboard)
- ✅ keystroke-biometrics (timing analysis)

### 2. Build WebGazer

```bash
cd WebGazer
npm install
npm run build
cd ..
```

Expected output: `dist/webgazer.js` created

### 3. Build the Integration Layer

```bash
cd integration
npm install
npm run build
cd ..
```

Expected output: `dist/unified-tracker.js` created

### 4. Set Up the Backend

```bash
cd server
npm install

# Create .env file
cp .env.example .env

# Edit .env and set your database URL
# For local Postgres:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/cognitive_tracker"
```

### 5. Initialize the Database

```bash
# Still in server/
npm run db:push
npm run db:generate
```

This creates all the tables:
- MetricsBatch
- GazeEvent
- DailySummary
- UserBaseline
- DeviationAlert

### 6. Start the Backend Server

```bash
npm run dev
```

You should see:
```
[Server] Cognitive Tracker API running on port 3000
```

### 7. Test the Demo

Open a new terminal:

```bash
cd examples

# Serve the demo page
python3 -m http.server 8000

# Or use any local server:
# npx serve .
# php -S localhost:8000
```

Open browser: `http://localhost:8000/demo.html`

Click "I Understand - Start Tracking" and grant webcam access.

### 8. Generate Some Data

In the demo:
- Type in the text area
- Move your mouse around
- Scroll through the article
- Click on things

Watch the "Live Metrics" panel update.

Every 10 seconds, a batch is sent to `http://localhost:3000/api/metrics`

### 9. Check Data Was Stored

```bash
# In server/ directory
npm run db:studio
```

Opens Prisma Studio at `http://localhost:5555`

Browse the `MetricsBatch` table - you should see your batches!

### 10. Compute Daily Summary

```bash
# Still in server/
npm run computeDailySummaries

# Check the DailySummary table in Prisma Studio
```

### 11. (After 2+ weeks of data) Compute Baseline

```bash
npm run computeBaselines --all

# Check the UserBaseline table
```

### 12. Detect Deviations

```bash
npm run detectDeviations --all

# Check the DeviationAlert table
```

## Testing the Detection Logic

To test detection without waiting weeks:

### Create Fake Historical Data

```sql
-- Connect to your database and run:

-- Insert some "normal" daily summaries for a test user
INSERT INTO "DailySummary" (
  id, "userId", date, "totalActiveSeconds", "totalBatches",
  "avgKeyboardKeyPressRate", "avgKeyboardErrorRate",
  "avgKeyboardInterKeyIntervalMs", "keyboardInterKeyVariabilityMs",
  "avgKeyboardHoldTimeMs", "stdKeyboardHoldTimeMs",
  "avgMouseSpeedPxPerSec", "stdMouseSpeedPxPerSec",
  "avgMouseDistancePerBatch", "avgScrollSpeed", "scrollUpScrollFraction",
  "avgGazeFixationDurationMs", "avgGazeSaccadeCount", "avgGazeSaccadeLengthPx"
) VALUES
  -- Day 1-14: Normal baseline period
  (gen_random_uuid(), 'test-user', '2024-01-01', 3600, 360, 3.2, 0.05, 120, 42, 85, 15, 450, 80, 2400, 150, 0.2, 250, 12, 180),
  (gen_random_uuid(), 'test-user', '2024-01-02', 3600, 360, 3.1, 0.05, 118, 40, 87, 16, 455, 82, 2380, 148, 0.2, 245, 13, 175),
  (gen_random_uuid(), 'test-user', '2024-01-03', 3600, 360, 3.3, 0.04, 122, 43, 83, 14, 448, 79, 2420, 152, 0.2, 255, 11, 185),
  -- ... add more days ...
  (gen_random_uuid(), 'test-user', '2024-01-14', 3600, 360, 3.2, 0.05, 120, 42, 85, 15, 450, 80, 2400, 150, 0.2, 250, 12, 180),

  -- Day 15: Abnormal day (simulating cognitive change)
  (gen_random_uuid(), 'test-user', '2024-01-15', 3600, 360, 2.1, 0.12, 180, 68, 110, 25, 380, 120, 1800, 180, 0.3, 310, 18, 220);
```

### Run Detection

```bash
# Compute baseline from days 1-14
npm run computeBaselines -- --userId=test-user --weeks=2

# Detect deviations on day 15
npm run detectDeviations -- --userId=test-user --date=2024-01-15
```

Expected output:
```
[Deviations] Checking user test-user for 2024-01-15
[Deviations] User test-user: 4/5 metrics deviated (correlation: 80.0%)
[Deviations] Created high alert for user test-user on 2024-01-15
  Summary: We noticed typing error rate increased by 7.0%, typing slowed down,
  typing rhythm became less consistent, eye fixation duration became longer.
  This may just be normal variation.
```

## API Testing

### Send a test batch:

```bash
curl -X POST http://localhost:3000/api/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "startedAt": "2024-01-15T10:00:00Z",
    "endedAt": "2024-01-15T10:00:10Z",
    "keyboard": {
      "keyPressCount": 45,
      "backspaceCount": 3,
      "enterCount": 1,
      "meanInterKeyIntervalMs": 120,
      "stdInterKeyIntervalMs": 45,
      "holdTimes": [80, 75, 90, 85, 78],
      "downDownIntervals": [120, 115, 125, 118],
      "upDownIntervals": [40, 35, 42, 38]
    },
    "mouse": {
      "moveEventCount": 50,
      "meanSpeedPxPerSec": 450,
      "stdSpeedPxPerSec": 80,
      "totalDistancePx": 2340,
      "clickCount": 2,
      "dblclickCount": 0
    },
    "scroll": {
      "scrollEventCount": 5,
      "meanScrollSpeed": 150,
      "upScrollFraction": 0.2
    },
    "gaze": {
      "gazeEventCount": 100,
      "meanFixationDurationMs": 250,
      "saccadeCount": 8,
      "meanSaccadeLengthPx": 180,
      "gazePoints": [
        {"x": 500, "y": 300, "timestamp": 1705315200000}
      ]
    },
    "page": {
      "url": "http://localhost:8000/demo.html",
      "domain": "localhost"
    }
  }'
```

### Get summaries:

```bash
curl http://localhost:3000/api/metrics/test-user/summary
```

### Get baseline:

```bash
curl http://localhost:3000/api/metrics/test-user/baseline
```

### Get alerts:

```bash
curl http://localhost:3000/api/metrics/test-user/alerts
```

## Next Steps

1. **Customize the tracker** - Edit `integration/src/unified-tracker.ts` to add MediaPipe hand tracking
2. **Build a dashboard** - Create a React/Vue app that visualizes the trends
3. **Deploy** - Set up on a production server with proper database
4. **Set up cron jobs** - Automate the daily summary and detection scripts

## Troubleshooting

### WebGazer not loading
- Check that `WebGazer/dist/webgazer.js` exists
- Ensure you're serving from a local server (not `file://`)
- Check browser console for errors

### Database connection error
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Try: `psql $DATABASE_URL` to test connection

### TypeScript errors
- Run `npm run build` in both `integration/` and `server/`
- Check Node version: `node --version` (should be v18+)

### No data in database
- Check browser console for API errors
- Check server logs: `cd server && npm run dev`
- Verify backend is running on port 3000

## Questions?

See:
- [README.md](./README.md) - Full documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [HOW_DETECTION_WORKS.md](./HOW_DETECTION_WORKS.md) - Detection logic explained

Or open an issue on GitHub!
