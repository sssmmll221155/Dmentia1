/**
 * Cognitive Tracker Desktop App - Demo Version
 *
 * Note: This demo version tracks within the Electron window.
 * For full system-wide tracking, iohook would need to be built from source.
 * This demonstrates the architecture and dashboard.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
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

// Event buffers
const eventBuffers = {
  keyboard: [],
  mouse: [],
  scroll: [],
  batchStartTime: Date.now()
};

// Configuration
const CONFIG = {
  apiBaseUrl: store.get('apiBaseUrl', 'http://localhost:3000'),
  batchIntervalMs: store.get('batchIntervalMs', 10000),
};

/**
 * Create main window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'dashboard.html'));

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Set up tracking within the window
  mainWindow.webContents.on('did-finish-load', () => {
    if (isTracking) {
      setupWindowTracking();
    }
  });
}

/**
 * Create system tray icon (placeholder since we don't have icon files)
 */
function createTray() {
  // For demo, we'll skip tray if icon doesn't exist
  try {
    tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
    updateTrayMenu();
    tray.setToolTip('Cognitive Tracker');
  } catch (e) {
    console.log('[Desktop] Tray icon not found - continuing without tray');
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
      label: 'Show Dashboard',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
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
 * Initialize user ID
 */
function initializeUserId() {
  userId = store.get('userId');

  if (!userId) {
    const machineId = machineIdSync();
    userId = `user-${machineId}`;
    store.set('userId', userId);
  }

  console.log('[Desktop] User ID:', userId);
}

/**
 * Start tracking
 */
function startTracking() {
  if (isTracking) return;

  console.log('[Desktop] Starting tracking...');
  isTracking = true;

  setupWindowTracking();
  startBatchInterval();

  updateTrayMenu();

  // Notify dashboard
  if (mainWindow) {
    mainWindow.webContents.send('tracking-status-changed', isTracking);
  }

  console.log('[Desktop] Tracking started (window-based demo)');
}

/**
 * Stop tracking
 */
function stopTracking() {
  if (!isTracking) return;

  console.log('[Desktop] Stopping tracking...');
  isTracking = false;

  stopBatchInterval();
  updateTrayMenu();

  // Notify dashboard
  if (mainWindow) {
    mainWindow.webContents.send('tracking-status-changed', isTracking);
  }

  console.log('[Desktop] Tracking stopped');
}

/**
 * Toggle tracking
 */
function toggleTracking() {
  if (isTracking) {
    stopTracking();
  } else {
    startTracking();
  }
}

/**
 * Set up tracking within the Electron window
 */
function setupWindowTracking() {
  mainWindow.webContents.executeJavaScript(`
    // Track keyboard events
    document.addEventListener('keydown', (e) => {
      window.electronAPI.trackKeyboard({
        timestamp: Date.now(),
        eventType: 'keydown',
        keyGroup: classifyKey(e.key)
      });
    });

    document.addEventListener('keyup', (e) => {
      window.electronAPI.trackKeyboard({
        timestamp: Date.now(),
        eventType: 'keyup',
        keyGroup: classifyKey(e.key)
      });
    });

    // Track mouse events
    document.addEventListener('mousemove', (e) => {
      window.electronAPI.trackMouse({
        timestamp: Date.now(),
        x: e.clientX,
        y: e.clientY,
        type: 'move'
      });
    });

    document.addEventListener('click', (e) => {
      window.electronAPI.trackMouse({
        timestamp: Date.now(),
        x: e.clientX,
        y: e.clientY,
        type: 'click'
      });
    });

    // Track scroll
    window.addEventListener('scroll', () => {
      window.electronAPI.trackScroll({
        timestamp: Date.now(),
        scrollTop: window.scrollY
      });
    });

    function classifyKey(key) {
      if (key === 'Backspace') return 'backspace';
      if (key === 'Enter') return 'enter';
      if (/^[a-zA-Z]$/.test(key)) return 'letter';
      if (/^[0-9]$/.test(key)) return 'number';
      return 'other';
    }

    console.log('[Tracker] Window tracking initialized');
  `);
}

// Batch interval
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
 * Compute batch metrics
 */
function computeBatchMetrics(startTime, endTime) {
  // Keyboard metrics
  const keyDownEvents = eventBuffers.keyboard.filter(e => e.eventType === 'keydown');
  const keyUpEvents = eventBuffers.keyboard.filter(e => e.eventType === 'keyup');

  const keyPressCount = keyDownEvents.length;
  const backspaceCount = keyDownEvents.filter(e => e.keyGroup === 'backspace').length;
  const enterCount = keyDownEvents.filter(e => e.keyGroup === 'enter').length;

  const downDownIntervals = [];
  for (let i = 1; i < keyDownEvents.length; i++) {
    downDownIntervals.push(keyDownEvents[i].timestamp - keyDownEvents[i - 1].timestamp);
  }

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
      scrollEventCount: eventBuffers.scroll.length,
      meanScrollSpeed: 0,
      upScrollFraction: 0
    },
    gaze: null,
    page: {
      url: 'desktop://demo-app',
      domain: 'desktop'
    }
  };
}

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

// IPC handlers
ipcMain.handle('get-config', () => ({ ...CONFIG, userId }));
ipcMain.handle('get-tracking-status', () => isTracking);
ipcMain.handle('toggle-tracking', () => {
  toggleTracking();
  return isTracking;
});

// Handle events from renderer
ipcMain.on('track-keyboard', (event, data) => {
  if (isTracking) {
    eventBuffers.keyboard.push(data);
  }
});

ipcMain.on('track-mouse', (event, data) => {
  if (isTracking) {
    eventBuffers.mouse.push(data);
  }
});

ipcMain.on('track-scroll', (event, data) => {
  if (isTracking) {
    eventBuffers.scroll.push(data);
  }
});

// App lifecycle
app.whenReady().then(() => {
  initializeUserId();
  createWindow();
  createTray();

  // Auto-start tracking
  startTracking();
});

app.on('window-all-closed', () => {
  // Keep app running
});

app.on('before-quit', () => {
  stopTracking();
});

console.log('[Desktop] Cognitive Tracker initialized');
console.log('[Desktop] Note: This demo tracks within the Electron window.');
console.log('[Desktop] For full system-wide tracking, iohook needs to be built from source.');
