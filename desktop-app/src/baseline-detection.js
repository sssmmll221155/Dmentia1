/**
 * Baseline Detection & Deviation Analysis
 * Research-based baselines from CMU Keystroke, Mouse Movement, and Eye Tracking studies
 */

// RESEARCH BASELINES (from datasets in PLAN.md)
const RESEARCH_BASELINES = {
  typing: {
    // From CMU Keystroke Dynamics Benchmark Dataset
    meanInterKeyIntervalMs: 180,     // Normal: 180ms between keys
    stdInterKeyIntervalMs: 40,       // Std dev: 40ms
    holdTimeMs: 80,                  // Normal hold time: 80ms
    errorRate: 5.0,                  // Normal error rate: 5%
    keysPerSecond: 4.5               // Normal speed: 4.5 keys/sec
  },
  mouse: {
    // From Mouse Movement UI Elements Dataset
    meanSpeedPxPerSec: 450,          // Normal: 450 px/sec
    pathEfficiency: 0.80,            // Normal: 0.80 (80% straight)
    hesitationMs: 320,               // Normal: 320ms before click
    clickAccuracyPx: 12              // Normal: 12px off target
  },
  gaze: {
    // From EyeMouseMap Dataset
    meanFixationDurationMs: 250,     // Normal: 250ms per fixation
    saccadeFrequency: 3.5,           // Normal: 3.5 saccades/sec
    reReadingRate: 0.10,             // Normal: 10% re-reading
    focusDurationMs: 1200            // Normal: 1.2s focus duration
  }
};

// DEVIATION THRESHOLDS (from research)
// Alert when metric exceeds baseline + (threshold × std dev)
const DEVIATION_THRESHOLDS = {
  typing: {
    meanInterKeyIntervalMs: 2.0,     // 2σ = 180 + (2 × 40) = 260ms threshold
    holdTimeMs: 2.0,                 // 40% increase triggers alert
    errorRate: 2.0,                  // Double error rate triggers alert
    keysPerSecond: 0.7               // 30% decrease triggers alert (multiply by 0.7)
  },
  mouse: {
    meanSpeedPxPerSec: 0.75,         // 25% decrease triggers alert
    pathEfficiency: 0.75,            // Drop below 0.6 triggers alert (0.80 × 0.75)
    hesitationMs: 1.5,               // 50% increase triggers alert
    clickAccuracyPx: 1.7             // 70% worse accuracy triggers alert
  },
  gaze: {
    meanFixationDurationMs: 1.5,     // 50% increase triggers alert
    saccadeFrequency: 0.70,          // 30% decrease triggers alert
    reReadingRate: 3.0,              // 200% increase triggers alert (3x normal)
    focusDurationMs: 0.7             // 30% decrease in focus
  }
};

/**
 * Detect deviations from baseline
 * @param {Object} metrics - Current metrics from batch
 * @returns {Object} - Deviation analysis with alerts
 */
