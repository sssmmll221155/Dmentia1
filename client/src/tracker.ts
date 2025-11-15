import type {
  TrackerConfig,
  KeyGroup,
  KeyboardEvent,
  MouseMoveEvent,
  ClickEvent,
  ScrollEvent,
  BatchMetrics,
} from './types';

/**
 * CognitiveTracker - Passively tracks user interactions in the browser
 * and sends aggregated metrics to a backend API.
 */
export class CognitiveTracker {
  private config: TrackerConfig;
  private batchStartTime: number;

  // Event buffers
  private keyboardEvents: KeyboardEvent[] = [];
  private mouseMoveEvents: MouseMoveEvent[] = [];
  private clickEvents: ClickEvent[] = [];
  private scrollEvents: ScrollEvent[] = [];

  // State for computing deltas
  private lastKeyTimestamp: number | null = null;
  private lastMousePosition: { x: number; y: number } | null = null;

  // Interval handle
  private batchInterval: number | null = null;

  // Debounce tracking
  private lastMouseMoveTime = 0;
  private mouseMoveDebounceMs = 50; // Only capture mouse moves every 50ms

  constructor(config: TrackerConfig) {
    this.config = config;
    this.batchStartTime = Date.now();
  }

  /**
   * Start tracking user interactions
   */
  public start(): void {
    this.attachListeners();
    this.startBatchInterval();
    console.log('[CognitiveTracker] Started tracking');
  }

  /**
   * Stop tracking and clean up
   */
  public stop(): void {
    this.detachListeners();
    this.stopBatchInterval();
    console.log('[CognitiveTracker] Stopped tracking');
  }

