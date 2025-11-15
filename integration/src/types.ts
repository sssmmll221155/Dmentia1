/**
 * Unified Cognitive Tracker Types
 */

export interface TrackerConfig {
  userId: string;
  apiBaseUrl: string;
  batchIntervalMs: number;
  enableEyeTracking?: boolean;
  enableMouseTracking?: boolean;
  enableKeystrokeTracking?: boolean;
}

export type KeyGroup = 'letter' | 'number' | 'backspace' | 'enter' | 'other';

/**
 * Internal event structures
 */

// Keystroke timing events (for rhythm analysis)
export interface KeystrokeTimingEvent {
  timestamp: number;
  eventType: 'keydown' | 'keyup';
  keyGroup: KeyGroup;
}

// Mouse movement event
export interface MouseMoveEvent {
  timestamp: number;
  x: number;
  y: number;
}

// Click event
export interface ClickEvent {
  timestamp: number;
  x: number;
  y: number;
  eventType: 'click' | 'dblclick' | 'mousedown' | 'mouseup';
}

// Scroll event
export interface ScrollEvent {
  timestamp: number;
  scrollDeltaY: number;
  currentScrollPosition: number; // 0 to 1
}

// Gaze event (from WebGazer)
export interface GazeEvent {
  timestamp: number;
  x: number;
  y: number;
}

/**
 * Batch metrics payload sent to backend
 */
export interface BatchMetrics {
  userId: string;
  startedAt: string;
  endedAt: string;

  keyboard: {
    keyPressCount: number;
    backspaceCount: number;
    enterCount: number;
    // Inter-key intervals (time between consecutive keydowns)
    meanInterKeyIntervalMs: number;
    stdInterKeyIntervalMs: number;
    // Keystroke timing details (for rhythm analysis)
    holdTimes: number[]; // H: keydown to keyup duration
    downDownIntervals: number[]; // DD: between consecutive keydowns
    upDownIntervals: number[]; // UD: keyup to next keydown
  };

  mouse: {
    moveEventCount: number;
    meanSpeedPxPerSec: number;
    stdSpeedPxPerSec: number;
    totalDistancePx: number;
    clickCount: number;
    dblclickCount: number;
  };

  scroll: {
    scrollEventCount: number;
    meanScrollSpeed: number;
    upScrollFraction: number;
  };

  gaze: {
    gazeEventCount: number;
    meanFixationDurationMs: number;
    saccadeCount: number;
    meanSaccadeLengthPx: number;
    gazePoints: Array<{ x: number; y: number; timestamp: number }>;
  } | null;

  page: {
    url: string;
    domain: string;
  };
}