function detectDeviations(metrics) {
  const alerts = [];
  const flaggedMetrics = [];

  // TYPING DEVIATIONS
  if (metrics.keyboard) {
    const typing = metrics.keyboard;

    // Inter-key interval (slower typing)
    if (typing.meanInterKeyIntervalMs > RESEARCH_BASELINES.typing.meanInterKeyIntervalMs +
        (DEVIATION_THRESHOLDS.typing.meanInterKeyIntervalMs * RESEARCH_BASELINES.typing.stdInterKeyIntervalMs)) {
      alerts.push({
        severity: 'MEDIUM',
        category: 'typing',
        metric: 'Inter-key interval',
        message: `Typing rhythm slower than normal (${Math.round(typing.meanInterKeyIntervalMs)}ms vs ${RESEARCH_BASELINES.typing.meanInterKeyIntervalMs}ms baseline)`,
        deviation: ((typing.meanInterKeyIntervalMs / RESEARCH_BASELINES.typing.meanInterKeyIntervalMs - 1) * 100).toFixed(1) + '%'
      });
      flaggedMetrics.push('typing_speed');
    }

    // Error rate (more mistakes)
    const errorRate = (typing.backspaceCount / typing.keyPressCount) * 100 || 0;
    if (errorRate > RESEARCH_BASELINES.typing.errorRate * DEVIATION_THRESHOLDS.typing.errorRate) {
      alerts.push({
        severity: 'HIGH',
        category: 'typing',
        metric: 'Error rate',
        message: `Error rate higher than normal (${errorRate.toFixed(1)}% vs ${RESEARCH_BASELINES.typing.errorRate}% baseline)`,
        deviation: ((errorRate / RESEARCH_BASELINES.typing.errorRate - 1) * 100).toFixed(1) + '%'
      });
      flaggedMetrics.push('typing_errors');
    }

    // Hold time (slower key presses)
    const avgHoldTime = typing.holdTimes && typing.holdTimes.length > 0
      ? typing.holdTimes.reduce((a, b) => a + b, 0) / typing.holdTimes.length
      : 0;

    if (avgHoldTime > RESEARCH_BASELINES.typing.holdTimeMs * DEVIATION_THRESHOLDS.typing.holdTimeMs) {
      alerts.push({
        severity: 'MEDIUM',
        category: 'typing',
        metric: 'Key hold time',
        message: `Key press duration longer than normal (${Math.round(avgHoldTime)}ms vs ${RESEARCH_BASELINES.typing.holdTimeMs}ms baseline)`,
        deviation: ((avgHoldTime / RESEARCH_BASELINES.typing.holdTimeMs - 1) * 100).toFixed(1) + '%'
      });
      flaggedMetrics.push('typing_hold');
    }
  }

  // MOUSE DEVIATIONS
  if (metrics.mouse) {
    const mouse = metrics.mouse;

    // Mouse speed (slower movement)
    if (mouse.meanSpeedPxPerSec > 0 &&
        mouse.meanSpeedPxPerSec < RESEARCH_BASELINES.mouse.meanSpeedPxPerSec * DEVIATION_THRESHOLDS.mouse.meanSpeedPxPerSec) {
      alerts.push({
        severity: 'MEDIUM',
        category: 'mouse',
        metric: 'Movement speed',
        message: `Mouse speed slower than normal (${Math.round(mouse.meanSpeedPxPerSec)}px/s vs ${RESEARCH_BASELINES.mouse.meanSpeedPxPerSec}px/s baseline)`,
        deviation: ((1 - mouse.meanSpeedPxPerSec / RESEARCH_BASELINES.mouse.meanSpeedPxPerSec) * 100).toFixed(1) + '% slower'
      });
      flaggedMetrics.push('mouse_speed');
    }
  }

  // GAZE DEVIATIONS
  if (metrics.gaze) {
    const gaze = metrics.gaze;

    // Fixation duration (slower processing)
    if (gaze.avgFixationDurationMs > RESEARCH_BASELINES.gaze.meanFixationDurationMs * DEVIATION_THRESHOLDS.gaze.meanFixationDurationMs) {
      alerts.push({
        severity: 'HIGH',
        category: 'gaze',
        metric: 'Fixation duration',
        message: `Eye fixation longer than normal (${Math.round(gaze.avgFixationDurationMs)}ms vs ${RESEARCH_BASELINES.gaze.meanFixationDurationMs}ms baseline)`,
        deviation: ((gaze.avgFixationDurationMs / RESEARCH_BASELINES.gaze.meanFixationDurationMs - 1) * 100).toFixed(1) + '%'
      });
      flaggedMetrics.push('gaze_fixation');
    }

    // Re-reading (memory issues)
    const reReadingRate = gaze.fixationCount > 0 ? gaze.rereadingEventCount / gaze.fixationCount : 0;
    if (reReadingRate > RESEARCH_BASELINES.gaze.reReadingRate * DEVIATION_THRESHOLDS.gaze.reReadingRate) {
      alerts.push({
        severity: 'HIGH',
        category: 'gaze',
        metric: 'Re-reading frequency',
        message: `Re-reading more than normal (${(reReadingRate * 100).toFixed(1)}% vs ${RESEARCH_BASELINES.gaze.reReadingRate * 100}% baseline)`,
        deviation: ((reReadingRate / RESEARCH_BASELINES.gaze.reReadingRate - 1) * 100).toFixed(1) + '%'
      });
      flaggedMetrics.push('gaze_rereading');
    }
  }

  // Calculate correlation score
  const totalMetrics = 8; // typing(3) + mouse(1) + gaze(2) + navigation(2)
  const correlationScore = (flaggedMetrics.length / totalMetrics) * 100;

  return {
    correlationScore: Math.round(correlationScore),
    flaggedMetrics,
    alerts,
    severity: getSeverity(correlationScore, alerts)
  };
}

/**
 * Get overall severity based on correlation score AND extreme individual deviations
 * Returns both current severity and potential severity if pattern continues
 * @param {number} score - Correlation score (percentage of metrics flagged)
 * @param {Array} alerts - Individual alerts with deviation percentages
 */
function getSeverity(score, alerts = []) {
  // Check for extreme individual deviations
  let maxDeviation = 0;

  if (alerts.length > 0) {
    alerts.forEach(alert => {
      // Parse deviation percentage (e.g., "1054.0%" -> 1054)
      const deviationMatch = alert.deviation.match(/(\d+\.?\d*)/);
      if (deviationMatch) {
        const deviationValue = parseFloat(deviationMatch[1]);
        maxDeviation = Math.max(maxDeviation, deviationValue);
      }
    });
  }

  // Determine potential severity if this pattern continues
  let potentialSeverity = 'NORMAL';
  if (maxDeviation >= 1000) {
    potentialSeverity = 'CRITICAL';
  } else if (maxDeviation >= 500) {
    potentialSeverity = 'HIGH';
  } else if (maxDeviation >= 200) {
    potentialSeverity = 'MEDIUM';
  }

  // Actual current severity based on correlation (how many metrics are affected)
  // This indicates if it's already a pattern vs a one-time spike
  let currentSeverity = 'NORMAL';
  if (score >= 80) currentSeverity = 'CRITICAL';
  else if (score >= 60) currentSeverity = 'HIGH';
  else if (score >= 40) currentSeverity = 'MEDIUM';
  else if (score >= 20) currentSeverity = 'LOW';

  // If correlation is low but individual deviation is high, it's a warning sign
  // Use the potential severity but flag it as "if continues"
  if (score < 40 && maxDeviation >= 200) {
    return potentialSeverity + '_IF_CONTINUES';
  }

  // If multiple metrics are affected, it's already a pattern
  return currentSeverity;
}

/**
 * Detect "Google in Google" and other navigation confusion
 * @param {string} url - Current URL
 * @param {string} searchQuery - Current search query (if on Google)
 * @returns {Object|null} - Alert if confusion detected
 */
function detectNavigationConfusion(url, searchQuery = '') {
  // Google in Google detection
  if (url && url.includes('google.com')) {
    const query = searchQuery.toLowerCase();
    if (query.includes('google') || query.includes('google.com')) {
      return {
        severity: 'CRITICAL',
        category: 'navigation',
        metric: 'Google in Google',
        message: `Searched for "google" while on google.com - HIGH confusion signal`,
        type: 'GOOGLE_IN_GOOGLE'
      };
    }
  }

  return null;
}

module.exports = {
  RESEARCH_BASELINES,
  DEVIATION_THRESHOLDS,
  detectDeviations,
  detectNavigationConfusion,
  getSeverity
};
