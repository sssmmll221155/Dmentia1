/**
 * Metrics API Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';

const router = Router();

// Validation schema for batch metrics
const BatchMetricsSchema = z.object({
  userId: z.string().min(1),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),

  keyboard: z.object({
    keyPressCount: z.number().int().min(0),
    backspaceCount: z.number().int().min(0),
    enterCount: z.number().int().min(0),
    meanInterKeyIntervalMs: z.number().min(0),
    stdInterKeyIntervalMs: z.number().min(0),
    holdTimes: z.array(z.number()),
    downDownIntervals: z.array(z.number()),
    upDownIntervals: z.array(z.number()),
  }),

  mouse: z.object({
    moveEventCount: z.number().int().min(0),
    meanSpeedPxPerSec: z.number().min(0),
    stdSpeedPxPerSec: z.number().min(0),
    totalDistancePx: z.number().min(0),
    clickCount: z.number().int().min(0),
    dblclickCount: z.number().int().min(0),
  }),

  scroll: z.object({
    scrollEventCount: z.number().int().min(0),
    meanScrollSpeed: z.number().min(0),
    upScrollFraction: z.number().min(0).max(1),
  }),

  gaze: z
    .object({
      gazeEventCount: z.number().int().min(0),
      meanFixationDurationMs: z.number().min(0),
      saccadeCount: z.number().int().min(0),
      meanSaccadeLengthPx: z.number().min(0),
      gazePoints: z.array(
        z.object({
          x: z.number(),
          y: z.number(),
          timestamp: z.number(),
        })
      ),
      // Detailed eye tracking metrics
      fixations: z.array(
        z.object({
          timestamp: z.number(),
          x: z.number(),
          y: z.number(),
          durationMs: z.number(),
          regionId: z.string().optional(),
        })
      ).optional(),
      saccades: z.array(
        z.object({
          timestamp: z.number(),
          fromX: z.number(),
          fromY: z.number(),
          toX: z.number(),
          toY: z.number(),
          velocityPxPerSec: z.number(),
          amplitudePx: z.number(),
          durationMs: z.number(),
        })
      ).optional(),
      readingPatterns: z.array(
        z.object({
          timestamp: z.number(),
          direction: z.enum(['left-to-right', 'right-to-left', 'top-to-bottom', 'irregular']),
          speedWordsPerMin: z.number().optional(),
          lineCount: z.number().int(),
          regressionCount: z.number().int(),
        })
      ).optional(),
      rereadingEvents: z.array(
        z.object({
          regionId: z.string(),
          visitCount: z.number().int(),
          timestamps: z.array(z.number()),
          totalDurationMs: z.number(),
        })
      ).optional(),
      regionFocuses: z.array(
        z.object({
          regionId: z.string(),
          regionLabel: z.string().optional(),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          focusDurationMs: z.number(),
          fixationCount: z.number().int(),
          firstVisitTimestamp: z.number(),
          lastVisitTimestamp: z.number(),
        })
      ).optional(),
    })
    .nullable(),

  page: z.object({
    url: z.string(),
    domain: z.string(),
  }),
});

/**
 * POST /api/metrics
 * Receive and store batch metrics from client
 */
