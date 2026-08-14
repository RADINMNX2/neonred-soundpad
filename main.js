
const { app, BrowserWindow, ipcMain, globalShortcut, Tray, screen, dialog, Menu, safeStorage } = require('electron');
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

// ============================================================================
// ONLINE MUSIC ENGINE (Spatiflac full-track + FLAC)
// Full tracks are resolved through the YouTube full-track engine (ytdl-core +
// yt-search) and cached locally. FLAC is produced either natively through a
// connected Qobuz account or by lossless conversion with FFmpeg.
// ============================================================================

let _ytdl = null;
let _ytsearch = null;
function loadYtdl() { if (!_ytdl) _ytdl = require('ytdl-core'); return _ytdl; }
function loadYtSearch() { if (!_ytsearch) _ytsearch = require('yt-search'); return _ytsearch; }

function onlineBaseDir() { return path.join(app.getPath('music'), 'NeonRed Spatiflac'); }
function onlineCacheDir() { return path.join(onlineBaseDir(), '.cache'); }
function qobuzCredsFile() { return path.join(app.getPath('userData'), 'spatiflac-qobuz.json'); }

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

async function resolveYoutubeStream(query) {
  const ytsearch = loadYtSearch();
  const result = await ytsearch(query);
  const video = result.videos && result.videos[0];
  if (!video) throw new Error('No matching track found on the full-track engine');
  const info = await loadYtdl().getInfo(video.videoId);
  const format = loadYtdl().chooseFormat(info.formats, { quality: 'highestaudio' });
  if (!format) throw new Error('No audio stream available');
  return { videoId: video.videoId, format };
}

function downloadYoutubeTo(videoId, format, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const stream = loadYtdl()(videoId, { format });
    const file = fs.createWriteStream(destPath);
    stream.on('progress', (chunkLen, downloaded, total) => {
      if (total > 0) onProgress(downloaded / total);
    });
    stream.pipe(file);
    file.on('finish', () => file.close(() => resolve()));
    stream.on('error', (err) => { file.destroy(); fs.unlink(destPath, () => {}); reject(err); });
    file.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

function ffmpegBinaryPath() {
  const src = require('ffmpeg-static');
  if (!src) return null;
  const dest = path.join(app.getPath('userData'), 'bin', path.basename(src));
  try {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    return dest;
  } catch (e) {
    log.error('Failed to extract ffmpeg binary', e);
    return src;
  }
}

function downloadYoutubeFlac(videoId, format, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = ffmpegBinaryPath();
    if (!ffmpegPath) return reject(new Error('FFmpeg binary not found'));
    const stream = loadYtdl()(videoId, { format });
    const ff = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn', '-c:a', 'flac', '-compression_level', '8', '-y', destPath]);
    stream.pipe(ff.stdin);
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else { fs.unlink(destPath, () => {}); reject(new Error('FLAC conversion failed')); }
    });
    ff.on('error', (err) => { stream.destroy(); fs.unlink(destPath, () => {}); reject(err); });
    stream.on('error', (err) => { ff.kill(); fs.unlink(destPath, () => {}); reject(err); });
  });
}

ipcMain.handle('online-full-track', async (event, opts) => {
  try {
    const { query, cacheKey } = opts || {};
    if (!query) return { success: false, error: 'Missing search query' };
    const dir = onlineCacheDir();
    await fs.promises.mkdir(dir, { recursive: true });
    const base = sanitizeForFile(cacheKey || query);
    const existing = await fs.promises.readdir(dir).catch(() => []);
    const match = existing.find(f => f.indexOf(base + '.best.') === 0);
    if (match) return { success: true, path: path.join(dir, match), cached: true };

    const { videoId, format } = await resolveYoutubeStream(query);
    const ext = String(format.mimeType || '').split('/')[1]?.split(';')[0] || 'm4a';
    const destPath = path.join(dir, `${base}.best.${ext}`);
    const sendProgress = makeProgressSender(event, opts.downloadId || crypto.randomUUID());
    await downloadYoutubeTo(videoId, format, destPath, sendProgress);
    return { success: true, path: destPath, cached: false, format: ext };
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
    const { videoId, format: audioFormat } = await resolveYoutubeStream(query);
    if (format === 'flac') {
      const destPath = path.join(baseDir, `${sanitizeForFile(filename || 'track')}.flac`);
      if (fs.existsSync(destPath)) return { success: true, path: destPath, cached: true };
      await downloadYoutubeFlac(videoId, audioFormat, destPath, sendProgress);
      return { success: true, path: destPath };
    }

    const ext = String(audioFormat.mimeType || '').split('/')[1]?.split(';')[0] || 'm4a';
    const destPath = path.join(baseDir, `${sanitizeForFile(filename || 'track')}.${ext}`);
    if (fs.existsSync(destPath)) return { success: true, path: destPath, cached: true };
    await downloadYoutubeTo(videoId, audioFormat, destPath, sendProgress);
    return { success: true, path: destPath };
  } catch (error) {
    return { success: false, error: error.message || 'Download failed' };
  }
});

