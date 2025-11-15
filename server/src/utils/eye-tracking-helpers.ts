/**
 * Eye Tracking Helper Functions
 * Utilities for processing and analyzing eye tracking data
 */

import type {
  GazeCoordinate,
  FixationEvent,
  SaccadeEvent,
  ReadingDirection,
  ScreenRegion,
} from '../types/eye-tracking';

/**
 * Calculate Euclidean distance between two points
 */
export function calculateDistance(
  from: GazeCoordinate,
  to: GazeCoordinate
): number {
  return Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
}

/**
 * Calculate velocity in pixels per second
 */
export function calculateVelocity(
  distancePx: number,
  durationMs: number
): number {
  if (durationMs === 0) return 0;
  return (distancePx / durationMs) * 1000;
}

/**
 * Determine which screen region contains a point
 */
export function detectRegion(
  x: number,
  y: number,
  regions: ScreenRegion[]
): string | null {
  for (const region of regions) {
    const inXBounds = x >= region.x && x <= region.x + region.width;
    const inYBounds = y >= region.y && y <= region.y + region.height;

    if (inXBounds && inYBounds) {
      return region.id;
    }
  }
  return null;
}

/**
 * Classify reading direction based on fixation sequence
 */
export function classifyReadingDirection(
  fixations: FixationEvent[]
): ReadingDirection {
  if (fixations.length < 3) {
    return 'irregular';
  }

  let leftToRight = 0;
  let rightToLeft = 0;
  let topToBottom = 0;

  for (let i = 1; i < fixations.length; i++) {
    const prev = fixations[i - 1];
    const curr = fixations[i];

    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;

    // Horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) leftToRight++;
      else rightToLeft++;
    } else if (dy > 0) {
      topToBottom++;
    }
  }

  const total = fixations.length - 1;
  const ltrRatio = leftToRight / total;
  const rtlRatio = rightToLeft / total;
  const ttbRatio = topToBottom / total;

  // Determine dominant direction (threshold: 60%)
  if (ltrRatio > 0.6) return 'left-to-right';
  if (rtlRatio > 0.6) return 'right-to-left';
  if (ttbRatio > 0.6) return 'top-to-bottom';

  return 'irregular';
}

/**
 * Estimate reading speed in words per minute
 * Assumes average word width of 50px
 */
export function estimateReadingSpeed(
  fixations: FixationEvent[],
  textLengthPx?: number
): number {
  if (fixations.length < 2) return 0;

  const firstFixation = fixations[0];
  const lastFixation = fixations[fixations.length - 1];
  const durationMs = Number(lastFixation.timestamp - firstFixation.timestamp);

  if (durationMs === 0) return 0;

  // Calculate horizontal distance covered
  let totalDistance = 0;
  for (let i = 1; i < fixations.length; i++) {
    const dx = fixations[i].x - fixations[i - 1].x;
    if (dx > 0) {
      // Only count forward movements
      totalDistance += dx;
    }
  }

  // Use provided text length or estimated distance
  const distance = textLengthPx || totalDistance;

  // Assume average word width of 50px
  const avgWordWidth = 50;
  const wordsRead = distance / avgWordWidth;

  // Convert to words per minute
  const durationMin = durationMs / 60000;
  return wordsRead / durationMin;
}

/**
 * Count regression saccades (backward eye movements during reading)
 */
export function countRegressions(fixations: FixationEvent[]): number {
  let regressions = 0;

  for (let i = 1; i < fixations.length; i++) {
    const prev = fixations[i - 1];
    const curr = fixations[i];

    // Regression = moving backward (negative x movement in LTR reading)
    if (curr.x < prev.x - 20) {
      // 20px threshold to avoid noise
      regressions++;
    }
  }

  return regressions;
}

/**
 * Calculate fixation density for a region (fixations per area)
 */
