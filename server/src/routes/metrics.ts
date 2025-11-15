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

export default router;
