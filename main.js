
const { app, BrowserWindow, ipcMain, globalShortcut, Tray, screen, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { pathToFileURL } = require('url');
const sflxRuntime = require('./spatiflac-extension-runtime');

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
let ipcRegistered = false;

// Store music state to send to windows
let currentMusicState = { track: null, isPlaying: false, currentTime: 0, duration: 0 };

// --- Single Instance Lock & File Association Handling ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow && !mainWindow.isDestroyed()) {
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.');
  });

  autoUpdater.on('error', (err) => {
    const msg = err && err.message ? err.message : String(err);
    const isNoFeed = /Cannot find latest\.yml|HttpError|\b404\b/i.test(msg);
    if (isNoFeed) {
      log.info('No published update feed — update check skipped.');
      return;
    }
    log.error('Update error:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', msg);
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded');
    if (mainWindow && !mainWindow.isDestroyed()) {
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
    : `${pathToFileURL(path.join(__dirname, 'build/index.html')).href}?mode=mini`;

  miniPlayerWindow.loadURL(miniUrl);

  miniPlayerWindow.on('close', (e) => {
      if (!isQuitting) {
          e.preventDefault();
          if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) miniPlayerWindow.hide();
      }
  });

  miniPlayerWindow.once('ready-to-show', () => {
      // Don't show immediately, wait for explicit switch
      if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
          miniPlayerWindow.webContents.send('music-state-change', currentMusicState);
      }
  });

  miniPlayerWindow.on('closed', () => {
    miniPlayerWindow = null;
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
    : `${pathToFileURL(path.join(__dirname, 'build/index.html')).href}?mode=tray`;

  trayWindow.loadURL(trayUrl);

  trayWindow.on('blur', () => {
    if (trayWindow && !trayWindow.isDestroyed()) trayWindow.hide();
  });

  trayWindow.on('closed', () => {
    trayWindow = null;
  });
}

function toggleTrayWindow() {
  if (!trayWindow || !tray || trayWindow.isDestroyed()) return;
  
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
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed() && miniPlayerWindow.isVisible()) {
        miniPlayerWindow.hide();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
        }
    } else {
        if (mainWindow && !mainWindow.isDestroyed()) {
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
    : pathToFileURL(path.join(__dirname, 'build/index.html')).href;

  mainWindow.loadURL(startUrl);

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      
      // LOGIC: If music is playing, switch to Mini Player. Else, just hide.
      if (currentMusicState.isPlaying) {
          mainWindow.hide();
          if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
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

  }

// --- IPC Handlers (registered once, not per window) ---
function registerIpcHandlers() {
  if (ipcRegistered) return;
  ipcRegistered = true;

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
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) miniPlayerWindow.hide();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
    if (!tray) createTray();
  });

  ipcMain.on('tray-open-app', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
      }
      if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) miniPlayerWindow.hide();
      if (trayWindow && !trayWindow.isDestroyed()) trayWindow.hide();
  });

  ipcMain.on('tray-quit-app', () => {
      isQuitting = true;
      app.quit();
  });

  // --- Music Sync IPC ---
  ipcMain.on('switch-to-mini', () => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
      if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
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
             const msg = err && err.message ? err.message : String(err);
             const isNoFeed = /Cannot find latest\.yml|HttpError|\b404\b/i.test(msg);
             if (isNoFeed) {
                 log.info('No published update feed — update check skipped.');
                 return;
             }
             log.error("Check for updates failed", err);
             if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-error', msg);
         });
     }
  });

  ipcMain.on('download-update', async () => {
     try {
         await autoUpdater.downloadUpdate();
     } catch (err) {
         const msg = err && err.message ? err.message : String(err);
         if (/Cannot find latest\.yml|HttpError|\b404\b/i.test(msg)) {
             log.info('No published update feed — download skipped.');
             return;
         }
         log.error('Download update failed', err);
         if (mainWindow && !mainWindow.isDestroyed()) {
             mainWindow.webContents.send('update-error', msg);
         }
     }
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
    if (!sourcePath || typeof sourcePath !== 'string') throw new Error('Invalid source path');
    const allowedExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.mp4', '.webm', '.m4b', '.aac'];
    const extension = path.extname(sourcePath);
    if (!allowedExtensions.includes(extension.toLowerCase())) {
      throw new Error(`Unsupported audio file type: ${extension || 'none'}`);
    }
    if (!fs.existsSync(sourcePath)) {
      throw new Error('Source file not found');
    }
    const stat = await fs.promises.stat(sourcePath);
    if (!stat.isFile()) {
      throw new Error('Source path is not a file');
    }
    const userDataPath = app.getPath('userData');
    const soundsDir = path.join(userDataPath, 'sounds');
    if (!fs.existsSync(soundsDir)) {
      await fs.promises.mkdir(soundsDir, { recursive: true });
    }
    const uniqueName = `${crypto.randomUUID()}${extension}`;
    const destPath = path.join(soundsDir, uniqueName);
    await fs.promises.copyFile(sourcePath, destPath);
    return destPath;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('read-lyrics-file', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') return { success: false, error: 'Invalid path' };
    if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile() || stat.size > 1024 * 1024) return { success: false, error: 'Invalid lyrics file' };
    const text = await fs.promises.readFile(filePath, 'utf8');
    return { success: true, content: text };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-embedded-lyrics', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') return { success: false, error: 'Invalid path' };
    if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) return { success: false, error: 'Not a file' };
    const readSize = Math.min(stat.size, 8 * 1024 * 1024);
    const buf = await fs.promises.readFile(filePath, { length: readSize });
    const lyrics = extractFlacLyrics(buf);
    if (lyrics) return { success: true, lyrics };
    return { success: false, error: 'No embedded lyrics found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function extractFlacLyrics(buf) {
  if (buf.length < 4) return null;
  if (buf[0] !== 0x66 || buf[1] !== 0x4c || buf[2] !== 0x61 || buf[3] !== 0x43) return null;
  let offset = 4;
  while (offset + 4 <= buf.length) {
    const header = buf[offset];
    const isLast = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const size = buf.readUIntBE(offset + 1, 3);
    offset += 4;
    if (offset + size > buf.length) break;
    if (type === 4) {
      return parseVorbisComments(buf, offset, size);
    }
    offset += size;
    if (isLast) break;
  }
  return null;
}