export function calculateFixationDensity(
  fixations: FixationEvent[],
  region: ScreenRegion
): number {
  const fixationsInRegion = fixations.filter((f) => {
    return (
      f.x >= region.x &&
      f.x <= region.x + region.width &&
      f.y >= region.y &&
      f.y <= region.y + region.height
    );
  });

  const area = region.width * region.height;
  return (fixationsInRegion.length / area) * 10000; // per 10,000 px²
}

/**
 * Detect scanpath pattern (systematic vs random)
 * Returns 0-1 score (higher = more systematic)
 */
export function calculateScanpathSystematicity(
  fixations: FixationEvent[]
): number {
  if (fixations.length < 5) return 0;

  let systematicMoves = 0;

  for (let i = 2; i < fixations.length; i++) {
    const prev2 = fixations[i - 2];
    const prev1 = fixations[i - 1];
    const curr = fixations[i];

    // Calculate direction vectors
    const dx1 = prev1.x - prev2.x;
    const dy1 = prev1.y - prev2.y;
    const dx2 = curr.x - prev1.x;
    const dy2 = curr.y - prev1.y;

    // Calculate angle between vectors
    const dot = dx1 * dx2 + dy1 * dy2;
    const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (mag1 > 0 && mag2 > 0) {
      const cosAngle = dot / (mag1 * mag2);
      // If angle is small (cosine close to 1), movement is systematic
      if (cosAngle > 0.7) {
        // Within ~45 degrees
        systematicMoves++;
      }
    }
  }

  return systematicMoves / (fixations.length - 2);
}

/**
 * Calculate average saccade amplitude
 */
export function calculateAverageSaccadeAmplitude(
  saccades: SaccadeEvent[]
): number {
  if (saccades.length === 0) return 0;

  const totalAmplitude = saccades.reduce(
    (sum, saccade) => sum + saccade.amplitudePx,
    0
  );

  return totalAmplitude / saccades.length;
}

/**
 * Calculate fixation-to-saccade ratio
 * Higher ratio = more focused attention
 * Lower ratio = more exploratory behavior
 */
export function calculateFixationSaccadeRatio(
  fixationCount: number,
  saccadeCount: number
): number {
  if (saccadeCount === 0) return 0;
  return fixationCount / saccadeCount;
}

/**
 * Detect smooth pursuit (tracking moving objects)
 * Returns true if gaze follows a smooth trajectory
 */
export function detectSmoothPursuit(
  gazePoints: GazeCoordinate[],
  windowSize: number = 10
): boolean {
  if (gazePoints.length < windowSize) return false;

  let smoothSegments = 0;
  const totalSegments = Math.floor(gazePoints.length / windowSize);

  for (let i = 0; i < totalSegments; i++) {
    const segment = gazePoints.slice(i * windowSize, (i + 1) * windowSize);

    // Calculate average velocity
    let totalVelocity = 0;
    for (let j = 1; j < segment.length; j++) {
      const dist = calculateDistance(segment[j - 1], segment[j]);
      totalVelocity += dist;
    }

    const avgVelocity = totalVelocity / (segment.length - 1);

    // Smooth pursuit has consistent velocity (low variance)
    let variance = 0;
    for (let j = 1; j < segment.length; j++) {
      const dist = calculateDistance(segment[j - 1], segment[j]);
      variance += Math.pow(dist - avgVelocity, 2);
    }
    variance /= segment.length - 1;

    // If velocity is consistent and non-zero, it's smooth pursuit
    if (variance < avgVelocity * 0.5 && avgVelocity > 10) {
      smoothSegments++;
    }
  }

  return smoothSegments / totalSegments > 0.6; // 60% threshold
}

/**
 * Calculate cognitive load index based on fixation metrics
 * Higher values suggest increased cognitive load
 */
