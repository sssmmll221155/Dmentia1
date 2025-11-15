# How Problem Detection Works

## Your Question

> "What's the best way to get all of the data so that it knows based upon the eye tracking or based upon the keyboard strokes. Even if it works we need it to not just work but also to be able to identify if something was wrong right based upon keystrokes"

## The Answer: Multi-Modal Baseline Deviation Detection

The system identifies problems through a **three-phase approach**:

## Phase 1: Learn Your Normal (Baseline)

For the first 2-4 weeks, the system just watches and learns **YOUR** normal:

```
User: Alice
Baseline Period: Jan 1 - Jan 14 (2 weeks)

Learned Patterns:
✓ She types at 3.2 keys/sec
✓ She makes errors 5% of the time (backspace rate)
✓ Her typing rhythm is consistent (std dev: 42ms)
✓ Her mouse moves at 450 px/sec average
✓ Her gaze fixates for ~250ms typically
```

This becomes Alice's **personal baseline** - not compared to anyone else, just her own normal behavior.

## Phase 2: Track Daily Behavior

Every day, we compute Alice's daily averages:

```
Date: Feb 15

Today's Stats:
- Typing speed: 2.1 keys/sec
- Error rate: 12.3%
- Timing variability: 68ms
- Mouse speed: 380 px/sec
- Gaze fixation: 310ms
```

## Phase 3: Detect Deviations (The "Something Wrong" Detection)

Now we compare today to the baseline using **statistical deviation**:

### What's "Wrong"?

A metric is "wrong" if it's more than **2 standard deviations** from the baseline.

```python
# Pseudo-code for detection
def is_deviated(current_value, baseline_avg, historical_data):
    std_dev = compute_std_dev(historical_data)
    deviation = abs(current_value - baseline_avg) / std_dev

    if deviation > 2.0:
        return True  # FLAGGED as abnormal
    return False
```

### Example: Alice on Feb 15

```
Metric: Typing Error Rate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Baseline:     5.1%
Today:        12.3%
Std Dev:      2.1%

Calculation:
  deviation = |12.3 - 5.1| / 2.1 = 3.43 standard deviations

Result: ✗ FLAGGED (3.43 > 2.0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Metric: Typing Speed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Baseline:     3.2 keys/sec
Today:        2.1 keys/sec
Std Dev:      0.4

Calculation:
  deviation = |2.1 - 3.2| / 0.4 = 2.75 standard deviations

Result: ✗ FLAGGED (2.75 > 2.0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Metric: Mouse Speed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Baseline:     450 px/sec
Today:        380 px/sec
Std Dev:      40

Calculation:
  deviation = |380 - 450| / 40 = 1.75 standard deviations

Result: ✓ NORMAL (1.75 < 2.0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## The Key Insight: Multi-Modal Correlation

**One flagged metric = probably nothing (could be tired, distracted)**

**Multiple flagged metrics = worth investigating**

We compute a **correlation score**:

```
Metrics checked: 5
  1. Typing error rate: FLAGGED ✗
  2. Typing speed: FLAGGED ✗
  3. Typing rhythm: FLAGGED ✗
  4. Mouse speed: NORMAL ✓
  5. Gaze fixation: FLAGGED ✗

Correlation Score = 4/5 = 80%
```

### Alert Severity

```
Correlation < 30%:  No alert (normal variation)
Correlation 30-50%: Low severity alert
Correlation 50-80%: Medium severity alert
Correlation > 80%:  High severity alert
```

## What Gets Stored from Keystrokes

### ❌ NOT Stored:
- Actual keys pressed
- Text content
- Passwords
- Anything readable

### ✅ Stored:
```typescript
{
  keyPressCount: 45,           // How many keys total
  backspaceCount: 3,            // Error correction
  keyGroup: "letter",           // Just category: letter/number/backspace/enter/other

  // Timing patterns (the critical data!)
  holdTimes: [80, 75, 90, ...],           // H: how long key was held down
  downDownIntervals: [120, 115, ...],      // DD: time between keypresses
  upDownIntervals: [40, 35, ...]           // UD: time from release to next press
}
```

## Why Timing Patterns Matter

Research shows that **typing rhythm** is like a fingerprint, and more importantly, **changes in that rhythm** can indicate cognitive issues:

- **Increased variability** = less consistent motor control
- **Slower typing** = processing slowdown
- **More errors** (backspaces) = attention/accuracy issues
- **Longer hold times** = slower fine motor response

Combined with:
- **Eye tracking**: slower fixations = slower visual processing
- **Mouse tracking**: less smooth = motor control changes

## Example Alert

When Alice's care team checks the dashboard:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALERT - February 15, 2024
Severity: HIGH (80% correlation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We noticed typing error rate increased by 7.2%, typing
slowed down, typing rhythm became less consistent, and
eye fixation duration became longer. This may just be
normal variation.

Suggested actions:
- Review recent activity patterns
- Check for environmental factors (stress, sleep, etc.)
- Consider scheduling a check-in
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## The Code That Detects Problems

Located in: `server/src/scripts/detectDeviations.ts`

```typescript
// Simplified version
async function detectUserDeviations(userId: string, date: Date) {
  // 1. Get user's baseline
  const baseline = await getBaseline(userId);

  // 2. Get today's summary
  const today = await getDailySummary(userId, date);

  // 3. Get historical data for computing std dev
  const historical = await getHistoricalData(userId);

  // 4. Check each metric
  const deviations = {};

  // Check typing error rate
  const errorRateStdDev = computeStdDev(historical.map(d => d.errorRate));
  const errorRateDeviation = Math.abs(today.errorRate - baseline.errorRate) / errorRateStdDev;

  if (errorRateDeviation > 2.0) {
    deviations.errorRate = {
      baseline: baseline.errorRate,
      current: today.errorRate,
      stdDevs: errorRateDeviation
    };
  }

  // ... repeat for all metrics ...

  // 5. Compute correlation
  const correlationScore = Object.keys(deviations).length / totalMetrics;

  // 6. Create alert if significant
  if (correlationScore > 0.3) {
    await createAlert({
      userId,
      date,
      severity: getSeverity(correlationScore),
      deviations,
      correlationScore
    });
  }
}
```

## Running Detection

```bash
# Compute baselines (run once after 2 weeks of data)
npm run computeBaselines --all

# Detect deviations (run daily)
npm run detectDeviations --all --date=2024-02-15

# Output:
# [Deviations] Checking user alice for 2024-02-15
# [Deviations] User alice: 4/5 metrics deviated (correlation: 80.0%)
# [Deviations] Created high alert for user alice on 2024-02-15
#   Summary: We noticed typing error rate increased by 7.2%, ...
```

## Summary

The system identifies problems by:

1. **Learning** your normal patterns (baseline)
2. **Measuring** daily behavior
3. **Comparing** using statistical deviation (>2σ = flagged)
4. **Correlating** across multiple modalities (typing + mouse + gaze)
5. **Alerting** only when multiple metrics show consistent change

This approach:
- ✅ Compares you to yourself, not others
- ✅ Uses proven statistical methods
- ✅ Requires multiple signals (reduces false positives)
- ✅ Preserves privacy (no content stored)
- ✅ Uses gentle, non-diagnostic language