function parseVorbisComments(buf, start, size) {
  const end = start + size;
  let p = start;
  if (p + 4 > end) return null;
  const vendorLen = buf.readUInt32LE(p);
  p += 4 + vendorLen;
  if (p + 4 > end) return null;
  const count = buf.readUInt32LE(p);
  p += 4;
  for (let i = 0; i < count && p + 4 <= end; i++) {
    const len = buf.readUInt32LE(p);
    p += 4;
    if (p + len > end) break;
    const keyEnd = buf.indexOf(0x3d, p);
    if (keyEnd === -1 || keyEnd > p + len) {
      p += len;
      continue;
    }
    const key = buf.toString('latin1', p, keyEnd).toUpperCase();
    if (key === 'LYRICS' || key === 'UNSYNCEDLYRICS') {
      const value = buf.toString('utf8', keyEnd + 1, p + len);
      if (value && value.trim()) return value;
    }
    p += len;
  }
  return null;
}

ipcMain.handle('delete-sound-file', async (event, filePath) => {
  try {
    if (!filePath) return { success: false };
    const soundsDir = path.resolve(app.getPath('userData'), 'sounds');
    const resolvedPath = path.resolve(filePath);
    if (resolvedPath !== soundsDir && !resolvedPath.startsWith(soundsDir + path.sep)) {
      return { success: false, error: 'Path outside sounds directory' };
    }
    if (fs.existsSync(resolvedPath)) {
      await fs.promises.unlink(resolvedPath);
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
      let req;
      const mod = /^http:/.test(u) ? require('http') : https;
      try {
        req = mod.get(u, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) NeonRedSoundPad/2.1' }
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
            return follow(new URL(res.headers.location, u), redirectsLeft - 1);
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
          stream.on('finish', () => stream.close(() => {
            if (total > 0 && received < total) {
              fs.unlink(destPath, () => {});
              return reject(new Error('Download incomplete'));
            }
            if (received < 1024) {
              fs.unlink(destPath, () => {});
              return reject(new Error('Downloaded file too small'));
            }
            resolve();
          }));
          stream.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
          res.on('error', (err) => { stream.destroy(); fs.unlink(destPath, () => {}); reject(err); });
        }).on('error', reject);
        req.setTimeout(120000, () => { try { req.destroy(new Error('Download timed out')); } catch (e) {} });
      } catch (err) {
        return reject(err);
      }
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

// ============================================================================
// ONLINE MUSIC ENGINE (Spatiflac full-track + FLAC)
// Full tracks are resolved through the yt-dlp engine (bundled binary) and
// cached locally. FLAC is produced by lossless conversion with FFmpeg — no
// account required.
// ============================================================================

function onlineBaseDir() { return path.join(app.getPath('music'), 'NeonRed Spatiflac'); }
function onlineCacheDir() { return path.join(onlineBaseDir(), '.cache'); }

function makeProgressSender(event, downloadId) {
  return (fraction) => {
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('online-download-progress', { downloadId, percent: Math.round(fraction * 100) });
    }
  };
}

function sanitizeForFile(name) {
  return String(name || 'track').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim() || 'track';
}

function sanitizeCachePart(value) {
  return String(value == null ? '' : value).replace(/[^a-zA-Z0-9]/g, '-');
}

function ytDlpBinaryPath() {
  if (_ytdlpPath && fs.existsSync(_ytdlpPath) && fs.statSync(_ytdlpPath).size > 5 * 1024 * 1024) return _ytdlpPath;
  const candidate = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
  const dest = path.join(app.getPath('userData'), 'bin', 'yt-dlp.exe');
  try {
    if (!fs.existsSync(candidate) || fs.statSync(candidate).size < 5 * 1024 * 1024) {
      throw new Error('yt-dlp binary not found');
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest) || fs.statSync(dest).size !== fs.statSync(candidate).size) {
      fs.copyFileSync(candidate, dest);
    }
    _ytdlpPath = dest;
    return dest;
  } catch (e) {
    log.error('Failed to extract yt-dlp binary', e);
    return null;
  }
}

