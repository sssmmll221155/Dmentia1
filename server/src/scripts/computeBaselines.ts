/**
 * Compute User Baselines
 *
 * Establishes a baseline for each user based on their first N weeks of data.
 * This baseline represents their "normal" behavior, which we'll use to detect deviations.
 *
 * Usage:
 *   npm run computeBaselines -- --userId=user123 --weeks=2
 *   npm run computeBaselines --all  (compute for all users)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_BASELINE_WEEKS = 2; // Use first 2 weeks as baseline period

interface BaselineConfig {
  userId?: string;
  all?: boolean;
  weeks?: number;
}

function parseArgs(): BaselineConfig {
  const args = process.argv.slice(2);

  const config: BaselineConfig = {
    weeks: DEFAULT_BASELINE_WEEKS,
  };

  for (const arg of args) {
    if (arg.startsWith('--userId=')) {
      config.userId = arg.split('=')[1];
    } else if (arg === '--all') {
      config.all = true;
    } else if (arg.startsWith('--weeks=')) {
      config.weeks = parseInt(arg.split('=')[1]);
    }
  }

  return config;
}

async function computeBaselines(config: BaselineConfig) {
  console.log('[Baselines] Computing user baselines...');

  if (config.all) {
    // Compute for all users
    const users = await prisma.dailySummary.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });

    console.log(`[Baselines] Found ${users.length} users`);

    for (const { userId } of users) {
      await computeUserBaseline(userId, config.weeks!);
    }
  } else if (config.userId) {
    await computeUserBaseline(config.userId, config.weeks!);
  } else {
    console.error('[Baselines] Error: Must specify --userId=<id> or --all');
    process.exit(1);
  }

  console.log('[Baselines] Done');
}

async function computeUserBaseline(userId: string, weeksCount: number) {
  console.log(`[Baselines] Computing baseline for user ${userId} (${weeksCount} weeks)`);

  // Find user's earliest summary date
  const earliestSummary = await prisma.dailySummary.findFirst({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  if (!earliestSummary) {
    console.log(`[Baselines] No data found for user ${userId}`);
    return;
  }

  const baselineStartDate = earliestSummary.date;
  const baselineEndDate = new Date(baselineStartDate);
  baselineEndDate.setDate(baselineEndDate.getDate() + weeksCount * 7);

  // Fetch all summaries in baseline period
  const summaries = await prisma.dailySummary.findMany({
    where: {
      userId,
      date: {
        gte: baselineStartDate,
        lt: baselineEndDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  if (summaries.length < 7) {
    console.log(
      `[Baselines] Insufficient data for user ${userId} (need at least 7 days, found ${summaries.length})`
    );
    return;
  }

  // Compute baseline averages
  const baselineKeyPressRate =
    summaries.reduce((sum, s) => sum + s.avgKeyboardKeyPressRate, 0) / summaries.length;

  const baselineErrorRate =
    summaries.reduce((sum, s) => sum + s.avgKeyboardErrorRate, 0) / summaries.length;

  const baselineInterKeyIntervalMs =
    summaries.reduce((sum, s) => sum + s.avgKeyboardInterKeyIntervalMs, 0) / summaries.length;

  const baselineInterKeyVariabilityMs =
    summaries.reduce((sum, s) => sum + s.keyboardInterKeyVariabilityMs, 0) / summaries.length;

  const baselineHoldTimeMs =
    summaries.reduce((sum, s) => sum + s.avgKeyboardHoldTimeMs, 0) / summaries.length;

  const baselineMouseSpeed =
    summaries.reduce((sum, s) => sum + s.avgMouseSpeedPxPerSec, 0) / summaries.length;

  const baselineMouseSpeedStd =
    summaries.reduce((sum, s) => sum + s.stdMouseSpeedPxPerSec, 0) / summaries.length;

  // Gaze baselines (nullable)
  const gazeFixationValues = summaries
    .filter((s) => s.avgGazeFixationDurationMs !== null)
    .map((s) => s.avgGazeFixationDurationMs!);

  const baselineFixationDurationMs =
    gazeFixationValues.length > 0
      ? gazeFixationValues.reduce((a, b) => a + b, 0) / gazeFixationValues.length
      : null;

  const gazeSaccadeValues = summaries
    .filter((s) => s.avgGazeSaccadeCount !== null)
    .map((s) => s.avgGazeSaccadeCount!);

  const baselineSaccadeCount =
    gazeSaccadeValues.length > 0
      ? gazeSaccadeValues.reduce((a, b) => a + b, 0) / gazeSaccadeValues.length
      : null;

  // Upsert baseline
  await prisma.userBaseline.upsert({
    where: { userId },
    create: {
      userId,
      baselineStartDate,
      baselineEndDate,
      dayCount: summaries.length,
      baselineKeyPressRate,
      baselineErrorRate,
      baselineInterKeyIntervalMs,
      baselineInterKeyVariabilityMs,
      baselineHoldTimeMs,
      baselineMouseSpeed,
      baselineMouseSpeedStd,
      baselineFixationDurationMs,
      baselineSaccadeCount,
    },
    update: {
      baselineStartDate,
      baselineEndDate,
      dayCount: summaries.length,
      baselineKeyPressRate,
      baselineErrorRate,
      baselineInterKeyIntervalMs,
      baselineInterKeyVariabilityMs,
      baselineHoldTimeMs,
      baselineMouseSpeed,
      baselineMouseSpeedStd,
      baselineFixationDurationMs,
      baselineSaccadeCount,
    },
  });

  console.log(
    `[Baselines] Created baseline for user ${userId} (${summaries.length} days, ${baselineStartDate.toISOString().split('T')[0]} to ${baselineEndDate.toISOString().split('T')[0]})`
  );
  console.log(`  - Baseline error rate: ${(baselineErrorRate * 100).toFixed(2)}%`);
  console.log(`  - Baseline typing speed: ${baselineKeyPressRate.toFixed(2)} keys/sec`);
  console.log(`  - Baseline mouse speed: ${baselineMouseSpeed.toFixed(2)} px/sec`);
}

// Run script
const config = parseArgs();
computeBaselines(config)
  .then(() => {
    console.log('[Baselines] Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Baselines] Error:', error);
    process.exit(1);
  });
