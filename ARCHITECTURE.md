# Cognitive Tracking System - Integration Architecture

## Overview

This system passively monitors user behavior in the browser to detect possible early cognitive or memory decline through multi-modal data collection:

1. **Eye Tracking** (WebGazer.js) - Gaze patterns, attention, reading behavior
2. **Advanced Vision** (MediaPipe) - Hand tracking (tremors), iris tracking (precise gaze), facial expressions
3. **Mouse Tracking** (MKLogger) - Movement patterns, speed, precision
4. **Keystroke Dynamics** (keystroke-biometrics approach) - Typing rhythm, timing variations

## System Components

### 1. Cloned Repositories

#### WebGazer.js (`/WebGazer`)
- **Purpose**: Real-time webcam-based eye tracking
- **Key Features**:
  - Returns x,y gaze coordinates in real-time
  - Self-calibrates from user clicks/movements
  - Privacy-preserving (runs client-side, no video upload)
- **Integration**: Use `setGazeListener()` to collect gaze coordinates

#### MKLogger (`/MKLogger`)
- **Purpose**: Mouse and keyboard event logging
- **Key Features**:
  - Mouse distance and travel calculations
  - Click tracking
  - Keyboard event logging (needs privacy modification)
- **Integration**: Adapt to privacy-preserving key groups instead of actual keycodes

#### keystroke-biometrics (`/keystroke-biometrics`)
- **Purpose**: Keystroke timing analysis for biometric classification
- **Key Metrics**:
  - **H (Hold time)**: Duration from keydown to keyup
  - **DD (Down-Down)**: Interval between consecutive keydowns
  - **UD (Up-Down)**: Time from keyup to next keydown
- **Integration**: Use timing approach, but for cognitive tracking not authentication

#### MediaPipe (`/mediapipe`)
- **Purpose**: Advanced computer vision for multimodal tracking
- **Key Features**:
  - **Hand Tracking**: Detect hand landmarks, tremors, fine motor control
  - **Iris Tracking**: More precise gaze estimation than WebGazer alone
  - **Face Mesh**: 468 facial landmarks for expression analysis
  - **Holistic**: Combined face, hands, and pose tracking
- **Integration**: Use web SDK for browser-based hand tremor detection and enhanced gaze tracking

### 2. Data Collection Layer (`/integration`)

A unified TypeScript module that:
- Initializes all tracking components
- Collects data from each source
- Batches and aggregates metrics locally
- Sends to backend API

### 3. Backend API (`/server`)

Node.js + Express + Postgres backend that:
- Receives batched metrics from browser
- Stores in normalized database schema
- Computes daily summaries
- Tracks baseline and deviations per user

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  WebGazer.js │  │   MKLogger   │  │  Keystroke   │  │
│  │ (Eye Gaze)   │  │ (Mouse/Keys) │  │  Dynamics    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│         └─────────────────┼─────────────────┘           │
│                           │                             │
│                  ┌────────▼────────┐                    │
│                  │  Unified Tracker│                    │
│                  │  (Integration)  │                    │
│                  └────────┬────────┘                    │
│                           │                             │
│                           │ Batch every 10s             │
│                           │                             │
└───────────────────────────┼─────────────────────────────┘
                            │
                            │ POST /api/metrics
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (Server)                       │
│                                                          │
│                  ┌────────────────┐                      │
│                  │  Express API   │                      │
│                  └────────┬───────┘                      │
│                           │                              │
│                           ▼                              │
│                  ┌────────────────┐                      │
│                  │    Postgres    │                      │
│                  │   - MetricsBatch                      │
│                  │   - GazeEvents                        │
│                  │   - DailySummary                      │
│                  └────────────────┘                      │
│                           │                              │
│                           ▼                              │
│                  ┌────────────────┐                      │
│                  │ Daily Summarizer│                     │
│                  │  (Cron Job)     │                     │
│                  └────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### MetricsBatch
Stores aggregated batch-level metrics (every 10 seconds):
- userId
- timestamps (startedAt, endedAt)
- keyboard metrics (counts, mean/std timing)
- mouse metrics (speed, distance)
- scroll metrics
- page info (url, domain)

### GazeEvents
Stores eye tracking data:
- userId
- batchId (foreign key to MetricsBatch)
- gazePoints (array of {x, y, timestamp})
- aggregated gaze metrics (fixation duration, saccade count, etc.)

### KeystrokeTiming
Stores detailed keystroke timing for rhythm analysis:
- userId
- batchId
- holdTimes (array of H values)
- downDownIntervals (array of DD values)
- upDownIntervals (array of UD values)

### DailySummary
Daily aggregation per user:
- All keyboard/mouse/scroll averages
- Gaze pattern metrics
- Keystroke rhythm variability
- Baseline comparison scores

## Privacy Considerations

1. **No Raw Content**: Never store actual typed text, only timing and categories
2. **Key Grouping**: Classify keys as letter/number/backspace/enter/other
3. **Client-side Processing**: WebGazer runs entirely in browser
4. **Aggregation**: Store pre-computed metrics, not raw events
5. **Domain Only**: Track domain, not full URLs with query params (optional)

## Metrics for Cognitive Decline Detection

### From Eye Tracking
- Fixation duration variability
- Saccade speed and accuracy
- Reading pattern disruption
- Attention span indicators

### From Keystroke Dynamics
- Typing rhythm variability (std of inter-key intervals)
- Error rate (backspace frequency)
- Hold time inconsistency
- Fatigue patterns (typing slowing over time)

### From Mouse Movement
- Movement speed changes
- Precision/tremor indicators
- Hesitation patterns
- Click accuracy

### Combined Indicators
- Multi-modal coordination
- Time-of-day patterns
- Week-over-week baseline drift
- Task-switching efficiency

## Implementation Phases

### Phase 1: Integration Layer (Current)
- Build unified tracker that combines all components
- Ensure privacy-preserving data collection
- Implement batching and API communication

### Phase 2: Backend & Database
- Set up Postgres schema
- Implement API endpoints
- Build daily summarizer

### Phase 3: Baseline & Scoring
- Per-user baseline calculation
- Deviation detection algorithms
- Gentle notification system

### Phase 4: Dashboard (Future)
- User-friendly trends visualization
- Privacy-preserving reports
- Gentle language for notifications