let _ytdlpPath = null;

function runYtDlp(args, timeoutMs, onStdoutLine) {
  return new Promise((resolve, reject) => {
    const bin = ytDlpBinaryPath();
    if (!bin) return reject(new Error('yt-dlp engine unavailable'));
    let proc;
    try {
      proc = spawn(bin, args, { windowsHide: true });
    } catch (e) {
      return reject(e);
    }
    let stdout = '';
    let stderr = '';
    let settled = false;
    const settle = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(val);
    };
    const timer = setTimeout(() => {
      try { proc.kill(); } catch (e) {}
      settle(reject, new Error('Engine timed out'));
    }, timeoutMs);
    proc.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      if (onStdoutLine) { try { onStdoutLine(s); } catch (e) {} }
    });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => settle(reject, err));
    proc.on('close', (code) => {
      if (code === 0) settle(resolve, { stdout, stderr });
      else {
        const errLine = stderr.split('\n').filter((l) => /^ERROR/.test(l)).slice(-1)[0];
        settle(reject, new Error(errLine || stderr.slice(-300) || 'yt-dlp failed'));
      }
    });
  });
}

const YTDLP_COMMON = ['--no-playlist', '--no-warnings', '--socket-timeout', '20', '--retries', '3'];

function pickBestAudioFormats(info) {
  const formats = Array.isArray(info.formats) ? info.formats : [];
  const audioOnly = formats.filter((f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'));
  if (audioOnly.length === 0) {
    return formats
      .filter((f) => f.acodec && f.acodec !== 'none' && f.vcodec && f.vcodec !== 'none')
      .sort((a, b) => (b.tbr || 0) - (a.tbr || 0));
  }
  return audioOnly.sort((a, b) => (b.abr || 0) - (a.abr || 0) || (b.tbr || 0) - (a.tbr || 0));
}

async function resolveYoutubeStream(query) {
  const { stdout } = await runYtDlp([...YTDLP_COMMON, '--dump-single-json', '--format', 'bestaudio/best', 'ytsearch1:' + query], 90000);
  let info;
  try {
    info = JSON.parse(stdout);
  } catch (e) {
    throw new Error('Engine returned invalid response');
  }
  if (!info || !info.id) throw new Error('No matching track found on the full-track engine');
  const formats = pickBestAudioFormats(info);
  if (formats.length === 0) throw new Error('No audio stream available');
  const best = formats[0];
  return {
    videoId: info.id,
    webpageUrl: info.webpage_url || info.original_url || ('https://www.youtube.com/watch?v=' + info.id),
    title: info.title || 'Unknown',
    duration: info.duration || 0,
    formatId: String(best.format_id),
    ext: String(best.ext || 'm4a'),
    infoJson: info
  };
}

function loadInfoJsonToTemp(info) {
  const dir = path.join(app.getPath('temp'), 'neonred-sflx');
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, crypto.randomUUID() + '.info.json');
  fs.writeFileSync(p, JSON.stringify(info));
  return p;
}

function validAudioFile(p) {
  try {
    return fs.statSync(p).size >= 256 * 1024;
  } catch (e) {
    return false;
  }
}

async function downloadYoutubeTo(resolved, destPath, onProgress, timeoutMs) {
  const infoJson = loadInfoJsonToTemp(resolved.infoJson);
  const base = destPath.slice(0, -path.extname(destPath).length);
  try {
    const args = [...YTDLP_COMMON, '--load-info-json', infoJson, '--format', resolved.formatId, '--newline', '-o', base + '.%(ext)s'];
    await runYtDlp(args, timeoutMs || 600000, (line) => {
      const m = /\[download\]\s+([\d.]+)%/.exec(line);
      if (m && onProgress) onProgress(Math.min(1, parseFloat(m[1]) / 100));
    });
  } finally {
    try { fs.unlinkSync(infoJson); } catch (e) {}
  }
  if (fs.existsSync(destPath)) {
    if (validAudioFile(destPath)) return;
    fs.unlinkSync(destPath);
    throw new Error('Downloaded file is too small');
  }
  const dir = path.dirname(base);
  const files = fs.readdirSync(dir).filter((f) => !f.endsWith('.part') && !f.endsWith('.ytdl'));
  const match = files.find((f) => f.startsWith(path.basename(base) + '.'));
  if (!match) throw new Error('Engine finished without producing a file');
  const produced = path.join(dir, match);
  if (!validAudioFile(produced)) {
    fs.unlinkSync(produced);
    throw new Error('Downloaded file is too small');
  }
  fs.renameSync(produced, destPath);
}

function ffmpegBinaryPath() {
  const src = require('ffmpeg-static');
  if (!src) return null;
  const dest = path.join(app.getPath('userData'), 'bin', path.basename(src));
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 1024 * 1024) {
      fs.copyFileSync(src, dest);
    }
    return dest;
  } catch (e) {
    log.error('Failed to extract ffmpeg binary', e);
    return null;
  }
}

