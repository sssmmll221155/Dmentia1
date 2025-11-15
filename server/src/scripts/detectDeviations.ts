/**
 * Detect Deviations from Baseline
 *
 * This script identifies when a user's behavior deviates significantly from their baseline.
 * It looks for consistent changes across multiple modalities (keyboard, mouse, gaze)
 * to identify potential cognitive changes.
 *
 * Detection approach:
 * 1. Compare current metrics to baseline
 * 2. Compute standard deviations from baseline
 * 3. Flag metrics that are >2 std devs from baseline
 * 4. Calculate correlation score (how many metrics show deviation)
 * 5. Create alerts for high correlation scores
 *
 * Usage:
 *   npm run detectDeviations -- --userId=user123 --date=2024-01-15
 *   npm run detectDeviations --all  (check all users for yesterday)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Deviation thresholds
const DEVIATION_THRESHOLD_STD_DEVS = 2.0; // Flag if >2 standard deviations from baseline
const HIGH_CORRELATION_THRESHOLD = 0.5; // Alert if >50% of metrics deviate
const MIN_CORRELATION_FOR_ALERT = 0.3; // Minimum to create any alert

interface DetectionConfig {
  userId?: string;
  all?: boolean;
  date?: Date;
}

function parseArgs(): DetectionConfig {
  const args = process.argv.slice(2);
  const config: DetectionConfig = {};

  for (const arg of args) {
    if (arg.startsWith('--userId=')) {
      config.userId = arg.split('=')[1];
    } else if (arg === '--all') {
      config.all = true;
    } else if (arg.startsWith('--date=')) {
      config.date = new Date(arg.split('=')[1]);
    }
  }

  // Default to yesterday
  if (!config.date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    config.date = yesterday;
  }

  return config;
}

async function detectDeviations(config: DetectionConfig) {
  console.log(
    `[Deviations] Detecting deviations for ${config.date!.toISOString().split('T')[0]}`
  );

  if (config.all) {
    // Check all users with data on this date
    const summaries = await prisma.dailySummary.findMany({
      where: { date: config.date },
      select: { userId: true },
      distinct: ['userId'],
    });

    console.log(`[Deviations] Found ${summaries.length} users with activity`);

    for (const { userId } of summaries) {
      await detectUserDeviations(userId, config.date!);
    }
  } else if (config.userId) {
    await detectUserDeviations(config.userId, config.date!);
  } else {
    console.error('[Deviations] Error: Must specify --userId=<id> or --all');
    process.exit(1);
  }

  console.log('[Deviations] Done');
}

async function detectUserDeviations(userId: string, date: Date) {
  console.log(`[Deviations] Checking user ${userId} for ${date.toISOString().split('T')[0]}`);

  // Get user baseline
  const baseline = await prisma.userBaseline.findUnique({
    where: { userId },
  });

  if (!baseline) {
    console.log(`[Deviations] No baseline found for user ${userId} - skipping`);
    return;
  }

  // Get daily summary for this date
  const summary = await prisma.dailySummary.findUnique({
    where: {
      userId_date: { userId, date },
    },
  });

  if (!summary) {
    console.log(
      `[Deviations] No summary found for user ${userId} on ${date.toISOString().split('T')[0]}`
    );
    return;
  }

  // Get historical summaries to compute standard deviations
  const historicalSummaries = await prisma.dailySummary.findMany({
    where: {
      userId,
      date: {
        gte: baseline.baselineStartDate,
        lt: baseline.baselineEndDate,
      },
    },
  });

  if (historicalSummaries.length < 7) {
    console.log(`[Deviations] Insufficient historical data for user ${userId}`);
    return;
  }

  // Compute deviations for each metric
  const deviations: Record<
    string,
    { baseline: number; current: number; stdDevs: number; stdDev: number }
  > = {};

  // Keyboard Error Rate (critical indicator)
  const errorRateStdDev = computeStdDev(
    historicalSummaries.map((s) => s.avgKeyboardErrorRate)
  );
  if (errorRateStdDev > 0) {
    const stdDevsFromBaseline =
      Math.abs(summary.avgKeyboardErrorRate - baseline.baselineErrorRate) / errorRateStdDev;

    if (stdDevsFromBaseline > DEVIATION_THRESHOLD_STD_DEVS) {
      deviations.keyboardErrorRate = {
        baseline: baseline.baselineErrorRate,
        current: summary.avgKeyboardErrorRate,
        stdDevs: stdDevsFromBaseline,
        stdDev: errorRateStdDev,
      };
    }
  }

  // Typing Speed
  const typingSpeedStdDev = computeStdDev(
    historicalSummaries.map((s) => s.avgKeyboardKeyPressRate)
  );
  if (typingSpeedStdDev > 0) {
    const stdDevsFromBaseline =
      Math.abs(summary.avgKeyboardKeyPressRate - baseline.baselineKeyPressRate) /
      typingSpeedStdDev;

    if (stdDevsFromBaseline > DEVIATION_THRESHOLD_STD_DEVS) {
      deviations.typingSpeed = {
        baseline: baseline.baselineKeyPressRate,
        current: summary.avgKeyboardKeyPressRate,
        stdDevs: stdDevsFromBaseline,
        stdDev: typingSpeedStdDev,
      };
    }
  }

  // Inter-key Timing Variability (rhythm consistency)
  const timingVariabilityStdDev = computeStdDev(
    historicalSummaries.map((s) => s.keyboardInterKeyVariabilityMs)
  );
  if (timingVariabilityStdDev > 0) {
    const stdDevsFromBaseline =
      Math.abs(
        summary.keyboardInterKeyVariabilityMs - baseline.baselineInterKeyVariabilityMs
      ) / timingVariabilityStdDev;

    if (stdDevsFromBaseline > DEVIATION_THRESHOLD_STD_DEVS) {
      deviations.keystrokeTiming = {
        baseline: baseline.baselineInterKeyVariabilityMs,
        current: summary.keyboardInterKeyVariabilityMs,
        stdDevs: stdDevsFromBaseline,
        stdDev: timingVariabilityStdDev,
      };
    }
  }

  // Mouse Speed
  const mouseSpeedStdDev = computeStdDev(
    historicalSummaries.map((s) => s.avgMouseSpeedPxPerSec)
  );
  if (mouseSpeedStdDev > 0) {
    const stdDevsFromBaseline =
      Math.abs(summary.avgMouseSpeedPxPerSec - baseline.baselineMouseSpeed) / mouseSpeedStdDev;

    if (stdDevsFromBaseline > DEVIATION_THRESHOLD_STD_DEVS) {
      deviations.mouseSpeed = {
        baseline: baseline.baselineMouseSpeed,
        current: summary.avgMouseSpeedPxPerSec,
        stdDevs: stdDevsFromBaseline,
        stdDev: mouseSpeedStdDev,
      };
    }
  }

  // Gaze Fixation Duration (if available)
  if (
    baseline.baselineFixationDurationMs !== null &&
    summary.avgGazeFixationDurationMs !== null
  ) {
    const fixationValues = historicalSummaries
      .filter((s) => s.avgGazeFixationDurationMs !== null)
      .map((s) => s.avgGazeFixationDurationMs!);

    if (fixationValues.length > 3) {
      const fixationStdDev = computeStdDev(fixationValues);

      if (fixationStdDev > 0) {
        const stdDevsFromBaseline =
          Math.abs(summary.avgGazeFixationDurationMs - baseline.baselineFixationDurationMs) /
          fixationStdDev;

        if (stdDevsFromBaseline > DEVIATION_THRESHOLD_STD_DEVS) {
          deviations.gazeFixation = {
            baseline: baseline.baselineFixationDurationMs,
            current: summary.avgGazeFixationDurationMs,
            stdDevs: stdDevsFromBaseline,
            stdDev: fixationStdDev,
          };
        }
      }
    }
  }

  // Calculate correlation score
  const totalMetrics = 5; // error rate, typing speed, timing, mouse, gaze
  const deviatedCount = Object.keys(deviations).length;
  const correlationScore = deviatedCount / totalMetrics;

  console.log(`[Deviations] User ${userId}: ${deviatedCount}/${totalMetrics} metrics deviated (correlation: ${(correlationScore * 100).toFixed(1)}%)`);

  // Create alert if correlation is above threshold
  if (correlationScore >= MIN_CORRELATION_FOR_ALERT) {
    const severity =
      correlationScore >= HIGH_CORRELATION_THRESHOLD
        ? 'high'
        : correlationScore >= 0.4
        ? 'medium'
        : 'low';

    const summary_text = generateSummary(deviations, correlationScore);

    await prisma.deviationAlert.upsert({
      where: {
        userId_date: { userId, date },
      },
      create: {
        userId,
        date,
        severity,
        deviatedMetrics: JSON.stringify(deviations),
        correlationScore,
        summary: summary_text,
      },
      update: {
        severity,
        deviatedMetrics: JSON.stringify(deviations),
        correlationScore,
        summary: summary_text,
      },
    });

    console.log(
      `[Deviations] Created ${severity} alert for user ${userId} on ${date.toISOString().split('T')[0]}`
    );
    console.log(`  Summary: ${summary_text}`);
  } else {
    console.log(`[Deviations] No significant deviations for user ${userId}`);
  }
}

function generateSummary(
  deviations: Record<string, { baseline: number; current: number; stdDevs: number }>,
  correlationScore: number
): string {
  const parts: string[] = [];

  if (deviations.keyboardErrorRate) {
    const change =
      deviations.keyboardErrorRate.current > deviations.keyboardErrorRate.baseline
        ? 'increased'
        : 'decreased';
    const pct = (
      Math.abs(
        deviations.keyboardErrorRate.current - deviations.keyboardErrorRate.baseline
      ) * 100
    ).toFixed(1);
    parts.push(`typing error rate ${change} by ${pct}%`);
  }

  if (deviations.typingSpeed) {
    const change =
      deviations.typingSpeed.current < deviations.typingSpeed.baseline
        ? 'slowed down'
        : 'sped up';
    parts.push(`typing ${change}`);
  }

  if (deviations.keystrokeTiming) {
    parts.push('typing rhythm became less consistent');
  }

  if (deviations.mouseSpeed) {
    const change =
      deviations.mouseSpeed.current < deviations.mouseSpeed.baseline
        ? 'slowed down'
        : 'sped up';
    parts.push(`mouse movement ${change}`);
  }

  if (deviations.gazeFixation) {
    const change =
      deviations.gazeFixation.current > deviations.gazeFixation.baseline
        ? 'longer'
        : 'shorter';
    parts.push(`eye fixation duration became ${change}`);
  }

  const summary =
    parts.length > 0
      ? `We noticed ${parts.join(', ')}. This may just be normal variation.`
      : `Some behavioral changes were detected across ${(correlationScore * 100).toFixed(0)}% of tracked metrics.`;

  return summary;
}

function computeStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

// For the upsert to work, we need a unique constraint
// We'll need to add this to the schema if not present:
// @@unique([userId, date])

// Run script
const config = parseArgs();
detectDeviations(config)
  .then(() => {
    console.log('[Deviations] Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Deviations] Error:', error);
    process.exit(1);
  });