router.post('/', async (req, res) => {
  try {
    // Validate payload
    const data = BatchMetricsSchema.parse(req.body);

    // Create metrics batch record
    const batch = await prisma.metricsBatch.create({
      data: {
        userId: data.userId,
        startedAt: new Date(data.startedAt),
        endedAt: new Date(data.endedAt),

        // Page context
        url: data.page.url,
        domain: data.page.domain,

        // Keyboard metrics
        keyboardKeyPressCount: data.keyboard.keyPressCount,
        keyboardBackspaceCount: data.keyboard.backspaceCount,
        keyboardEnterCount: data.keyboard.enterCount,
        keyboardMeanInterKeyIntervalMs: data.keyboard.meanInterKeyIntervalMs,
        keyboardStdInterKeyIntervalMs: data.keyboard.stdInterKeyIntervalMs,
        keyboardHoldTimes: JSON.stringify(data.keyboard.holdTimes),
        keyboardDownDownIntervals: JSON.stringify(data.keyboard.downDownIntervals),
        keyboardUpDownIntervals: JSON.stringify(data.keyboard.upDownIntervals),

        // Mouse metrics
        mouseMoveEventCount: data.mouse.moveEventCount,
        mouseMeanSpeedPxPerSec: data.mouse.meanSpeedPxPerSec,
        mouseStdSpeedPxPerSec: data.mouse.stdSpeedPxPerSec,
        mouseTotalDistancePx: data.mouse.totalDistancePx,
        mouseClickCount: data.mouse.clickCount,
        mouseDblclickCount: data.mouse.dblclickCount,

        // Scroll metrics
        scrollEventCount: data.scroll.scrollEventCount,
        scrollMeanScrollSpeed: data.scroll.meanScrollSpeed,
        scrollUpScrollFraction: data.scroll.upScrollFraction,

        // Gaze metrics (nullable)
        gazeEventCount: data.gaze?.gazeEventCount ?? null,
        gazeMeanFixationDurationMs: data.gaze?.meanFixationDurationMs ?? null,
        gazeSaccadeCount: data.gaze?.saccadeCount ?? null,
        gazeMeanSaccadeLengthPx: data.gaze?.meanSaccadeLengthPx ?? null,

        // Create gaze events if provided
        gazeEvents: data.gaze
          ? {
              create: data.gaze.gazePoints.map((point) => ({
                timestamp: BigInt(point.timestamp),
                x: point.x,
                y: point.y,
              })),
            }
          : undefined,

        // Create fixation events if provided
        fixationEvents: data.gaze?.fixations
          ? {
              create: data.gaze.fixations.map((fixation) => ({
                timestamp: BigInt(fixation.timestamp),
                x: fixation.x,
                y: fixation.y,
                durationMs: fixation.durationMs,
                regionId: fixation.regionId,
              })),
            }
          : undefined,

        // Create saccade events if provided
        saccadeEvents: data.gaze?.saccades
          ? {
              create: data.gaze.saccades.map((saccade) => ({
                timestamp: BigInt(saccade.timestamp),
                fromX: saccade.fromX,
                fromY: saccade.fromY,
                toX: saccade.toX,
                toY: saccade.toY,
                velocityPxPerSec: saccade.velocityPxPerSec,
                amplitudePx: saccade.amplitudePx,
                durationMs: saccade.durationMs,
              })),
            }
          : undefined,

        // Create reading patterns if provided
        readingPatterns: data.gaze?.readingPatterns
          ? {
              create: data.gaze.readingPatterns.map((pattern) => ({
                timestamp: BigInt(pattern.timestamp),
                direction: pattern.direction,
                speedWordsPerMin: pattern.speedWordsPerMin,
                lineCount: pattern.lineCount,
                regressionCount: pattern.regressionCount,
              })),
            }
          : undefined,

        // Create re-reading events if provided
        rereadingEvents: data.gaze?.rereadingEvents
          ? {
              create: data.gaze.rereadingEvents.map((event) => ({
                regionId: event.regionId,
                visitCount: event.visitCount,
                timestamps: JSON.stringify(event.timestamps),
                totalDurationMs: event.totalDurationMs,
              })),
            }
          : undefined,

        // Create region focus data if provided
        regionFocuses: data.gaze?.regionFocuses
          ? {
              create: data.gaze.regionFocuses.map((focus) => ({
                regionId: focus.regionId,
                regionLabel: focus.regionLabel,
                x: focus.x,
                y: focus.y,
                width: focus.width,
                height: focus.height,
                focusDurationMs: focus.focusDurationMs,
                fixationCount: focus.fixationCount,
                firstVisitTimestamp: BigInt(focus.firstVisitTimestamp),
                lastVisitTimestamp: BigInt(focus.lastVisitTimestamp),
              })),
            }
          : undefined,
      },
    });

    res.status(201).json({
      success: true,
      batchId: batch.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    } else {
      console.error('[API] Error storing metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
});

/**
 * GET /api/metrics/:userId/summary
 * Get daily summaries for a user
 */
router.get('/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, limit } = req.query;

    const summaries = await prisma.dailySummary.findMany({
      where: {
        userId,
        ...(startDate &&
          endDate && {
            date: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string),
            },
          }),
      },
      orderBy: { date: 'desc' },
      take: limit ? parseInt(limit as string) : 30,
    });

    res.json({
      success: true,
      summaries,
    });
  } catch (error) {
    console.error('[API] Error fetching summaries:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/metrics/:userId/baseline
 * Get user baseline
 */
router.get('/:userId/baseline', async (req, res) => {
  try {
    const { userId } = req.params;

    const baseline = await prisma.userBaseline.findUnique({
      where: { userId },
    });

    if (!baseline) {
      return res.status(404).json({
        success: false,
        error: 'Baseline not computed yet',
      });
    }

    res.json({
      success: true,
      baseline,
    });
  } catch (error) {
    console.error('[API] Error fetching baseline:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/metrics/:userId/alerts
 * Get deviation alerts for a user
 */
router.get('/:userId/alerts', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const alerts = await prisma.deviationAlert.findMany({
      where: {
        userId,
        ...(status && { status: status as string }),
      },
      orderBy: { date: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      alerts,
    });
  } catch (error) {
    console.error('[API] Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/metrics/batch/:batchId/eye-tracking
 * Get detailed eye tracking data for a specific batch
 */
router.get('/batch/:batchId/eye-tracking', async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await prisma.metricsBatch.findUnique({
      where: { id: batchId },
      include: {
        gazeEvents: true,
        fixationEvents: true,
        saccadeEvents: true,
        readingPatterns: true,
        rereadingEvents: true,
        regionFocuses: true,
      },
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }

    // Parse JSON fields in re-reading events
    const rereadingEvents = batch.rereadingEvents.map((event) => ({
      ...event,
      timestamps: JSON.parse(event.timestamps),
    }));

    res.json({
      success: true,
      data: {
        batchId: batch.id,
        userId: batch.userId,
        startedAt: batch.startedAt,
        endedAt: batch.endedAt,
        url: batch.url,
        domain: batch.domain,
        gazeEvents: batch.gazeEvents,
        fixationEvents: batch.fixationEvents,
        saccadeEvents: batch.saccadeEvents,
        readingPatterns: batch.readingPatterns,
        rereadingEvents,
        regionFocuses: batch.regionFocuses,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching eye tracking data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/metrics/:userId/eye-tracking/analysis
 * Get aggregated eye tracking analysis for a user over a date range
 */
router.get('/:userId/eye-tracking/analysis', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const batches = await prisma.metricsBatch.findMany({
      where: {
        userId,
        ...(startDate &&
          endDate && {
            startedAt: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string),
            },
          }),
      },
      include: {
        fixationEvents: true,
        saccadeEvents: true,
        readingPatterns: true,
        rereadingEvents: true,
        regionFocuses: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    // Aggregate statistics
    const totalFixations = batches.reduce(
      (sum, batch) => sum + batch.fixationEvents.length,
      0
    );
    const totalSaccades = batches.reduce(
      (sum, batch) => sum + batch.saccadeEvents.length,
      0
    );
    const totalReadingPatterns = batches.reduce(
      (sum, batch) => sum + batch.readingPatterns.length,
      0
    );

    // Calculate average fixation duration
    const allFixations = batches.flatMap((batch) => batch.fixationEvents);
    const avgFixationDuration =
      allFixations.length > 0
        ? allFixations.reduce((sum, f) => sum + f.durationMs, 0) /
          allFixations.length
        : 0;

    // Calculate average saccade velocity and amplitude
    const allSaccades = batches.flatMap((batch) => batch.saccadeEvents);
    const avgSaccadeVelocity =
      allSaccades.length > 0
        ? allSaccades.reduce((sum, s) => sum + s.velocityPxPerSec, 0) /
          allSaccades.length
        : 0;
    const avgSaccadeAmplitude =
      allSaccades.length > 0
        ? allSaccades.reduce((sum, s) => sum + s.amplitudePx, 0) /
          allSaccades.length
        : 0;

    // Reading pattern analysis
    const allReadingPatterns = batches.flatMap((batch) => batch.readingPatterns);
    const readingDirections = allReadingPatterns.reduce(
      (acc, pattern) => {
        acc[pattern.direction] = (acc[pattern.direction] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const avgReadingSpeed =
      allReadingPatterns.filter((p) => p.speedWordsPerMin !== null).length > 0
        ? allReadingPatterns
            .filter((p) => p.speedWordsPerMin !== null)
            .reduce((sum, p) => sum + (p.speedWordsPerMin || 0), 0) /
          allReadingPatterns.filter((p) => p.speedWordsPerMin !== null).length
        : 0;

    // Region focus analysis
    const allRegionFocuses = batches.flatMap((batch) => batch.regionFocuses);
    const regionStats = allRegionFocuses.reduce(
      (acc, focus) => {
        if (!acc[focus.regionId]) {
          acc[focus.regionId] = {
            regionId: focus.regionId,
            regionLabel: focus.regionLabel,
            totalFocusDurationMs: 0,
            totalFixations: 0,
            occurrences: 0,
          };
        }
        acc[focus.regionId].totalFocusDurationMs += focus.focusDurationMs;
        acc[focus.regionId].totalFixations += focus.fixationCount;
        acc[focus.regionId].occurrences += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          regionId: string;
          regionLabel: string | null;
          totalFocusDurationMs: number;
          totalFixations: number;
          occurrences: number;
        }
      >
    );

    // Re-reading analysis
    const allRereadingEvents = batches.flatMap((batch) => batch.rereadingEvents);
    const rereadingStats = allRereadingEvents.reduce(
      (acc, event) => {
        if (!acc[event.regionId]) {
          acc[event.regionId] = {
            regionId: event.regionId,
            totalVisits: 0,
            totalDurationMs: 0,
            occurrences: 0,
          };
        }
        acc[event.regionId].totalVisits += event.visitCount;
        acc[event.regionId].totalDurationMs += event.totalDurationMs;
        acc[event.regionId].occurrences += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          regionId: string;
          totalVisits: number;
          totalDurationMs: number;
          occurrences: number;
        }
      >
    );

    res.json({
      success: true,
      data: {
        dateRange: {
          start: startDate || batches[0]?.startedAt,
          end: endDate || batches[batches.length - 1]?.endedAt,
        },
        totalBatches: batches.length,
        fixations: {
          total: totalFixations,
          avgDurationMs: avgFixationDuration,
        },
        saccades: {
          total: totalSaccades,
          avgVelocityPxPerSec: avgSaccadeVelocity,
          avgAmplitudePx: avgSaccadeAmplitude,
        },
        readingPatterns: {
          total: totalReadingPatterns,
          directions: readingDirections,
          avgSpeedWordsPerMin: avgReadingSpeed,
        },
        regionFocuses: Object.values(regionStats).map((stat) => ({
          ...stat,
          avgFocusDurationMs: stat.totalFocusDurationMs / stat.occurrences,
          avgFixationsPerOccurrence: stat.totalFixations / stat.occurrences,
        })),
        rereadingEvents: Object.values(rereadingStats).map((stat) => ({
          ...stat,
          avgVisitsPerOccurrence: stat.totalVisits / stat.occurrences,
          avgDurationMsPerOccurrence: stat.totalDurationMs / stat.occurrences,
        })),
      },
    });
  } catch (error) {
    console.error('[API] Error analyzing eye tracking data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