async function downloadYoutubeFlac(resolved, destPath, onProgress) {
  const tmpDir = path.join(app.getPath('temp'), 'neonred-sflx');
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpBase = path.join(tmpDir, crypto.randomUUID());
  const tmpAudio = tmpBase + '.' + resolved.ext;
  try {
    await downloadYoutubeTo(resolved, tmpAudio, (p) => { if (onProgress) onProgress(p * 0.85); }, 600000);
    const ffmpegPath = ffmpegBinaryPath();
    if (!ffmpegPath) throw new Error('FFmpeg binary not found');
    await new Promise((resolve, reject) => {
      const ff = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', tmpAudio, '-vn', '-c:a', 'flac', '-compression_level', '5', '-y', destPath], { windowsHide: true });
      let stderr = '';
      ff.stderr.on('data', (d) => { stderr += d.toString(); });
      ff.on('close', (code) => {
        if (code === 0 && validAudioFile(destPath)) {
          if (onProgress) onProgress(1);
          resolve();
        } else {
          try { fs.unlinkSync(destPath); } catch (e) {}
          reject(new Error('FLAC conversion failed: ' + stderr.slice(-200)));
        }
      });
      ff.on('error', (err) => { try { fs.unlinkSync(destPath); } catch (e) {} reject(err); });
    });
  } finally {
    try { fs.unlinkSync(tmpAudio); } catch (e) {}
  }
}

function uniquePath(dir, filename) {
  let destPath = path.join(dir, filename);
  if (!fs.existsSync(destPath)) return destPath;
  const ext = path.extname(filename);
  const base = filename.slice(0, -ext.length);
  let i = 1;
  while (fs.existsSync(destPath)) {
    destPath = path.join(dir, `${base} (${i})${ext}`);
    i++;
  }
  return destPath;
}

function cleanupWorkDir(dir) {
  if (!dir) return;
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
}

function embedAudioMetadata(inputPath, outputPath, meta) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = ffmpegBinaryPath();
    if (!ffmpegPath) return reject(new Error('FFmpeg binary not found'));
    const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath];
    const coverPath = meta && meta.coverPath && fs.existsSync(meta.coverPath) ? meta.coverPath : null;
    if (coverPath) args.push('-i', coverPath);
    args.push('-map', '0:a:0');
    if (coverPath) {
      args.push('-map', '1:v:0', '-c:v', 'mjpeg', '-disposition:v', 'attached_pic');
    }
    args.push('-c:a', 'copy', '-id3v2_version', '3');
    const tags = (meta && meta.tags) || {};
    Object.keys(tags).forEach((k) => {
      const v = tags[k] == null ? '' : String(tags[k]).trim();
      if (v) args.push('-metadata', `${k}=${v}`);
    });
    args.push(outputPath);
    const ff = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = '';
    ff.stderr.on('data', (d) => { stderr += d.toString(); });
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('Metadata embedding failed: ' + stderr.slice(-200)));
    });
    ff.on('error', (err) => reject(err));
  });
}

