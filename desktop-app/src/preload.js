/**
 * Preload script for overlay window
 * Exposes limited APIs to renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use ipcRenderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Overlay specific
  onOverlayUpdate: (callback) => ipcRenderer.on('overlay:update', callback),
  onBatchCount: (callback) => ipcRenderer.on('overlay:batch-count', callback),
  onOverlayHide: (callback) => ipcRenderer.on('overlay:hide', callback)
});

// Also expose ipcRenderer for backward compatibility with dashboard
contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(event, ...args));
  },
  invoke: (channel, data) => {
    return ipcRenderer.invoke(channel, data);
  }
});
