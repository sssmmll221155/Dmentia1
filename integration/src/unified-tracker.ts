/**
 * Unified Cognitive Tracker
 *
 * Integrates:
 * - WebGazer.js for eye tracking
 * - MKLogger-inspired mouse tracking
 * - Keystroke dynamics timing analysis
 */

import type {
  TrackerConfig,
  KeyGroup,
  KeystrokeTimingEvent,
  MouseMoveEvent,
  ClickEvent,
  ScrollEvent,
  GazeEvent,
  BatchMetrics,
} from './types';

declare global {
  interface Window {
    webgazer: any;
  }
}

export class UnifiedCognitiveTracker {
  private config: TrackerConfig;
  private batchStartTime: number;
  private batchInterval: number | null = null;

  // Event buffers
  private keystrokeEvents: KeystrokeTimingEvent[] = [];
  private mouseMoveEvents: MouseMoveEvent[] = [];
  private clickEvents: ClickEvent[] = [];
  private scrollEvents: ScrollEvent[] = [];
  private gazeEvents: GazeEvent[] = [];

  // Tracking state
  private lastMousePosition: { x: number; y: number } | null = null;
  private lastMouseMoveTime = 0;
  private mouseMoveDebounceMs = 50;

  // WebGazer reference
  private webgazer: any = null;
  private gazeListenerActive = false;

  constructor(config: TrackerConfig) {
    this.config = {
      enableEyeTracking: true,
      enableMouseTracking: true,
      enableKeystrokeTracking: true,
      ...config,
    };
    this.batchStartTime = Date.now();
  }

  /**
   * Initialize and start all tracking
   */
  public async start(): Promise<void> {
    console.log('[UnifiedTracker] Starting cognitive tracking...');

    // Initialize eye tracking if enabled
    if (this.config.enableEyeTracking) {
      await this.initializeEyeTracking();
    }

    // Initialize keyboard tracking
    if (this.config.enableKeystrokeTracking) {
      this.initializeKeystrokeTracking();
    }

    // Initialize mouse tracking
    if (this.config.enableMouseTracking) {
      this.initializeMouseTracking();
    }

    // Start batch interval
    this.startBatchInterval();

    console.log('[UnifiedTracker] All tracking modules initialized');
  }

  /**
   * Stop all tracking and clean up
   */
  public async stop(): Promise<void> {
    console.log('[UnifiedTracker] Stopping cognitive tracking...');

    this.stopBatchInterval();
    this.detachListeners();

    if (this.webgazer && this.gazeListenerActive) {
      await this.webgazer.end();
      this.gazeListenerActive = false;
    }

    console.log('[UnifiedTracker] Tracking stopped');
  }

  /**
   * Initialize WebGazer eye tracking
   */
  private async initializeEyeTracking(): Promise<void> {
    if (typeof window === 'undefined' || !window.webgazer) {
      console.warn('[UnifiedTracker] WebGazer not available, skipping eye tracking');
      return;
    }

    try {
      this.webgazer = window.webgazer;

      await this.webgazer
        .setRegression('ridge')
        .setGazeListener((data: any, clock: number) => {
          if (data) {
            this.gazeEvents.push({
              timestamp: Date.now(),
              x: data.x,
              y: data.y,
            });
          }
        })
        .saveDataAcrossSessions(false) // Privacy: don't persist
        .begin();

      // Hide video preview and prediction points for passive tracking
      this.webgazer
        .showVideoPreview(false)
        .showPredictionPoints(false)
        .applyKalmanFilter(true);

      this.gazeListenerActive = true;
      console.log('[UnifiedTracker] Eye tracking initialized');
    } catch (error) {
      console.error('[UnifiedTracker] Failed to initialize eye tracking:', error);
    }
  }

  /**
   * Initialize keystroke dynamics tracking
   */
  private initializeKeystrokeTracking(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    console.log('[UnifiedTracker] Keystroke tracking initialized');
  }

  /**
   * Initialize mouse and scroll tracking
   */
  private initializeMouseTracking(): void {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('click', this.handleClick);
    document.addEventListener('dblclick', this.handleDblClick);
    document.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('scroll', this.handleScroll);
    console.log('[UnifiedTracker] Mouse tracking initialized');
  }

