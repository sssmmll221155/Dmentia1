# Database Migration Guide for Eye Tracking Enhancement

## Overview

This guide walks you through updating the database schema to support detailed eye tracking metrics.

## Prerequisites

- Existing Cognitive Tracker database
- Prisma CLI installed
- Node.js environment set up

## Migration Steps

### Step 1: Backup Current Database

```bash
# Navigate to server directory
cd server

# Create backup of current database
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2: Review Schema Changes

The new schema adds 5 new models:
- `FixationEvent` - Gaze fixation data
- `SaccadeEvent` - Eye movement transitions
- `ReadingPattern` - Reading behavior metrics
- `RereadingEvent` - Region revisit tracking
- `RegionFocus` - Screen region attention data

All new models have foreign key relationships to `MetricsBatch` and will cascade delete when batches are removed.

### Step 3: Generate Migration

```bash
# Generate Prisma migration
npx prisma migrate dev --name add_detailed_eye_tracking

# This will:
# 1. Create new tables: FixationEvent, SaccadeEvent, ReadingPattern, RereadingEvent, RegionFocus
# 2. Add indexes for efficient querying
# 3. Update Prisma Client
```

### Step 4: Verify Migration

```bash
# Check migration status
npx prisma migrate status

# View database schema
npx prisma studio
```

### Step 5: Regenerate Prisma Client

```bash
# Generate updated Prisma Client with new types
npx prisma generate
```

### Step 6: Install Dependencies (if needed)

```bash
# Ensure all dependencies are installed
npm install
```

### Step 7: Restart Backend Server

```bash
# Stop the current server (Ctrl+C)
# Start with updated schema
npm run dev
```

## Testing the Migration

### 1. Verify API Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### 2. Test Eye Tracking Endpoint

```bash
curl -X POST http://localhost:3000/api/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "startedAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "endedAt": "'$(date -u -v+10S +%Y-%m-%dT%H:%M:%S.000Z)'",
    "page": {
      "url": "https://example.com",
      "domain": "example.com"
    },
    "keyboard": {
      "keyPressCount": 10,
      "backspaceCount": 1,
      "enterCount": 0,
      "meanInterKeyIntervalMs": 150,
      "stdInterKeyIntervalMs": 50,
      "holdTimes": [100, 120, 110],
      "downDownIntervals": [150, 160, 155],
      "upDownIntervals": [50, 55, 52]
    },
    "mouse": {
      "moveEventCount": 50,
      "meanSpeedPxPerSec": 200,
      "stdSpeedPxPerSec": 50,
      "totalDistancePx": 1000,
      "clickCount": 2,
      "dblclickCount": 0
    },
    "scroll": {
      "scrollEventCount": 5,
      "meanScrollSpeed": 100,
      "upScrollFraction": 0.2
    },
    "gaze": {
      "gazeEventCount": 100,
      "meanFixationDurationMs": 250,
      "saccadeCount": 30,
      "meanSaccadeLengthPx": 120,
      "gazePoints": [
        { "x": 100, "y": 200, "timestamp": '$(date +%s000)' }
      ],
      "fixations": [
        {
          "timestamp": '$(date +%s000)',
          "x": 100,
          "y": 200,
          "durationMs": 250,
          "regionId": "content"
        }
      ],
      "saccades": [
        {
          "timestamp": '$(date +%s000)',
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
          "timestamp": '$(date +%s000)',
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
          "timestamps": ['$(date +%s000)', '$(date -v+2S +%s000)', '$(date -v+5S +%s000)'],
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
          "firstVisitTimestamp": '$(date +%s000)',
          "lastVisitTimestamp": '$(date -v+1S +%s000)'
        }
      ]
    }
  }'
```

### 3. Verify Data Storage

```bash
# Open Prisma Studio to inspect data
npx prisma studio
```

Navigate to:
- `MetricsBatch` - Should see your test batch
- `FixationEvent` - Should see fixation records linked to batch
- `SaccadeEvent` - Should see saccade records
- `ReadingPattern` - Should see reading pattern records
- `RereadingEvent` - Should see re-reading records
- `RegionFocus` - Should see region focus records

### 4. Test Retrieval Endpoints

```bash
# Replace {batchId} with actual ID from previous test
curl http://localhost:3000/api/metrics/batch/{batchId}/eye-tracking

# Test analysis endpoint
curl "http://localhost:3000/api/metrics/test-user-123/eye-tracking/analysis?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z"
```

## Rollback Procedure (if needed)

If you encounter issues and need to rollback:

```bash
# Stop the server
# Restore backup
cp prisma/dev.db.backup.[timestamp] prisma/dev.db

# Revert schema changes (restore from git)
git checkout server/prisma/schema.prisma
git checkout server/src/routes/metrics.ts

# Regenerate Prisma Client
npx prisma generate

# Restart server
npm run dev
```

## Database Schema Diagram

```
MetricsBatch (existing)
    ├── GazeEvent (existing)
    ├── FixationEvent (NEW)
    ├── SaccadeEvent (NEW)
    ├── ReadingPattern (NEW)
    ├── RereadingEvent (NEW)
    └── RegionFocus (NEW)
```

## Breaking Changes

### None

This is a backward-compatible migration:
- All new fields are optional or have default values
- Existing API endpoints continue to work
- New eye tracking fields in POST /api/metrics are optional
- Old clients can continue sending data without new fields

## Performance Impact

### Database Size
- Expect 2-5x increase in database size with detailed eye tracking
- Consider implementing data retention policy

### Query Performance
- All new tables are indexed by `batchId`
- Additional indexes on `regionId` for fast region-based queries
- Cascade deletes ensure referential integrity

### API Response Time
- POST /api/metrics: +5-10ms (additional inserts)
- GET batch eye-tracking: 50-100ms (depending on data volume)
- GET analysis: 200-500ms (aggregate queries over date range)

## Monitoring

After migration, monitor:

1. **Database Size**
   ```bash
   ls -lh prisma/dev.db
   ```

2. **API Response Times**
   - Check server logs for slow queries
   - Monitor POST /api/metrics endpoint

3. **Error Rates**
   - Watch for validation errors
   - Check Prisma query errors

## Production Deployment Checklist

- [ ] Test migration in development environment
- [ ] Backup production database
- [ ] Schedule maintenance window
- [ ] Run migration with `--create-only` to review SQL
- [ ] Apply migration: `npx prisma migrate deploy`
- [ ] Verify data integrity
- [ ] Monitor error rates and performance
- [ ] Update API documentation
- [ ] Notify client application developers

## Support

If you encounter issues:

1. Check Prisma migration logs: `npx prisma migrate status`
2. Review server logs for errors
3. Verify schema.prisma syntax: `npx prisma validate`
4. Check database constraints: `npx prisma db pull`

## Next Steps

After successful migration:

1. Update client-side eye tracking implementation
2. Implement data retention policy
3. Set up monitoring dashboards
4. Create benchmark analysis reports
5. Train ML models on new eye tracking features

## Additional Resources

- [Prisma Migration Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Eye Tracking Implementation Guide](./EYE_TRACKING_IMPLEMENTATION.md)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
