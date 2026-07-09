const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deepaBMS', {
  // App metadata
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getSystemTheme: () => ipcRenderer.invoke('app:get-system-theme'),

  // File dialogs
  saveFile: (options) => ipcRenderer.invoke('dialog:save-file', options),
  openFile: (options) => ipcRenderer.invoke('dialog:open-file', options),
  saveCSV: (options) => ipcRenderer.invoke('dialog:save-csv', options),

  // Native notifications
  showNotification: (options) =>
    ipcRenderer.invoke('notification:show', options),

  // Print
  print: () => ipcRenderer.invoke('app:print'),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // External links
  openExternal: (url) => ipcRenderer.send('shell:open-external', url),

  // ── Event subscriptions (returns unsubscribe function) ─────

  onThemeChange: (callback) => {
    const handler = (_event, theme) => callback(theme);
    ipcRenderer.on('theme:system-changed', handler);
    return () => ipcRenderer.removeListener('theme:system-changed', handler);
  },

  onNewEntry: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('shortcut:new-entry', handler);
    return () => ipcRenderer.removeListener('shortcut:new-entry', handler);
  },

  onSave: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('shortcut:save', handler);
    return () => ipcRenderer.removeListener('shortcut:save', handler);
  },

  onSearch: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('shortcut:search', handler);
    return () => ipcRenderer.removeListener('shortcut:search', handler);
  },

  onToggleDark: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('shortcut:toggle-dark', handler);
    return () => ipcRenderer.removeListener('shortcut:toggle-dark', handler);
  },

  onExport: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('shortcut:export', handler);
    return () => ipcRenderer.removeListener('shortcut:export', handler);
  },

  onSync: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('shortcut:sync', handler);
    return () => ipcRenderer.removeListener('shortcut:sync', handler);
  },

  // ── Power state events ──────────────────────────────────────

  onPowerSuspend: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('power:suspend', handler);
    return () => ipcRenderer.removeListener('power:suspend', handler);
  },

  onPowerResume: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('power:resume', handler);
    return () => ipcRenderer.removeListener('power:resume', handler);
  },

  onPowerAC: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('power:ac', handler);
    return () => ipcRenderer.removeListener('power:ac', handler);
  },

  onPowerBattery: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('power:battery', handler);
    return () => ipcRenderer.removeListener('power:battery', handler);
  },

  // Platform flags
  platform: process.platform,
  isElectron: true,
});