  /**
   * Detach all event listeners
   */
  private detachListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('dblclick', this.handleDblClick);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('scroll', this.handleScroll);
  }

  /**
   * Classify a key into privacy-preserving groups
   */
  private classifyKey(key: string): KeyGroup {
    if (key === 'Backspace') return 'backspace';
    if (key === 'Enter') return 'enter';
    if (/^[a-zA-Z]$/.test(key)) return 'letter';
    if (/^[0-9]$/.test(key)) return 'number';
    return 'other';
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    this.keystrokeEvents.push({
      timestamp: Date.now(),
      eventType: 'keydown',
      keyGroup: this.classifyKey(event.key),
    });
  };

  /**
   * Handle keyup events
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keystrokeEvents.push({
      timestamp: Date.now(),
      eventType: 'keyup',
      keyGroup: this.classifyKey(event.key),
    });
  };

  /**
   * Handle mouse move (debounced)
   */
  private handleMouseMove = (event: MouseEvent): void => {
    const now = Date.now();

    if (now - this.lastMouseMoveTime < this.mouseMoveDebounceMs) {
      return;
    }

    this.lastMouseMoveTime = now;

    this.mouseMoveEvents.push({
      timestamp: now,
      x: event.clientX,
      y: event.clientY,
    });

    this.lastMousePosition = { x: event.clientX, y: event.clientY };
  };

  /**
   * Handle click event
   */
  private handleClick = (event: MouseEvent): void => {
    this.clickEvents.push({
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY,
      eventType: 'click',
    });
  };

  /**
   * Handle double click event
   */
  private handleDblClick = (event: MouseEvent): void => {
    this.clickEvents.push({
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY,
      eventType: 'dblclick',
    });
  };

  /**
   * Handle mouse down event
   */
  private handleMouseDown = (event: MouseEvent): void => {
    this.clickEvents.push({
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY,
      eventType: 'mousedown',
    });
  };

  /**
   * Handle mouse up event
   */
  private handleMouseUp = (event: MouseEvent): void => {
    this.clickEvents.push({
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY,
      eventType: 'mouseup',
    });
  };

  /**
   * Handle scroll event
   */
  private handleScroll = (): void => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    const currentScrollPosition = maxScroll > 0 ? scrollTop / maxScroll : 0;

    const lastScroll = this.scrollEvents[this.scrollEvents.length - 1];
    const scrollDeltaY = lastScroll
      ? scrollTop - lastScroll.currentScrollPosition * maxScroll
      : 0;

    this.scrollEvents.push({
      timestamp: Date.now(),
      scrollDeltaY,
      currentScrollPosition,
    });
  };

  /**
   * Start the batch processing interval
   */
  private startBatchInterval(): void {
    this.batchInterval = window.setInterval(() => {
      this.processBatch();
    }, this.config.batchIntervalMs);
  }

  /**
   * Stop the batch processing interval
   */
  private stopBatchInterval(): void {
    if (this.batchInterval !== null) {
      window.clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
  }

  /**
   * Process and send the current batch
   */
  private async processBatch(): Promise<void> {
    const batchEndTime = Date.now();

    // Skip if no events
    if (
      this.keystrokeEvents.length === 0 &&
      this.mouseMoveEvents.length === 0 &&
      this.clickEvents.length === 0 &&
      this.scrollEvents.length === 0 &&
      this.gazeEvents.length === 0
    ) {
      this.batchStartTime = batchEndTime;
      return;
    }

    const metrics = this.computeBatchMetrics(this.batchStartTime, batchEndTime);

    // Clear buffers
    this.keystrokeEvents = [];
    this.mouseMoveEvents = [];
    this.clickEvents = [];
    this.scrollEvents = [];
    this.gazeEvents = [];

    // Reset batch start time
    this.batchStartTime = batchEndTime;

    // Send to backend
    await this.sendMetrics(metrics);
  }

  /**
   * Compute comprehensive batch metrics
   */
  private computeBatchMetrics(startTime: number, endTime: number): BatchMetrics {
    return {
      userId: this.config.userId,
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date(endTime).toISOString(),
      keyboard: this.computeKeyboardMetrics(),
      mouse: this.computeMouseMetrics(),
      scroll: this.computeScrollMetrics(),
      gaze: this.computeGazeMetrics(),
      page: {
        url: window.location.href,
        domain: window.location.hostname,
      },
    };
  }

  /**
   * Compute keyboard metrics including keystroke dynamics
   */
  private computeKeyboardMetrics() {
    const keyDownEvents = this.keystrokeEvents.filter((e) => e.eventType === 'keydown');
    const keyUpEvents = this.keystrokeEvents.filter((e) => e.eventType === 'keyup');

    const keyPressCount = keyDownEvents.length;
    const backspaceCount = keyDownEvents.filter((e) => e.keyGroup === 'backspace').length;
    const enterCount = keyDownEvents.filter((e) => e.keyGroup === 'enter').length;

    // Compute inter-key intervals (DD - down to down)
    const downDownIntervals: number[] = [];
    for (let i = 1; i < keyDownEvents.length; i++) {
      downDownIntervals.push(keyDownEvents[i].timestamp - keyDownEvents[i - 1].timestamp);
    }

    // Compute hold times (H - keydown to keyup)
    const holdTimes: number[] = [];
    for (const downEvent of keyDownEvents) {
      const upEvent = keyUpEvents.find(
        (up) =>
          up.timestamp > downEvent.timestamp &&
          up.keyGroup === downEvent.keyGroup &&
          up.timestamp - downEvent.timestamp < 1000 // reasonable hold time
      );
      if (upEvent) {
        holdTimes.push(upEvent.timestamp - downEvent.timestamp);
      }
    }

    // Compute up-down intervals (UD - keyup to next keydown)
    const upDownIntervals: number[] = [];
    for (let i = 0; i < keyUpEvents.length; i++) {
      const upEvent = keyUpEvents[i];
      const nextDownEvent = keyDownEvents.find((down) => down.timestamp > upEvent.timestamp);
      if (nextDownEvent) {
        upDownIntervals.push(nextDownEvent.timestamp - upEvent.timestamp);
      }
    }

    const meanInterKeyIntervalMs =
      downDownIntervals.length > 0
        ? downDownIntervals.reduce((a, b) => a + b, 0) / downDownIntervals.length
        : 0;

    const stdInterKeyIntervalMs =
      downDownIntervals.length > 1 ? this.computeStdDev(downDownIntervals) : 0;

    return {
      keyPressCount,
      backspaceCount,
      enterCount,
      meanInterKeyIntervalMs,
      stdInterKeyIntervalMs,
      holdTimes,
      downDownIntervals,
      upDownIntervals,
    };
  }

  /**
   * Compute mouse metrics
   */
  private computeMouseMetrics() {
    const moveEventCount = this.mouseMoveEvents.length;
    const speeds: number[] = [];
    let totalDistance = 0;

    for (let i = 1; i < this.mouseMoveEvents.length; i++) {
      const prev = this.mouseMoveEvents[i - 1];
      const curr = this.mouseMoveEvents[i];
      const timeDelta = (curr.timestamp - prev.timestamp) / 1000;

      if (timeDelta > 0) {
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        totalDistance += distance;
        const speed = distance / timeDelta;
        speeds.push(speed);
      }
    }

    const meanSpeedPxPerSec = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const stdSpeedPxPerSec = speeds.length > 1 ? this.computeStdDev(speeds) : 0;

    const clickCount = this.clickEvents.filter((e) => e.eventType === 'click').length;
    const dblclickCount = this.clickEvents.filter((e) => e.eventType === 'dblclick').length;

    return {
      moveEventCount,
      meanSpeedPxPerSec,
      stdSpeedPxPerSec,
      totalDistancePx: totalDistance,
      clickCount,
      dblclickCount,
    };
  }

  /**
   * Compute scroll metrics
   */
  private computeScrollMetrics() {
    const scrollEventCount = this.scrollEvents.length;
    const scrollSpeeds: number[] = [];
    let upScrollCount = 0;

    for (let i = 1; i < this.scrollEvents.length; i++) {
      const prev = this.scrollEvents[i - 1];
      const curr = this.scrollEvents[i];
      const timeDelta = (curr.timestamp - prev.timestamp) / 1000;

      if (timeDelta > 0) {
        const speed = Math.abs(curr.scrollDeltaY) / timeDelta;
        scrollSpeeds.push(speed);
      }

      if (curr.scrollDeltaY < 0) {
        upScrollCount++;
      }
    }

    const meanScrollSpeed =
      scrollSpeeds.length > 0 ? scrollSpeeds.reduce((a, b) => a + b, 0) / scrollSpeeds.length : 0;

    const upScrollFraction = scrollEventCount > 0 ? upScrollCount / scrollEventCount : 0;

    return {
      scrollEventCount,
      meanScrollSpeed,
      upScrollFraction,
    };
  }

  /**
   * Compute gaze metrics from WebGazer data
   */
  private computeGazeMetrics() {
    if (!this.config.enableEyeTracking || this.gazeEvents.length === 0) {
      return null;
    }

    const gazeEventCount = this.gazeEvents.length;

    // Detect fixations (gaze staying in similar location)
    const fixations = this.detectFixations(this.gazeEvents);
    const meanFixationDurationMs =
      fixations.length > 0
        ? fixations.reduce((sum, f) => sum + f.duration, 0) / fixations.length
        : 0;

    // Detect saccades (rapid eye movements between fixations)
    const saccades = this.detectSaccades(this.gazeEvents);
    const saccadeCount = saccades.length;
    const meanSaccadeLengthPx =
      saccades.length > 0
        ? saccades.reduce((sum, s) => sum + s.length, 0) / saccades.length
        : 0;

    // Return subset of gaze points to avoid huge payloads
    const gazePoints = this.gazeEvents
      .filter((_, i) => i % 10 === 0) // Sample every 10th point
      .map((e) => ({ x: e.x, y: e.y, timestamp: e.timestamp }));

    return {
      gazeEventCount,
      meanFixationDurationMs,
      saccadeCount,
      meanSaccadeLengthPx,
      gazePoints,
    };
  }

  /**
   * Detect fixations in gaze data
   * (Simple algorithm: group consecutive gaze points within small radius)
   */
  private detectFixations(gazeEvents: GazeEvent[]): Array<{ duration: number }> {
    const fixations: Array<{ duration: number }> = [];
    const fixationRadius = 50; // pixels
    const minFixationDuration = 100; // ms

    let currentFixation: { startTime: number; x: number; y: number } | null = null;

    for (const gaze of gazeEvents) {
      if (!currentFixation) {
        currentFixation = { startTime: gaze.timestamp, x: gaze.x, y: gaze.y };
        continue;
      }

      const distance = Math.sqrt(
        Math.pow(gaze.x - currentFixation.x, 2) + Math.pow(gaze.y - currentFixation.y, 2)
      );

      if (distance <= fixationRadius) {
        // Still in same fixation, update position (running average)
        currentFixation.x = (currentFixation.x + gaze.x) / 2;
        currentFixation.y = (currentFixation.y + gaze.y) / 2;
      } else {
        // Fixation ended
        const duration = gaze.timestamp - currentFixation.startTime;
        if (duration >= minFixationDuration) {
          fixations.push({ duration });
        }
        currentFixation = { startTime: gaze.timestamp, x: gaze.x, y: gaze.y };
      }
    }

    // Handle last fixation
    if (currentFixation) {
      const duration =
        gazeEvents[gazeEvents.length - 1].timestamp - currentFixation.startTime;
      if (duration >= minFixationDuration) {
        fixations.push({ duration });
      }
    }

    return fixations;
  }

  /**
   * Detect saccades (rapid movements between fixations)
   */
  private detectSaccades(gazeEvents: GazeEvent[]): Array<{ length: number }> {
    const saccades: Array<{ length: number }> = [];
    const saccadeThreshold = 100; // pixels

    for (let i = 1; i < gazeEvents.length; i++) {
      const prev = gazeEvents[i - 1];
      const curr = gazeEvents[i];
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );

      if (distance > saccadeThreshold) {
        saccades.push({ length: distance });
      }
    }

    return saccades;
  }

  /**
   * Compute standard deviation
   */
  private computeStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Send metrics to backend API
   */
  private async sendMetrics(metrics: BatchMetrics): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics),
      });

      if (!response.ok) {
        console.error('[UnifiedTracker] Failed to send metrics:', response.statusText);
      } else {
        console.log('[UnifiedTracker] Metrics sent successfully');
      }
    } catch (error) {
      console.error('[UnifiedTracker] Error sending metrics:', error);
    }
  }
}

/**
 * Factory function to create and start tracker
 */
export async function createUnifiedTracker(
  config: TrackerConfig
): Promise<UnifiedCognitiveTracker> {
  const tracker = new UnifiedCognitiveTracker(config);
  await tracker.start();
  return tracker;
}
