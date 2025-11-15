/**
 * Cognitive Tracker - Browser-based passive cognitive monitoring
 *
 * This module can be used in any web page or as part of a Chrome extension
 * content script to track user interactions and send aggregated metrics
 * to a backend API.
 */

export { CognitiveTracker, createTracker } from './tracker';
export type {
  TrackerConfig,
  KeyGroup,
  BatchMetrics,
} from './types';