export function calculateCognitiveLoadIndex(
  avgFixationDurationMs: number,
  fixationCount: number,
  regressionCount: number
): number {
  // Baseline: 250ms fixation duration, 1 regression per 10 fixations
  const baselineFixationDuration = 250;
  const baselineRegressionRate = 0.1;

  const fixationDurationFactor = avgFixationDurationMs / baselineFixationDuration;
  const regressionRate =
    fixationCount > 0 ? regressionCount / fixationCount : 0;
  const regressionFactor = regressionRate / baselineRegressionRate;

  // Weighted combination (fixation duration 70%, regression 30%)
  return fixationDurationFactor * 0.7 + regressionFactor * 0.3;
}

/**
 * Cluster fixations by spatial proximity
 * Returns array of fixation clusters
 */
export function clusterFixations(
  fixations: FixationEvent[],
  distanceThreshold: number = 50
): FixationEvent[][] {
  if (fixations.length === 0) return [];

  const clusters: FixationEvent[][] = [];
  const visited = new Set<number>();

  for (let i = 0; i < fixations.length; i++) {
    if (visited.has(i)) continue;

    const cluster: FixationEvent[] = [fixations[i]];
    visited.add(i);

    for (let j = i + 1; j < fixations.length; j++) {
      if (visited.has(j)) continue;

      const distance = calculateDistance(
        { x: fixations[i].x, y: fixations[i].y },
        { x: fixations[j].x, y: fixations[j].y }
      );

      if (distance <= distanceThreshold) {
        cluster.push(fixations[j]);
        visited.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Generate heatmap data from fixations
 * Returns grid of fixation counts
 */
export function generateHeatmapGrid(
  fixations: FixationEvent[],
  width: number,
  height: number,
  gridSize: number = 50
): number[][] {
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);

  // Initialize grid
  const grid: number[][] = Array(rows)
    .fill(0)
    .map(() => Array(cols).fill(0));

  // Count fixations in each cell
  for (const fixation of fixations) {
    const col = Math.floor(fixation.x / gridSize);
    const row = Math.floor(fixation.y / gridSize);

    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      grid[row][col]++;
    }
  }

  return grid;
}

/**
 * Calculate time to first fixation for a region
 */
export function calculateTimeToFirstFixation(
  fixations: FixationEvent[],
  regionId: string,
  startTimestamp: number
): number | null {
  const firstFixation = fixations.find((f) => f.regionId === regionId);
  if (!firstFixation) return null;

  return Number(firstFixation.timestamp - startTimestamp);
}

/**
 * Validate eye tracking data quality
 * Returns quality score 0-1 and issues found
 */
export function validateDataQuality(data: {
  gazePoints: GazeCoordinate[];
  fixations: FixationEvent[];
  saccades: SaccadeEvent[];
}): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 1.0;

  // Check for minimum data
  if (data.gazePoints.length < 10) {
    issues.push('Insufficient gaze points');
    score -= 0.3;
  }

  if (data.fixations.length < 3) {
    issues.push('Too few fixations detected');
    score -= 0.2;
  }

  // Check for outliers (points outside reasonable screen bounds)
  const outliers = data.gazePoints.filter(
    (p) => p.x < 0 || p.x > 3840 || p.y < 0 || p.y > 2160
  );

  if (outliers.length / data.gazePoints.length > 0.1) {
    issues.push('High outlier rate (>10%)');
    score -= 0.2;
  }

  // Check for data gaps
  const timestamps = data.gazePoints.map((p) => p.timestamp).sort();
  let maxGap = 0;
  for (let i = 1; i < timestamps.length; i++) {
    const gap = timestamps[i] - timestamps[i - 1];
    maxGap = Math.max(maxGap, gap);
  }

  if (maxGap > 1000) {
    // 1 second gap
    issues.push('Large temporal gaps in data');
    score -= 0.15;
  }

  // Check fixation duration reasonableness
  const avgFixationDuration =
    data.fixations.reduce((sum, f) => sum + f.durationMs, 0) /
    data.fixations.length;

  if (avgFixationDuration < 100 || avgFixationDuration > 1000) {
    issues.push('Unusual fixation durations');
    score -= 0.15;
  }

  return {
    score: Math.max(0, score),
    issues,
  };
}
