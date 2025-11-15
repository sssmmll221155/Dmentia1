/**
 * Overlay Manager - Glass-inspired status notifications
 * Lightweight module for cognitive tracking status overlay
 */

const { BrowserWindow, screen } = require('electron');
const path = require('path');

let overlayWindow = null;
let isEnabled = true;
let hideTimeout = null;

/**
 * Create the overlay window
 */
function createOverlay() {
    if (overlayWindow) return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    overlayWindow = new BrowserWindow({
        width: 400,
        height: 280,
        x: width - 420,  // 20px from right edge
        y: 50,           // 50px from top (avoid menu bar)
        transparent: true,  // Transparent for glass effect
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        focusable: false,
        hasShadow: true,
        show: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js')
        }
    });

    // macOS specific - hide from mission control
    if (process.platform === 'darwin') {
        overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        overlayWindow.setAlwaysOnTop(true, 'floating', 1);
    }

    overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));

    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });

    // TEMPORARILY DISABLE click-through so user can see overlay
    // if (process.platform === 'darwin') {
    //     overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    // }

    // Wait for content to load before showing
    overlayWindow.webContents.on('did-finish-load', () => {
        console.log('[Overlay] Content loaded');
    });

    console.log('[Overlay] Created successfully');
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
    if (!isEnabled || !overlayWindow) return;

    clearTimeout(hideTimeout);

    // Wait for webContents to be ready
    if (overlayWindow.webContents.isLoading()) {
        overlayWindow.webContents.once('did-finish-load', () => {
            overlayWindow.webContents.send('overlay:update', {
                type: type,
                message: message,
                isAlert: false,
                persistent: true
            });
        });
    } else {
        overlayWindow.webContents.send('overlay:update', {
            type: type,
            message: message,
            isAlert: false,
            persistent: true
        });
    }

    // NEVER auto-hide - overlay stays visible always
}

/**
 * Show alert notification
 */
function showAlert(severity, message, autoHide = false) {
    console.log('[Overlay Manager] showAlert called:', { severity, message, autoHide, isEnabled, hasWindow: !!overlayWindow });

    if (!isEnabled || !overlayWindow) {
        console.log('[Overlay Manager] Alert blocked - enabled:', isEnabled, 'window:', !!overlayWindow);
        return;
    }

    clearTimeout(hideTimeout);

    const payload = {
        type: severity, // 'success', 'warning', 'error'
        message: message,
        isAlert: true,
        persistent: true
    };

    console.log('[Overlay Manager] Sending alert payload:', payload);
    overlayWindow.webContents.send('overlay:update', payload);

    // NEVER auto-hide alerts - they stay visible
}

/**
 * Update batch counter
 */
function updateBatchCount(count) {
    if (!isEnabled || !overlayWindow) return;

    overlayWindow.webContents.send('overlay:batch-count', count);
}

/**
 * Hide overlay (DISABLED - overlay should ALWAYS be visible)
 */
function hide() {
    // DO NOTHING - overlay stays visible always
    console.log('[Overlay] hide() called but disabled - overlay remains visible');
}

/**
 * Show persistent tracking status
 */
function showTrackingActive(batchCount = 0) {
    if (!isEnabled || !overlayWindow) return;

    const payload = {
        type: 'success',
        message: `Tracking Active • ${batchCount} batches`,
        isAlert: false,
        persistent: true
    };

    // Add loading check to prevent race condition
    if (overlayWindow.webContents.isLoading()) {
        overlayWindow.webContents.once('did-finish-load', () => {
            overlayWindow.webContents.send('overlay:update', payload);
        });
    } else {
        overlayWindow.webContents.send('overlay:update', payload);
    }
}

/**
 * Toggle overlay on/off
 */
function toggle() {
    isEnabled = !isEnabled;

    if (!isEnabled) {
        hide();
    }

    return isEnabled;
}

/**
 * Destroy overlay
 */
function destroy() {
    if (overlayWindow) {
        overlayWindow.destroy();
        overlayWindow = null;
    }
}

/**
 * Check if overlay is enabled
 */
function isOverlayEnabled() {
    return isEnabled;
}

module.exports = {
    createOverlay,
    showStatus,
    showAlert,
    updateBatchCount,
    showTrackingActive,
    hide,
    toggle,
    destroy,
    isOverlayEnabled
};
