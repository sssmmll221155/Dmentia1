/**
 * Compute Daily Summaries
 *
 * Aggregates raw batch metrics into daily summaries per user.
 * Run this as a cron job once per day.
 *
 * Usage:
 *   npm run computeDailySummaries -- --date=2024-01-15
 *   npm run computeDailySummaries  (defaults to yesterday)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs(): Date {
  const args = process.argv.slice(2);
  const dateArg = args.find((arg) => arg.startsWith('--date='));

  if (dateArg) {
    const dateStr = dateArg.split('=')[1];
    return new Date(dateStr);
  }

  // Default to yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
}

async function computeDailySummaries(targetDate: Date) {
  console.log(`[DailySummaries] Computing summaries for ${targetDate.toISOString().split('T')[0]}`);

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Find all users with activity on this date
  const uniqueUsers = await prisma.metricsBatch.findMany({
    where: {
      startedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  console.log(`[DailySummaries] Found ${uniqueUsers.length} users with activity`);

  for (const { userId } of uniqueUsers) {
    await computeUserDailySummary(userId, targetDate);
  }

  console.log('[DailySummaries] Done');
}

async function computeUserDailySummary(userId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch all batches for this user on this date
  const batches = await prisma.metricsBatch.findMany({
    where: {
      userId,
      startedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Parse JSON arrays from SQLite
  const parsedBatches = batches.map(b => ({
    ...b,
    keyboardHoldTimes: JSON.parse(b.keyboardHoldTimes),
    keyboardDownDownIntervals: JSON.parse(b.keyboardDownDownIntervals),
    keyboardUpDownIntervals: JSON.parse(b.keyboardUpDownIntervals)
  }));

  if (parsedBatches.length === 0) {
    console.log(`[DailySummaries] No batches for user ${userId} on ${date.toISOString().split('T')[0]}`);
    return;
  }

  // Compute total active seconds
  const totalActiveSeconds = parsedBatches.reduce((sum, batch) => {
    const duration = (batch.endedAt.getTime() - batch.startedAt.getTime()) / 1000;
    return sum + duration;
  }, 0);

  // Keyboard aggregates
  const totalKeyPresses = parsedBatches.reduce((sum, b) => sum + b.keyboardKeyPressCount, 0);
  const totalBackspaces = parsedBatches.reduce((sum, b) => sum + b.keyboardBackspaceCount, 0);

  const avgKeyboardKeyPressRate = totalActiveSeconds > 0 ? totalKeyPresses / totalActiveSeconds : 0;
  const avgKeyboardErrorRate = totalKeyPresses > 0 ? totalBackspaces / totalKeyPresses : 0;

  // Average inter-key intervals
  const allInterKeyIntervals: number[] = parsedBatches.flatMap((b) => b.keyboardDownDownIntervals);
  const avgKeyboardInterKeyIntervalMs =
    allInterKeyIntervals.length > 0
      ? allInterKeyIntervals.reduce((a, b) => a + b, 0) / allInterKeyIntervals.length
      : 0;

  const keyboardInterKeyVariabilityMs =
    allInterKeyIntervals.length > 1 ? computeStdDev(allInterKeyIntervals) : 0;

  // Hold time aggregates
  const allHoldTimes: number[] = parsedBatches.flatMap((b) => b.keyboardHoldTimes);
  const avgKeyboardHoldTimeMs =
    allHoldTimes.length > 0 ? allHoldTimes.reduce((a, b) => a + b, 0) / allHoldTimes.length : 0;
  const stdKeyboardHoldTimeMs = allHoldTimes.length > 1 ? computeStdDev(allHoldTimes) : 0;

  // Mouse aggregates
  const avgMouseSpeedPxPerSec =
    parsedBatches.reduce((sum, b) => sum + b.mouseMeanSpeedPxPerSec, 0) / parsedBatches.length;

  const allMouseSpeeds = parsedBatches.map((b) => b.mouseMeanSpeedPxPerSec);
  const stdMouseSpeedPxPerSec = computeStdDev(allMouseSpeeds);

  const avgMouseDistancePerBatch =
    parsedBatches.reduce((sum, b) => sum + b.mouseTotalDistancePx, 0) / parsedBatches.length;

  // Scroll aggregates
  const avgScrollSpeed =
    parsedBatches.reduce((sum, b) => sum + b.scrollMeanScrollSpeed, 0) / parsedBatches.length;
  const scrollUpScrollFraction =
    parsedBatches.reduce((sum, b) => sum + b.scrollUpScrollFraction, 0) / parsedBatches.length;

  // Gaze aggregates (nullable)
  const gazeBatches = parsedBatches.filter((b) => b.gazeEventCount !== null);
  const avgGazeFixationDurationMs =
    gazeBatches.length > 0
      ? gazeBatches.reduce((sum, b) => sum + (b.gazeMeanFixationDurationMs ?? 0), 0) / gazeBatches.length
      : null;

  const avgGazeSaccadeCount =
    gazeBatches.length > 0
      ? gazeBatches.reduce((sum, b) => sum + (b.gazeSaccadeCount ?? 0), 0) / gazeBatches.length
      : null;

  const avgGazeSaccadeLengthPx =
    gazeBatches.length > 0
      ? gazeBatches.reduce((sum, b) => sum + (b.gazeMeanSaccadeLengthPx ?? 0), 0) / gazeBatches.length
      : null;

  // Upsert daily summary
  await prisma.dailySummary.upsert({
    where: {
      userId_date: {
        userId,
        date: startOfDay,
      },
    },
    create: {
      userId,
      date: startOfDay,
      totalActiveSeconds,
      totalBatches: parsedBatches.length,
      avgKeyboardKeyPressRate,
      avgKeyboardErrorRate,
      avgKeyboardInterKeyIntervalMs,
      keyboardInterKeyVariabilityMs,
      avgKeyboardHoldTimeMs,
      stdKeyboardHoldTimeMs,
      avgMouseSpeedPxPerSec,
      stdMouseSpeedPxPerSec,
      avgMouseDistancePerBatch,
      avgScrollSpeed,
      scrollUpScrollFraction,
      avgGazeFixationDurationMs,
      avgGazeSaccadeCount,
      avgGazeSaccadeLengthPx,
    },
    update: {
      totalActiveSeconds,
      totalBatches: parsedBatches.length,
      avgKeyboardKeyPressRate,
      avgKeyboardErrorRate,
      avgKeyboardInterKeyIntervalMs,
      keyboardInterKeyVariabilityMs,
      avgKeyboardHoldTimeMs,
      stdKeyboardHoldTimeMs,
      avgMouseSpeedPxPerSec,
      stdMouseSpeedPxPerSec,
      avgMouseDistancePerBatch,
      avgScrollSpeed,
      scrollUpScrollFraction,
      avgGazeFixationDurationMs,
      avgGazeSaccadeCount,
      avgGazeSaccadeLengthPx,
    },
  });

  console.log(`[DailySummaries] Created summary for user ${userId} on ${date.toISOString().split('T')[0]}`);
}

function computeStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

// Run script
const targetDate = parseArgs();
computeDailySummaries(targetDate)
  .then(() => {
    console.log('[DailySummaries] Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[DailySummaries] Error:', error);
    process.exit(1);
  });