// --- Qobuz FLAC provider ---
const QOBUZ_APP_ID = '1252860423';
const QOBUZ_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function qobuzHeaders(token) {
  const h = { 'X-App-Id': QOBUZ_APP_ID, 'User-Agent': QOBUZ_UA };
  if (token) h['X-User-Auth-Token'] = token;
  return h;
}

async function qobuzLogin(email, password) {
  const res = await fetch('https://www.qobuz.com/api.json/0.2/user/login', {
    method: 'POST',
    headers: { ...qobuzHeaders(''), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&app_id=${QOBUZ_APP_ID}`
  });
  const data = await res.json().catch(() => null);
  if (!data || !data.user_auth_token) throw new Error('Qobuz login failed — check your credentials');
  return data;
}

async function readQobuzCreds() {
  try {
    if (!fs.existsSync(qobuzCredsFile())) return null;
    const buf = await fs.promises.readFile(qobuzCredsFile());
    const str = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString();
    const data = JSON.parse(str);
    if (data.email && data.password) return data;
  } catch (e) {
    log.error('Failed to read Qobuz credentials', e);
  }
  return null;
}

async function qobuzSearchTrack(query, token) {
  const url = `https://www.qobuz.com/api.json/0.2/catalog/search?query=${encodeURIComponent(query)}&limit=5&type=tracks`;
  const res = await fetch(url, { headers: qobuzHeaders(token) });
  const data = await res.json().catch(() => null);
  const track = data && data.tracks && data.tracks.items && data.tracks.items[0];
  if (!track) throw new Error('Track not found on Qobuz');
  return track;
}

ipcMain.handle('online-set-qobuz', async (event, { email, password }) => {
  try {
    if (!email || !password) return { success: false, error: 'Email and password are required' };
    const payload = JSON.stringify({ email, password });
    const buf = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(payload) : Buffer.from(payload);
    await fs.promises.writeFile(qobuzCredsFile(), buf);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('online-get-qobuz', async () => {
  const creds = await readQobuzCreds();
  return { email: creds ? creds.email : '', hasPassword: !!(creds && creds.password) };
});

ipcMain.handle('online-qobuz-download', async (event, opts) => {
  try {
    const { query, filename, downloadId } = opts || {};
    if (!query) return { success: false, error: 'Missing search query' };
    const creds = await readQobuzCreds();
    if (!creds) return { success: false, error: 'Qobuz account not connected' };
    const session = await qobuzLogin(creds.email, creds.password);
    const token = session.user_auth_token;
    const track = await qobuzSearchTrack(query, token);
    const formatId = (opts && opts.formatId) || 27; // 27 = FLAC 24-bit, 17 = FLAC 16-bit
    const url = `https://www.qobuz.com/api.json/0.2/track/get?track_id=${track.id}&format_id=${formatId}`;
    const res = await fetch(url, { headers: qobuzHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!data || !data.url) return { success: false, error: 'This quality is not available on your Qobuz plan' };
    const baseDir = onlineBaseDir();
    await fs.promises.mkdir(baseDir, { recursive: true });
    const destPath = path.join(baseDir, `${sanitizeForFile(filename || 'track')}.flac`);
    if (fs.existsSync(destPath)) return { success: true, path: destPath, cached: true };
    const sendProgress = makeProgressSender(event, downloadId || crypto.randomUUID());
    await downloadUrl(data.url, destPath, sendProgress);
    return { success: true, path: destPath };
  } catch (error) {
    return { success: false, error: error.message || 'Qobuz download failed' };
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
