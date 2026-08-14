
const { app, BrowserWindow, ipcMain, globalShortcut, Tray, screen, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure Logging
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = false; // We want to ask user first

// --- EXPLICIT FEED CONFIGURATION ---
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'RADINMNX2',
  repo: 'neonred-soundpad'
});

const isDev = !app.isPackaged; 

let mainWindow = null;
let miniPlayerWindow = null;
let trayWindow = null;
let tray = null;
let isQuitting = false;

// Store music state to send to windows
let currentMusicState = { track: null, isPlaying: false, currentTime: 0, duration: 0 };

// --- Single Instance Lock & File Association Handling ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      
      // Handle file open from second instance (Windows "Open With")
      const file = getFileFromArgs(commandLine);
      if (file) {
          mainWindow.webContents.send('open-file', file);
      }
    }
  });
}

function getFileFromArgs(argv) {
    // Check command line args for a file path
    const args = argv.slice(1); // Skip exe path
    for (const arg of args) {
        if (arg && !arg.startsWith('--') && !arg.startsWith('/') && fs.existsSync(arg)) {
            const ext = path.extname(arg).toLowerCase();
            if (['.mp3', '.wav', '.ogg', '.flac', '.m4a'].includes(ext)) {
                return arg;
            }
        }
    }
    return null;
}

// --- Auto Updater Logic ---
function setupAutoUpdater() {
  if (isDev) return;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.');
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', err.message);
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded');
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });
}

// --- Mini Player Window ---
function createMiniPlayerWindow() {
  miniPlayerWindow = new BrowserWindow({
    width: 300,
    height: 380, // Increased height slightly for progress bar
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  const miniUrl = isDev
    ? 'http://localhost:3000?mode=mini'
    : `file://${path.join(__dirname, 'build/index.html')}?mode=mini`;

  miniPlayerWindow.loadURL(miniUrl);

  miniPlayerWindow.on('close', (e) => {
      if (!isQuitting) {
          e.preventDefault();
          miniPlayerWindow.hide();
      }
  });

  miniPlayerWindow.once('ready-to-show', () => {
      // Don't show immediately, wait for explicit switch
      miniPlayerWindow.webContents.send('music-state-change', currentMusicState);
  });
}

// --- Tray Menu Window ---
function createTrayWindow() {
  trayWindow = new BrowserWindow({
    width: 250,
    height: 180,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  const trayUrl = isDev
    ? 'http://localhost:3000?mode=tray'
    : `file://${path.join(__dirname, 'build/index.html')}?mode=tray`;

  trayWindow.loadURL(trayUrl);

  trayWindow.on('blur', () => {
    trayWindow.hide();
  });
}

function toggleTrayWindow() {
  if (!trayWindow || !tray) return;
  
  if (trayWindow.isVisible()) {
    trayWindow.hide();
  } else {
    const trayBounds = tray.getBounds();
    const windowBounds = trayWindow.getBounds();
    let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    let y = Math.round(trayBounds.y - windowBounds.height - 10);
    const display = screen.getDisplayNearestPoint({x: trayBounds.x, y: trayBounds.y});
    
    if (y < display.bounds.y) {
        y = trayBounds.y + trayBounds.height + 10;
    }
    
    trayWindow.setPosition(x, y, false);
    trayWindow.show();
    trayWindow.focus();
  }
}

function createTray() {
  if (tray) return;

  const iconPath = isDev 
    ? path.join(__dirname, 'public/favicon.ico') 
    : path.join(__dirname, 'build/favicon.ico');

  tray = new Tray(iconPath);
  tray.setToolTip('NeonRed SoundPad');
  
  // Left Click: Smart Toggle
  tray.on('click', () => {
    if (miniPlayerWindow && miniPlayerWindow.isVisible()) {
        miniPlayerWindow.hide();
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    } else {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                if (mainWindow.isFocused()) mainWindow.hide();
                else mainWindow.focus();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    }
  });

  // Right Click: Custom Menu
  tray.on('right-click', () => {
      toggleTrayWindow();
  });

  createTrayWindow();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      backgroundThrottling: false
    },
    icon: isDev 
      ? path.join(__dirname, 'public/favicon.ico') 
      : path.join(__dirname, 'build/favicon.ico')
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      
      // LOGIC: If music is playing, switch to Mini Player. Else, just hide.
      if (currentMusicState.isPlaying) {
          mainWindow.hide();
          if (miniPlayerWindow) {
              const display = screen.getPrimaryDisplay();
              const { width, height } = display.workAreaSize;
              // Bottom Right Positioning
              miniPlayerWindow.setPosition(width - 320, height - 400);
              miniPlayerWindow.show();
          }
      } else {
          mainWindow.hide();
      }
      
      if (!tray) createTray(); 
      return false;
    }
    return true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      const file = getFileFromArgs(process.argv);
      if (file) {
          mainWindow.webContents.send('open-file', file);
      }
  });

  // IPC Listeners
  ipcMain.on('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
  });

  ipcMain.on('window-hide-to-tray', () => {
    if (miniPlayerWindow) miniPlayerWindow.hide();
    if (mainWindow) mainWindow.hide();
    if (!tray) createTray();
  });

  ipcMain.on('tray-open-app', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
      }
      if (miniPlayerWindow) miniPlayerWindow.hide();
      if (trayWindow) trayWindow.hide();
  });

  ipcMain.on('tray-quit-app', () => {
      isQuitting = true;
      app.quit();
  });

  // --- Music Sync IPC ---
  ipcMain.on('switch-to-mini', () => {
      if (mainWindow) mainWindow.hide();
      if (miniPlayerWindow) {
          // Position at bottom right of primary display
          const display = screen.getPrimaryDisplay();
          const { width, height } = display.workAreaSize;
          miniPlayerWindow.setPosition(width - 320, height - 400);
          
          miniPlayerWindow.show();
          miniPlayerWindow.focus();
          // Ensure state is synced immediately
          miniPlayerWindow.webContents.send('music-state-change', currentMusicState);
      }
  });

  ipcMain.on('sync-music-state', (event, state) => {
      currentMusicState = state;
      if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
          miniPlayerWindow.webContents.send('music-state-change', state);
      }
  });

  ipcMain.on('send-music-control', (event, action) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('music-control-action', action);
      }
  });

  ipcMain.on('seek-music', (event, time) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('seek-music-action', time);
      }
  });

  // --- VISUALIZER SYNC (Real-time data) ---
  ipcMain.on('sync-visualizer-data', (event, data) => {
      // Forward from Main Window to Mini Player
      if (miniPlayerWindow && !miniPlayerWindow.isDestroyed() && miniPlayerWindow.isVisible()) {
          miniPlayerWindow.webContents.send('visualizer-data-update', data);
      }
  });

  ipcMain.on('check-for-updates', () => {
     if (!isDev) {
         autoUpdater.checkForUpdates().catch(err => {
             log.error("Check for updates failed", err);
             if (mainWindow) mainWindow.webContents.send('update-error', err.message);
         });
     }
  });

  ipcMain.on('download-update', () => {
     autoUpdater.downloadUpdate();
  });

  ipcMain.on('install-update', () => {
     isQuitting = true;
     autoUpdater.quitAndInstall();
  });
}

