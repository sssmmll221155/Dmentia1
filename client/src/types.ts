/**
 * Configuration for the cognitive tracker
 */
export interface TrackerConfig {
  userId: string;
  apiBaseUrl: string;
  batchIntervalMs: number;
}

/**
 * Key groups for categorizing keyboard events
 */
export type KeyGroup = 'letter' | 'number' | 'backspace' | 'enter' | 'other';

/**
 * Internal event structures for buffering
 */
export interface KeyboardEvent {
  timestamp: number;
  eventType: 'keydown' | 'keyup';
  keyGroup: KeyGroup;
}

export interface MouseMoveEvent {
  timestamp: number;
  x: number;
  y: number;
}

export interface ClickEvent {
  timestamp: number;
  x: number;
  y: number;
}

export interface ScrollEvent {
  timestamp: number;
  scrollDeltaY: number;
  currentScrollPosition: number; // 0 to 1
}

/**
 * Batch metrics payload sent to backend
 */
export interface BatchMetrics {
  userId: string;
  startedAt: string; // ISO timestamp
  endedAt: string; // ISO timestamp
  keyboard: {
    keyPressCount: number;
    backspaceCount: number;
    meanInterKeyIntervalMs: number;
    stdInterKeyIntervalMs: number;
  };
  mouse: {
    moveEventCount: number;
    meanSpeedPxPerSec: number;
  };
  scroll: {
    scrollEventCount: number;
    meanScrollSpeed: number;
    upScrollFraction: number;
  };
  page: {
    url: string;
    domain: string;
  };
}