  /**
   * Attach all event listeners
   */
  private attachListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('click', this.handleClick);
    window.addEventListener('scroll', this.handleScroll);
  }

  /**
   * Detach all event listeners
   */
  private detachListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('click', this.handleClick);
    window.removeEventListener('scroll', this.handleScroll);
  }

  /**
   * Classify a keyboard key into a group (privacy-preserving)
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
  private handleKeyDown = (event: globalThis.KeyboardEvent): void => {
    const timestamp = Date.now();
    const keyGroup = this.classifyKey(event.key);

    this.keyboardEvents.push({
      timestamp,
      eventType: 'keydown',
      keyGroup,
    });

    this.lastKeyTimestamp = timestamp;
  };

  /**
   * Handle keyup events
   */
  private handleKeyUp = (event: globalThis.KeyboardEvent): void => {
    const timestamp = Date.now();
    const keyGroup = this.classifyKey(event.key);

    this.keyboardEvents.push({
      timestamp,
      eventType: 'keyup',
      keyGroup,
    });
  };

  /**
   * Handle mousemove events (debounced)
   */
  private handleMouseMove = (event: globalThis.MouseEvent): void => {
    const now = Date.now();

    // Debounce to avoid overwhelming the system
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
   * Handle click events
   */
  private handleClick = (event: globalThis.MouseEvent): void => {
    this.clickEvents.push({
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY,
    });
  };

  /**
   * Handle scroll events
   */
  private handleScroll = (): void => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    // Compute scroll position as fraction (0 to 1)
    const currentScrollPosition = maxScroll > 0 ? scrollTop / maxScroll : 0;

    // Store the last scroll event to compute delta
    const lastScroll = this.scrollEvents[this.scrollEvents.length - 1];
    const scrollDeltaY = lastScroll
      ? scrollTop - (lastScroll.currentScrollPosition * maxScroll)
      : 0;

    this.scrollEvents.push({
      timestamp: Date.now(),
      scrollDeltaY,
      currentScrollPosition,
    });
  };

  /**
   * Start the batch interval timer
   */
  private startBatchInterval(): void {
    this.batchInterval = window.setInterval(() => {
      this.processBatch();
    }, this.config.batchIntervalMs);
  }

  /**
   * Stop the batch interval timer
   */
  private stopBatchInterval(): void {
    if (this.batchInterval !== null) {
      window.clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
  }

  /**
   * Process the current batch of events and send to backend
   */
  private async processBatch(): Promise<void> {
    const batchEndTime = Date.now();

    // Skip if there are no events
    if (
      this.keyboardEvents.length === 0 &&
      this.mouseMoveEvents.length === 0 &&
      this.clickEvents.length === 0 &&
      this.scrollEvents.length === 0
    ) {
      // Reset batch start time and continue
      this.batchStartTime = batchEndTime;
      return;
    }

    const metrics = this.computeBatchMetrics(this.batchStartTime, batchEndTime);

    // Clear buffers
    this.keyboardEvents = [];
    this.mouseMoveEvents = [];
    this.clickEvents = [];
    this.scrollEvents = [];

    // Reset batch start time
    this.batchStartTime = batchEndTime;

    // Send to backend
    await this.sendMetrics(metrics);
  }

  /**
   * Compute batch-level metrics from buffered events
   */
  private computeBatchMetrics(startTime: number, endTime: number): BatchMetrics {
    // Keyboard metrics
    const keyPressCount = this.keyboardEvents.filter(e => e.eventType === 'keydown').length;
    const backspaceCount = this.keyboardEvents.filter(
      e => e.eventType === 'keydown' && e.keyGroup === 'backspace'
    ).length;

    const interKeyIntervals: number[] = [];
    const keyDownEvents = this.keyboardEvents.filter(e => e.eventType === 'keydown');

    for (let i = 1; i < keyDownEvents.length; i++) {
      const interval = keyDownEvents[i].timestamp - keyDownEvents[i - 1].timestamp;
      interKeyIntervals.push(interval);
    }

    const meanInterKeyIntervalMs = interKeyIntervals.length > 0
      ? interKeyIntervals.reduce((a, b) => a + b, 0) / interKeyIntervals.length
      : 0;

    const stdInterKeyIntervalMs = interKeyIntervals.length > 1
      ? this.computeStdDev(interKeyIntervals)
      : 0;

    // Mouse metrics
    const moveEventCount = this.mouseMoveEvents.length;
    const mouseSpeeds: number[] = [];

    for (let i = 1; i < this.mouseMoveEvents.length; i++) {
      const prev = this.mouseMoveEvents[i - 1];
      const curr = this.mouseMoveEvents[i];
      const timeDelta = (curr.timestamp - prev.timestamp) / 1000; // seconds

      if (timeDelta > 0) {
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = distance / timeDelta; // px/sec
        mouseSpeeds.push(speed);
      }
    }

    const meanSpeedPxPerSec = mouseSpeeds.length > 0
      ? mouseSpeeds.reduce((a, b) => a + b, 0) / mouseSpeeds.length
      : 0;

    // Scroll metrics
    const scrollEventCount = this.scrollEvents.length;
    const scrollSpeeds: number[] = [];
    let upScrollCount = 0;

    for (let i = 1; i < this.scrollEvents.length; i++) {
      const prev = this.scrollEvents[i - 1];
      const curr = this.scrollEvents[i];
      const timeDelta = (curr.timestamp - prev.timestamp) / 1000; // seconds

      if (timeDelta > 0) {
        const speed = Math.abs(curr.scrollDeltaY) / timeDelta;
        scrollSpeeds.push(speed);
      }

      // Track upward scrolls (negative delta)
      if (curr.scrollDeltaY < 0) {
        upScrollCount++;
      }
    }

    const meanScrollSpeed = scrollSpeeds.length > 0
      ? scrollSpeeds.reduce((a, b) => a + b, 0) / scrollSpeeds.length
      : 0;

    const upScrollFraction = scrollEventCount > 0
      ? upScrollCount / scrollEventCount
      : 0;

    // Page info
    const url = window.location.href;
    const domain = window.location.hostname;

    return {
      userId: this.config.userId,
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date(endTime).toISOString(),
      keyboard: {
        keyPressCount,
        backspaceCount,
        meanInterKeyIntervalMs,
        stdInterKeyIntervalMs,
      },
      mouse: {
        moveEventCount,
        meanSpeedPxPerSec,
      },
      scroll: {
        scrollEventCount,
        meanScrollSpeed,
        upScrollFraction,
      },
      page: {
        url,
        domain,
      },
    };
  }

  /**
   * Compute standard deviation
   */
  private computeStdDev(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Send metrics to the backend API
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
        console.error('[CognitiveTracker] Failed to send metrics:', response.statusText);
      } else {
        console.log('[CognitiveTracker] Metrics sent successfully');
      }
    } catch (error) {
      console.error('[CognitiveTracker] Error sending metrics:', error);
    }
  }
}

/**
 * Factory function to create and start a tracker
 */
export function createTracker(config: TrackerConfig): CognitiveTracker {
  const tracker = new CognitiveTracker(config);
  tracker.start();
  return tracker;
}