ipcMain.on('register-shortcuts', (event, shortcuts) => {
  globalShortcut.unregisterAll();
  if (!Array.isArray(shortcuts)) return;

  shortcuts.forEach(({ id, accelerator }) => {
    try {
      if (!accelerator) return;
      const success = globalShortcut.register(accelerator, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shortcut-triggered', id);
        }
      });
    } catch (e) {
      console.error(`Error registering shortcut ${accelerator}:`, e);
    }
  });
});

ipcMain.on('set-start-at-login', (event, enabled) => {
    app.setLoginItemSettings({
        openAtLogin: enabled,
        path: app.getPath('exe')
    });
});

ipcMain.handle('save-source-code', async () => {
  try {
    let sourcePath;
    if (isDev) {
      sourcePath = path.join(__dirname, 'public/source.zip');
    } else {
      sourcePath = path.join(process.resourcesPath, 'source.zip');
    }
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'Source file not found in package.' };
    }
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Source Code',
      defaultPath: 'NeonRed-Source.zip',
      filters: [{ name: 'Zip Archive', extensions: ['zip'] }]
    });
    if (filePath) {
      await fs.promises.copyFile(sourcePath, filePath);
      return { success: true };
    } else {
      return { success: false, cancelled: true };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-sound-file', async (event, sourcePath) => {
  try {
    const userDataPath = app.getPath('userData');
    const soundsDir = path.join(userDataPath, 'sounds');
    if (!fs.existsSync(soundsDir)) {
      await fs.promises.mkdir(soundsDir, { recursive: true });
    }
    const extension = path.extname(sourcePath);
    const uniqueName = `${crypto.randomUUID()}${extension}`;
    const destPath = path.join(soundsDir, uniqueName);
    await fs.promises.copyFile(sourcePath, destPath);
    return destPath;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('delete-sound-file', async (event, filePath) => {
  try {
    if (!filePath) return { success: false };
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function downloadUrl(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const follow = (u, redirectsLeft) => {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
          return follow(res.headers.location, redirectsLeft - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        const stream = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          received += chunk.length;
          if (total > 0) onProgress(received / total);
        });
        res.pipe(stream);
        stream.on('finish', () => stream.close(() => resolve()));
        stream.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
        res.on('error', (err) => { stream.destroy(); fs.unlink(destPath, () => {}); reject(err); });
      }).on('error', reject);
    };
    follow(url, 4);
  });
}

ipcMain.handle('online-download', async (event, opts) => {
  try {
    if (!opts || !opts.url) return { success: false, error: 'Missing download URL' };
    const downloadId = opts.downloadId || crypto.randomUUID();
    const baseDir = path.join(app.getPath('music'), 'NeonRed Spatiflac');
    await fs.promises.mkdir(baseDir, { recursive: true });
    const safeName = (opts.filename || 'track').replace(/[^\w.\-() ]/g, '_');
    let destPath = path.join(baseDir, safeName);
    if (fs.existsSync(destPath)) {
      const ext = path.extname(safeName);
      const base = safeName.slice(0, -ext.length);
      let i = 1;
      while (fs.existsSync(destPath)) {
        destPath = path.join(baseDir, `${base} (${i})${ext}`);
        i++;
      }
    }
    const sendProgress = (fraction) => {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('online-download-progress', { downloadId, percent: Math.round(fraction * 100) });
      }
    };
    await downloadUrl(opts.url, destPath, sendProgress);
    return { success: true, path: destPath };
  } catch (error) {
    return { success: false, error: error.message || 'Download failed' };
  }
});

ipcMain.handle('install-vb-cable', async () => {
  try {
    const exeName = 'VBCABLE_Setup_x64.exe';
    let installerPath;
    if (isDev) {
      installerPath = path.join(__dirname, 'public', 'assets', 'VB', exeName);
    } else {
      installerPath = path.join(process.resourcesPath, 'VB', exeName);
    }
    if (!fs.existsSync(installerPath)) {
      throw new Error('Installer file missing');
    }
    const command = `Start-Process -FilePath "${installerPath}" -Verb RunAs`;
    spawn('powershell.exe', ['-Command', command], { windowsHide: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.whenReady().then(() => {
  setupAutoUpdater();
  createWindow();
  createMiniPlayerWindow(); 
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