// ============================================================================
// SPATIFLAC EXTENSION RUNTIME (community .sflx providers)
// Extensions are ZIP packages (manifest.json + index.js) downloaded from the
// SpatiFLAC registry, sha256-verified and executed in a sandboxed vm worker.
// ============================================================================

ipcMain.handle('extensions-installed', async () => sflxRuntime.listInstalled());

ipcMain.handle('extensions-install', async (event, reg) => {
  try {
    const result = await sflxRuntime.installFromRegistry(reg || {});
    if (!result.success) return { success: false, error: result.error };
    const manifest = result.extension.manifest;
    return {
      success: true,
      extension: {
        packageId: result.extension.packageId,
        displayName: manifest.displayName || manifest.name,
        version: manifest.version,
        description: manifest.description,
        types: manifest.type || [],
        qualityOptions: (manifest.qualityOptions || []).map((q) => {
          const idStr = String(q.id || 'best').toLowerCase();
          const nameStr = String(q.label || q.id || '').toLowerCase();
          const isPreview = /preview|sample|30\s*s/.test(idStr + ' ' + nameStr);
          return {
            id: String(q.id || 'best'),
            label: q.label || q.id || 'Quality',
            description: q.description || '',
            ext: isPreview ? 'm4a' : (idStr.includes('flac') ? 'flac' : (q.ext || 'mp3')),
            available: true,
            isPreview,
            engine: isPreview ? 'preview' : (idStr.includes('flac') ? 'flac' : 'full')
          };
        })
      }
    };
  } catch (error) {
    return { success: false, error: error.message || 'Install failed' };
  }
});

ipcMain.handle('extensions-uninstall', async (event, packageId) => sflxRuntime.uninstall(packageId));

ipcMain.handle('extensions-search', async (event, opts) => {
  try {
    const { packageId, query } = opts || {};
    if (!packageId || !query) return { success: false, error: 'Missing parameters' };
    const res = await sflxRuntime.searchProvider(packageId, query);
    if (!res.ok) return { success: false, error: res.error || 'Search failed' };
    return { success: true, results: Array.isArray(res.result) ? res.result : [] };
  } catch (error) {
    return { success: false, error: error.message || 'Search failed' };
  }
});

ipcMain.handle('extensions-download', async (event, opts) => {
  const cleanup = () => {
    if (res && res.workDir) cleanupWorkDir(res.workDir);
  };
  let res = null;
  try {
    const { packageId, trackId, qualityId, meta, filename, downloadId } = opts || {};
    if (!packageId || !trackId) return { success: false, error: 'Missing extension or track id' };
    const baseDir = onlineBaseDir();
    await fs.promises.mkdir(baseDir, { recursive: true });
    const sendProgress = makeProgressSender(event, downloadId || crypto.randomUUID());
    res = await sflxRuntime.downloadProvider(packageId, trackId, qualityId, (p) => {
      sendProgress(Math.max(0, Math.min(1, p)));
    }, true);
    if (!res.ok) {
      cleanup();
      return { success: false, error: res.error || 'Extension download failed' };
    }
    const result = res.result;
    const srcPath = result && result.file_path;
    if (!srcPath || !fs.existsSync(srcPath)) {
      cleanup();
      return { success: false, error: 'Downloaded file missing' };
    }
    const size = fs.statSync(srcPath).size;
    if (size < 1024) {
      cleanup();
      return { success: false, error: 'Downloaded file too small' };
    }
    const ext = path.extname(srcPath) || '.mp3';
    const finalName = `${sanitizeForFile(filename || (meta && meta.title) || 'track')}${ext}`;
    const finalPath = uniquePath(baseDir, finalName);
    let coverPath = null;
    if (meta && meta.cover) {
      coverPath = path.join(app.getPath('temp'), 'neonred-sflx', crypto.randomUUID() + '.jpg');
      try { await downloadUrl(meta.cover, coverPath, () => {}); } catch (e) { coverPath = null; }
    }
    const tags = {
      title: (result && result.title) || (meta && meta.title),
      artist: (result && result.artist) || (meta && meta.artist),
      album: (result && result.album) || (meta && meta.album),
      album_artist: result && result.album_artist,
      track: result && result.track_number ? String(result.track_number) : undefined,
      date: (result && result.release_date) || (meta && meta.releaseDate),
      ISRC: (result && result.isrc) || (meta && meta.isrc)
    };
    try {
      await embedAudioMetadata(srcPath, finalPath, { tags, coverPath });
    } catch (embedErr) {
      try { fs.copyFileSync(srcPath, finalPath); } catch (copyErr) {
        cleanup();
        if (coverPath) try { fs.unlinkSync(coverPath); } catch (e) {}
        return { success: false, error: embedErr.message || 'Metadata embedding failed' };
      }
    }
    cleanup();
    if (coverPath) try { fs.unlinkSync(coverPath); } catch (e) {}
    return { success: true, path: finalPath, metadata: result };
  } catch (error) {
    cleanup();
    return { success: false, error: error.message || 'Extension download failed' };
  }
});

