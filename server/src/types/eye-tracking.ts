/**
 * Eye Tracking Types
 * Type definitions for detailed eye tracking metrics
 */

export interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface FixationEvent {
  timestamp: number;
  x: number;
  y: number;
  durationMs: number;
  regionId?: string;
}

export interface SaccadeEvent {
  timestamp: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  velocityPxPerSec: number;
  amplitudePx: number;
  durationMs: number;
}

export type ReadingDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'irregular';

export interface ReadingPattern {
  timestamp: number;
  direction: ReadingDirection;
  speedWordsPerMin?: number;
  lineCount: number;
  regressionCount: number;
}

export interface RereadingEvent {
  regionId: string;
  visitCount: number;
  timestamps: number[];
  totalDurationMs: number;
}

export interface RegionFocus {
  regionId: string;
  regionLabel?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  focusDurationMs: number;
  fixationCount: number;
  firstVisitTimestamp: number;
  lastVisitTimestamp: number;
}

export interface GazeMetrics {
  gazeEventCount: number;
  meanFixationDurationMs: number;
  saccadeCount: number;
  meanSaccadeLengthPx: number;
  gazePoints: GazePoint[];
  fixations?: FixationEvent[];
  saccades?: SaccadeEvent[];
  readingPatterns?: ReadingPattern[];
  rereadingEvents?: RereadingEvent[];
  regionFocuses?: RegionFocus[];
}

export interface KeyboardMetrics {
  keyPressCount: number;
  backspaceCount: number;
  enterCount: number;
  meanInterKeyIntervalMs: number;
  stdInterKeyIntervalMs: number;
  holdTimes: number[];
  downDownIntervals: number[];
  upDownIntervals: number[];
}

export interface MouseMetrics {
  moveEventCount: number;
  meanSpeedPxPerSec: number;
  stdSpeedPxPerSec: number;
  totalDistancePx: number;
  clickCount: number;
  dblclickCount: number;
}

export interface ScrollMetrics {
  scrollEventCount: number;
  meanScrollSpeed: number;
  upScrollFraction: number;
}

export interface PageContext {
  url: string;
  domain: string;
}

export interface BatchMetricsPayload {
  userId: string;
  startedAt: string;
  endedAt: string;
  keyboard: KeyboardMetrics;
  mouse: MouseMetrics;
  scroll: ScrollMetrics;
  gaze: GazeMetrics | null;
  page: PageContext;
}

// API Response Types

export interface BatchMetricsResponse {
  success: boolean;
  batchId?: string;
  error?: string;
  details?: any[];
}

export interface EyeTrackingDataResponse {
  success: boolean;
  data?: {
    batchId: string;
    userId: string;
    startedAt: string;
    endedAt: string;
    url: string;
    domain: string;
    gazeEvents: Array<{
      id: string;
      batchId: string;
      timestamp: bigint;
      x: number;
      y: number;
    }>;
    fixationEvents: Array<{
      id: string;
      batchId: string;
      timestamp: bigint;
      x: number;
      y: number;
      durationMs: number;
      regionId: string | null;
    }>;
    saccadeEvents: Array<{
      id: string;
      batchId: string;
      timestamp: bigint;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      velocityPxPerSec: number;
      amplitudePx: number;
      durationMs: number;
    }>;
    readingPatterns: Array<{
      id: string;
      batchId: string;
      timestamp: bigint;
      direction: string;
      speedWordsPerMin: number | null;
      lineCount: number;
      regressionCount: number;
    }>;
    rereadingEvents: Array<{
      id: string;
      batchId: string;
      regionId: string;
      visitCount: number;
      timestamps: number[];
      totalDurationMs: number;
    }>;
    regionFocuses: Array<{
      id: string;
      batchId: string;
      regionId: string;
      regionLabel: string | null;
      x: number;
      y: number;
      width: number;
      height: number;
      focusDurationMs: number;
      fixationCount: number;
      firstVisitTimestamp: bigint;
      lastVisitTimestamp: bigint;
    }>;
  };
  error?: string;
}

export interface RegionFocusStats {
  regionId: string;
  regionLabel: string | null;
  totalFocusDurationMs: number;
  totalFixations: number;
  occurrences: number;
  avgFocusDurationMs: number;
  avgFixationsPerOccurrence: number;
}

export interface RereadingEventStats {
  regionId: string;
  totalVisits: number;
  totalDurationMs: number;
  occurrences: number;
  avgVisitsPerOccurrence: number;
  avgDurationMsPerOccurrence: number;
}

export interface EyeTrackingAnalysisResponse {
  success: boolean;
  data?: {
    dateRange: {
      start: string;
      end: string;
    };
    totalBatches: number;
    fixations: {
      total: number;
      avgDurationMs: number;
    };
    saccades: {
      total: number;
      avgVelocityPxPerSec: number;
      avgAmplitudePx: number;
    };
    readingPatterns: {
      total: number;
      directions: Record<string, number>;
      avgSpeedWordsPerMin: number;
    };
    regionFocuses: RegionFocusStats[];
    rereadingEvents: RereadingEventStats[];
  };
  error?: string;
}

// Utility Types

export interface ScreenRegion {
  id: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GazeCoordinate {
  x: number;
  y: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

// Helper Functions Type Definitions

export type CalculateDistance = (from: GazeCoordinate, to: GazeCoordinate) => number;
export type CalculateVelocity = (distance: number, durationMs: number) => number;
export type DetectRegion = (x: number, y: number, regions: ScreenRegion[]) => string | null;
export type ClassifyReadingDirection = (fixations: FixationEvent[]) => ReadingDirection;
export type EstimateReadingSpeed = (fixations: FixationEvent[], textLength: number) => number;
