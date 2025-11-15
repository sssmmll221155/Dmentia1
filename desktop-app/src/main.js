/**
 * Cognitive Tracker Desktop App
 * System-wide keyboard, mouse, and application tracking
 */

const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const { uIOhook } = require('uiohook-napi');
const Store = require('electron-store');
const axios = require('axios');
const { machineIdSync } = require('node-machine-id');

// Configuration store
const store = new Store();

// Global state
let mainWindow = null;
let tray = null;
let isTracking = false;
let userId = null;

// Event buffers (same as web tracker)
const eventBuffers = {
  keyboard: [],
  mouse: [],
  scroll: [],
  lastKeyTimestamp: null,
  lastMousePosition: null,
  lastMouseMoveTime: 0,
  batchStartTime: Date.now()
};

// Configuration
const CONFIG = {
  apiBaseUrl: store.get('apiBaseUrl', 'http://localhost:3000'),
  batchIntervalMs: store.get('batchIntervalMs', 10000),
  mouseMoveDebounceMs: 50
};

/**
 * Create main window (hidden by default, runs in system tray)
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // Show window on startup
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'dashboard-new.html'));

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

/**
 * Create system tray icon
 */
function createTray() {
  // Skip tray if icon doesn't exist (cosmetic feature)
  try {
    tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
  } catch (e) {
    console.log('[Desktop] Tray icon not found - continuing without tray');
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Cognitive Tracker',
      enabled: false
    },
    { type: 'separator' },
    {
      label: isTracking ? 'Tracking Active ✓' : 'Tracking Paused',
      enabled: false
    },
    {
      label: isTracking ? 'Pause Tracking' : 'Start Tracking',
      click: toggleTracking
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Settings',
      click: openSettings
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Cognitive Tracker');
}

/**
 * Initialize user ID
 */
function initializeUserId() {
  userId = store.get('userId');

  if (!userId) {
    // Generate unique user ID from machine ID
    const machineId = machineIdSync();
    userId = `user-${machineId}`;
    store.set('userId', userId);
  }

  console.log('[Desktop] User ID:', userId);
}

/**
 * Start system-wide tracking with uiohook-napi
 */
function startTracking() {
  if (isTracking) return;

  console.log('[Desktop] Starting system-wide tracking...');
  isTracking = true;

  // Keyboard events
  uIOhook.on('keydown', handleKeyDown);
  uIOhook.on('keyup', handleKeyUp);

  // Mouse events
  uIOhook.on('mousemove', handleMouseMove);
  uIOhook.on('click', handleMouseClick);
  uIOhook.on('wheel', handleMouseWheel);

  // Start uIOhook
  uIOhook.start();

  // Start batch interval
  startBatchInterval();

  updateTrayMenu();
  console.log('[Desktop] Tracking started');
}

/**
 * Stop tracking
 */
function stopTracking() {
  if (!isTracking) return;

  console.log('[Desktop] Stopping tracking...');
  isTracking = false;

  uIOhook.stop();
  stopBatchInterval();

  updateTrayMenu();
  console.log('[Desktop] Tracking stopped');
}

/**
 * Toggle tracking on/off
 */
function toggleTracking() {
  if (isTracking) {
    stopTracking();
  } else {
    startTracking();
  }
}

/**
 * Handle keydown events
 */
function handleKeyDown(event) {
  const timestamp = Date.now();
  const keyGroup = classifyKey(event.keycode);

  eventBuffers.keyboard.push({
    timestamp,
    eventType: 'keydown',
    keyGroup
  });

  eventBuffers.lastKeyTimestamp = timestamp;
}

/**
 * Handle keyup events
 */
function handleKeyUp(event) {
  const timestamp = Date.now();
  const keyGroup = classifyKey(event.keycode);

  eventBuffers.keyboard.push({
    timestamp,
    eventType: 'keyup',
    keyGroup
  });
}

/**
 * Classify keyboard key into privacy-preserving groups
 */
function classifyKey(keycode) {
  // Backspace
  if (keycode === 14) return 'backspace';

  // Enter
  if (keycode === 28) return 'enter';

  // Letters (A-Z)
  if (keycode >= 30 && keycode <= 50) return 'letter';

  // Numbers (0-9)
  if ((keycode >= 2 && keycode <= 11) || (keycode >= 71 && keycode <= 83)) {
    return 'number';
  }

  return 'other';
}

/**
 * Handle mouse move (debounced)
 */
function handleMouseMove(event) {
  const now = Date.now();

  // Debounce
  if (now - eventBuffers.lastMouseMoveTime < CONFIG.mouseMoveDebounceMs) {
    return;
  }

  eventBuffers.lastMouseMoveTime = now;

  eventBuffers.mouse.push({
    timestamp: now,
    x: event.x,
    y: event.y,
    type: 'move'
  });

  eventBuffers.lastMousePosition = { x: event.x, y: event.y };
}

/**
 * Handle mouse click
 */
function handleMouseClick(event) {
  eventBuffers.mouse.push({
    timestamp: Date.now(),
    x: event.x,
    y: event.y,
    type: event.type === 1 ? 'click' : 'dblclick',
    button: event.button
  });
}

/**
 * Handle mouse wheel (scroll)
 */
function handleMouseWheel(event) {
  eventBuffers.scroll.push({
    timestamp: Date.now(),
    rotation: event.rotation,
    direction: event.direction
  });
}

/**
 * Batch interval
 */
let batchInterval = null;

function startBatchInterval() {
  batchInterval = setInterval(() => {
    processBatch();
  }, CONFIG.batchIntervalMs);
}

function stopBatchInterval() {
  if (batchInterval) {
    clearInterval(batchInterval);
    batchInterval = null;
  }
}

/**
 * Process and send batch
 */
async function processBatch() {
  const batchEndTime = Date.now();

  // Skip if no events
  if (
    eventBuffers.keyboard.length === 0 &&
    eventBuffers.mouse.length === 0 &&
    eventBuffers.scroll.length === 0
  ) {
    eventBuffers.batchStartTime = batchEndTime;
    return;
  }

  const metrics = computeBatchMetrics(eventBuffers.batchStartTime, batchEndTime);

  // Clear buffers
  eventBuffers.keyboard = [];
  eventBuffers.mouse = [];
  eventBuffers.scroll = [];
  eventBuffers.batchStartTime = batchEndTime;

  // Send to backend
  await sendMetrics(metrics);

  // Notify dashboard
  if (mainWindow) {
    mainWindow.webContents.send('batch-sent', metrics);
  }
}

/**
 * Compute batch metrics (same logic as web tracker)
 */
function computeBatchMetrics(startTime, endTime) {
  // Keyboard metrics
  const keyDownEvents = eventBuffers.keyboard.filter(e => e.eventType === 'keydown');
  const keyUpEvents = eventBuffers.keyboard.filter(e => e.eventType === 'keyup');

  const keyPressCount = keyDownEvents.length;
  const backspaceCount = keyDownEvents.filter(e => e.keyGroup === 'backspace').length;
  const enterCount = keyDownEvents.filter(e => e.keyGroup === 'enter').length;

  // Inter-key intervals (DD)
  const downDownIntervals = [];
  for (let i = 1; i < keyDownEvents.length; i++) {
    downDownIntervals.push(keyDownEvents[i].timestamp - keyDownEvents[i - 1].timestamp);
  }

  // Hold times (H)
  const holdTimes = [];
  for (const downEvent of keyDownEvents) {
    const upEvent = keyUpEvents.find(
      up => up.timestamp > downEvent.timestamp &&
           up.keyGroup === downEvent.keyGroup &&
           up.timestamp - downEvent.timestamp < 1000
    );
    if (upEvent) {
      holdTimes.push(upEvent.timestamp - downEvent.timestamp);
    }
  }

  // Up-down intervals (UD)
  const upDownIntervals = [];
  for (let i = 0; i < keyUpEvents.length; i++) {
    const upEvent = keyUpEvents[i];
    const nextDownEvent = keyDownEvents.find(down => down.timestamp > upEvent.timestamp);
    if (nextDownEvent) {
      upDownIntervals.push(nextDownEvent.timestamp - upEvent.timestamp);
    }
  }

  const meanInterKeyIntervalMs = downDownIntervals.length > 0
    ? downDownIntervals.reduce((a, b) => a + b, 0) / downDownIntervals.length
    : 0;

  const stdInterKeyIntervalMs = downDownIntervals.length > 1
    ? computeStdDev(downDownIntervals)
    : 0;

  // Mouse metrics
  const mouseMoveEvents = eventBuffers.mouse.filter(e => e.type === 'move');
  const mouseClickEvents = eventBuffers.mouse.filter(e => e.type === 'click');

  const speeds = [];
  let totalDistance = 0;

  for (let i = 1; i < mouseMoveEvents.length; i++) {
    const prev = mouseMoveEvents[i - 1];
    const curr = mouseMoveEvents[i];
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

  const meanSpeedPxPerSec = speeds.length > 0
    ? speeds.reduce((a, b) => a + b, 0) / speeds.length
    : 0;

  const stdSpeedPxPerSec = speeds.length > 1
    ? computeStdDev(speeds)
    : 0;

  // Scroll metrics
  const scrollEventCount = eventBuffers.scroll.length;
  let upScrollCount = 0;

  for (const scroll of eventBuffers.scroll) {
    if (scroll.rotation < 0) upScrollCount++;
  }

  const upScrollFraction = scrollEventCount > 0
    ? upScrollCount / scrollEventCount
    : 0;

  // Get active application (if available)
  const activeApp = process.platform === 'darwin'
    ? 'Unknown' // Would need native module
    : 'Unknown';

  return {
    userId,
    startedAt: new Date(startTime).toISOString(),
    endedAt: new Date(endTime).toISOString(),
    keyboard: {
      keyPressCount,
      backspaceCount,
      enterCount,
      meanInterKeyIntervalMs,
      stdInterKeyIntervalMs,
      holdTimes,
      downDownIntervals,
      upDownIntervals
    },
    mouse: {
      moveEventCount: mouseMoveEvents.length,
      meanSpeedPxPerSec,
      stdSpeedPxPerSec,
      totalDistancePx: totalDistance,
      clickCount: mouseClickEvents.length,
      dblclickCount: 0
    },
    scroll: {
      scrollEventCount,
      meanScrollSpeed: 0, // Would need to compute from rotation
      upScrollFraction
    },
    gaze: null, // Desktop app doesn't do gaze tracking (yet)
    page: {
      url: `desktop://${activeApp}`,
      domain: 'desktop'
    }
  };
}

/**
 * Compute standard deviation
 */
function computeStdDev(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Send metrics to backend API
 */
async function sendMetrics(metrics) {
  try {
    await axios.post(`${CONFIG.apiBaseUrl}/api/metrics`, metrics, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('[Desktop] Metrics sent successfully');
  } catch (error) {
    console.error('[Desktop] Failed to send metrics:', error.message);
  }
}

/**
 * Update tray menu
 */
function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Cognitive Tracker',
      enabled: false
    },
    { type: 'separator' },
    {
      label: isTracking ? 'Tracking Active ✓' : 'Tracking Paused',
      enabled: false
    },
    {
      label: isTracking ? 'Pause Tracking' : 'Start Tracking',
      click: toggleTracking
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Settings',
      click: openSettings
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Open settings window
 */
function openSettings() {
  // TODO: Implement settings window
  console.log('[Desktop] Settings clicked');
}

/**
 * App lifecycle
 */
app.whenReady().then(() => {
  initializeUserId();
  createWindow();
  createTray();

  // Auto-start tracking
  startTracking();
});

app.on('window-all-closed', () => {
  // Keep app running in system tray
});

app.on('before-quit', () => {
  stopTracking();
});

// IPC handlers for dashboard
ipcMain.handle('get-config', () => CONFIG);
ipcMain.handle('get-tracking-status', () => isTracking);
ipcMain.handle('toggle-tracking', () => {
  toggleTracking();
  return isTracking;
});
