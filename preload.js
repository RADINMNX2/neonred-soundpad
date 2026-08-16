
const { contextBridge, ipcRenderer } = require('electron');

const shortcutListeners = new Map();

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  hideToTray: () => ipcRenderer.send('window-hide-to-tray'),
  
  // Tray Actions
  showMainApp: () => ipcRenderer.send('tray-open-app'),
  quitApp: () => ipcRenderer.send('tray-quit-app'),
  
  // Shortcuts
  registerShortcuts: (shortcuts) => ipcRenderer.send('register-shortcuts', shortcuts),
  onShortcutTriggered: (callback) => {
    const subscription = (event, id) => callback(id);
    ipcRenderer.on('shortcut-triggered', subscription);
    shortcutListeners.set(callback, subscription);
    return () => {
      if (shortcutListeners.get(callback) === subscription) {
        shortcutListeners.delete(callback);
        ipcRenderer.removeListener('shortcut-triggered', subscription);
      }
    };
  },
  removeShortcutListener: (callback) => {
    const subscription = shortcutListeners.get(callback);
    if (subscription) {
      shortcutListeners.delete(callback);
      ipcRenderer.removeListener('shortcut-triggered', subscription);
    }
  },

  // File Handling (Open With)
  onFileOpened: (callback) => {
      const sub = (e, path) => callback(path);
      ipcRenderer.on('open-file', sub);
      return () => ipcRenderer.removeListener('open-file', sub);
  },

  // System
  setStartAtLogin: (enabled) => ipcRenderer.send('set-start-at-login', enabled),

  // File System
  saveSoundFile: (path) => ipcRenderer.invoke('save-sound-file', path),
  deleteSoundFile: (path) => ipcRenderer.invoke('delete-sound-file', path),
  saveSourceCode: () => ipcRenderer.invoke('save-source-code'),
  
  // Installer
  installVBCable: () => ipcRenderer.invoke('install-vb-cable'),

  // Update System
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateAvailable: (callback) => {
    const sub = (e, info) => callback(info);
    ipcRenderer.on('update-available', sub);
    return () => ipcRenderer.removeListener('update-available', sub);
  },
  onUpdateProgress: (callback) => {
    const sub = (e, progress) => callback(progress);
    ipcRenderer.on('update-progress', sub);
    return () => ipcRenderer.removeListener('update-progress', sub);
  },
  onUpdateDownloaded: (callback) => {
    const sub = (e, info) => callback(info);
    ipcRenderer.on('update-downloaded', sub);
    return () => ipcRenderer.removeListener('update-downloaded', sub);
  },
  onUpdateError: (callback) => {
    const sub = (e, err) => callback(err);
    ipcRenderer.on('update-error', sub);
    return () => ipcRenderer.removeListener('update-error', sub);
  },

  // Mini Player Sync
  switchToMini: () => ipcRenderer.send('switch-to-mini'),
  syncMusicState: (state) => ipcRenderer.send('sync-music-state', state),
  onMusicStateChange: (callback) => {
      const sub = (e, state) => callback(state);
      ipcRenderer.on('music-state-change', sub);
      return () => ipcRenderer.removeListener('music-state-change', sub);
  },
  sendMusicControl: (action) => ipcRenderer.send('send-music-control', action),
  onMusicControl: (callback) => {
      const sub = (e, action) => callback(action);
      ipcRenderer.on('music-control-action', sub);
      return () => ipcRenderer.removeListener('music-control-action', sub);
  },
  
  // Visualizer Sync (NEW)
  syncVisualizerData: (data) => ipcRenderer.send('sync-visualizer-data', data),
  onVisualizerData: (callback) => {
      const sub = (e, data) => callback(data);
      ipcRenderer.on('visualizer-data-update', sub);
      return () => ipcRenderer.removeListener('visualizer-data-update', sub);
  },
  
  // Seeking
  seekMusic: (time) => ipcRenderer.send('seek-music', time),
  onSeekMusic: (callback) => {
      const sub = (e, time) => callback(time);
      ipcRenderer.on('seek-music-action', sub);
      return () => ipcRenderer.removeListener('seek-music-action', sub);
  },

  // Online Music Download
  onlineDownload: (opts) => ipcRenderer.invoke('online-download', opts),
  onOnlineDownloadProgress: (callback) => {
      const sub = (e, data) => callback(data);
      ipcRenderer.on('online-download-progress', sub);
      return () => ipcRenderer.removeListener('online-download-progress', sub);
  },

  // Online Music Full-Track Engine
  onlineFullTrack: (opts) => ipcRenderer.invoke('online-full-track', opts),
  onlineDownloadTrack: (opts) => ipcRenderer.invoke('online-download-track', opts),

  // Spatiflac Community Extension Runtime
  extensionsInstalled: () => ipcRenderer.invoke('extensions-installed'),
  extensionsInstall: (reg) => ipcRenderer.invoke('extensions-install', reg),
  extensionsUninstall: (packageId) => ipcRenderer.invoke('extensions-uninstall', packageId),
  extensionsSearch: (opts) => ipcRenderer.invoke('extensions-search', opts),
  extensionsDownload: (opts) => ipcRenderer.invoke('extensions-download', opts)
});