ipcMain.handle('online-full-track', async (event, opts) => {
  try {
    const { query, cacheKey, downloadId } = opts || {};
    if (!query) return { success: false, error: 'Missing search query' };
    const dir = onlineCacheDir();
    await fs.promises.mkdir(dir, { recursive: true });
    const resolved = await resolveYoutubeStream(query);
    const base = `cache-${sanitizeCachePart(resolved.videoId)}-${sanitizeCachePart(cacheKey || query)}`;
    const existing = await fs.promises.readdir(dir).catch(() => []);
    const match = existing.find(f => f.indexOf(base + '.best.') === 0);
    if (match) {
      const cachedPath = path.join(dir, match);
      if (validAudioFile(cachedPath)) {
        return { success: true, path: cachedPath, cached: true, format: path.extname(match).slice(1), duration: resolved.duration };
      }
      try { fs.unlinkSync(cachedPath); } catch (e) {}
    }

    const destPath = path.join(dir, `${base}.best.${resolved.ext}`);
    const sendProgress = makeProgressSender(event, downloadId || crypto.randomUUID());
    await downloadYoutubeTo(resolved, destPath, sendProgress);
    return { success: true, path: destPath, cached: false, format: resolved.ext, duration: resolved.duration };
  } catch (error) {
    return { success: false, error: error.message || 'Full-track resolution failed' };
  }
});

ipcMain.handle('online-download-track', async (event, opts) => {
  try {
    const { query, cacheKey, filename, format, previewUrl, downloadId } = opts || {};
    const baseDir = onlineBaseDir();
    await fs.promises.mkdir(baseDir, { recursive: true });
    const sendProgress = makeProgressSender(event, downloadId || crypto.randomUUID());

    if (format === 'preview' && previewUrl) {
      const destPath = path.join(baseDir, `${sanitizeForFile(filename || 'track')}.m4a`);
      await downloadUrl(previewUrl, destPath, sendProgress);
      return { success: true, path: destPath, isFallback: false };
    }

    if (!query) return { success: false, error: 'Missing search query' };
    const resolved = await resolveYoutubeStream(query);
    const cacheBase = `cache-${sanitizeCachePart(resolved.videoId)}-${sanitizeCachePart(filename || 'track')}`;
    if (format === 'flac') {
      const destPath = path.join(baseDir, `${cacheBase}.flac`);
      if (validAudioFile(destPath)) return { success: true, path: destPath, cached: true };
      await downloadYoutubeFlac(resolved, destPath, sendProgress);
      return { success: true, path: destPath };
    }

    const destPath = path.join(baseDir, `${cacheBase}.${resolved.ext}`);
    if (validAudioFile(destPath)) return { success: true, path: destPath, cached: true };
    await downloadYoutubeTo(resolved, destPath, sendProgress);
    return { success: true, path: destPath };
  } catch (error) {
    return { success: false, error: error.message || 'Download failed' };
  }
});

// --- Qobuz FLAC provider removed: FLAC is produced losslessly by FFmpeg with no account ---

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
    const child = spawn('powershell.exe', ['-Command', command], { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    const exitCode = await new Promise((resolve, reject) => {
      child.on('error', (err) => reject(err));
      child.on('close', (code) => resolve(code));
    });
    if (exitCode !== 0) {
      return { success: false, error: `Installer exited with code ${exitCode}${stderr ? ': ' + stderr.trim() : ''}` };
    }
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
  registerIpcHandlers();
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
