const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const zlib = require('zlib');
const AdmZip = require('adm-zip');
const { Worker } = require('worker_threads');

function workerScriptPath(filename) {
  const src = path.join(__dirname, filename);
  const dest = path.join(app.getPath('userData'), 'runtime', filename);
  try {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    return dest;
  } catch (e) {
    return src;
  }
}

const REQ_SAB_SIZE = 1 * 1024 * 1024;
const RESP_SAB_SIZE = 8 * 1024 * 1024;

let _ctrlSab = null;
let _reqSab = null;
let _respSab = null;
let _httpWorker = null;

function extensionsRoot() {
  return path.join(app.getPath('userData'), 'extensions');
}

function workRoot() {
  return path.join(app.getPath('userData'), 'extensions', '.work');
}

function ensureSharedMemory() {
  if (_ctrlSab) return;
  _ctrlSab = new SharedArrayBuffer(4 * 1024);
  _reqSab = new SharedArrayBuffer(REQ_SAB_SIZE);
  _respSab = new SharedArrayBuffer(RESP_SAB_SIZE);
}

function ensureHttpWorker() {
  ensureSharedMemory();
  if (_httpWorker && _httpWorker.threadId) return _httpWorker;
  _httpWorker = new Worker(workerScriptPath('sflx-http-worker.js'), {
    workerData: { ctrlSab: _ctrlSab, reqSab: _reqSab, respSab: _respSab }
  });
  _httpWorker.on('error', (e) => {
    console.error('[sflx] http worker error', e);
    _httpWorker = null;
  });
  _httpWorker.on('exit', () => {
    if (_httpWorker) _httpWorker = null;
  });
  return _httpWorker;
}

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const mod = /^http:/.test(url) ? require('http') : https;
    const req = mod.get(url, { headers: headers || {} }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        return reject(new Error('Redirect not followed'));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let body = Buffer.concat(chunks);
        const enc = String(res.headers['content-encoding'] || '').toLowerCase();
        if (enc === 'gzip' || enc === 'deflate') {
          try { body = enc === 'gzip' ? zlib.gunzipSync(body) : zlib.inflateSync(body); } catch (e) {}
        }
        resolve({ statusCode: status, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('Request timeout')));
  });
}

function listInstalled() {
  const root = extensionsRoot();
  const out = [];
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      const manifestPath = path.join(root, e.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        out.push({
          packageId: e.name,
          name: manifest.name || e.name,
          displayName: manifest.displayName || manifest.name || e.name,
          version: manifest.version || '0.0.0',
          description: manifest.description || '',
          types: manifest.type || [],
          qualityOptions: (manifest.qualityOptions || []).map((q) => ({
            id: String(q.id || 'best'),
            label: q.label || q.id || 'Quality',
            description: q.description || '',
            ext: q.id && String(q.id).toLowerCase().includes('flac') ? 'flac' : (q.ext || 'mp3'),
            available: true,
            engine: q.id && String(q.id).toLowerCase().includes('flac') ? 'flac' : 'full'
          })),
          minAppVersion: manifest.minAppVersion || ''
        });
      } catch (err) {
        console.warn('[sflx] skipped corrupt extension', e.name, err.message);
      }
    }
  } catch (e) {}
  return out;
}

function isInstalled(packageId) {
  if (!packageId || typeof packageId !== 'string' || packageId.includes('..') || packageId.includes('/') || packageId.includes('\\')) {
    return false;
  }
  const manifestPath = path.join(extensionsRoot(), packageId, 'manifest.json');
  return fs.existsSync(manifestPath);
}

function uninstall(packageId) {
  if (!packageId || typeof packageId !== 'string' || packageId.includes('..') || packageId.includes('/') || packageId.includes('\\')) {
    return { success: false, error: 'Invalid extension id' };
  }
  try {
    fs.rmSync(path.join(extensionsRoot(), packageId), { recursive: true, force: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

function verifySha256(buffer, expected) {
  if (!expected) return null;
  const actual = crypto.createHash('sha256').update(buffer).digest('hex');
  return actual === String(expected).toLowerCase();
}

async function downloadPackage(downloadUrl, sha256, onProgress) {
  const tempDir = path.join(app.getPath('temp'), 'neonred-sflx');
  fs.mkdirSync(tempDir, { recursive: true });
  const pkgPath = path.join(tempDir, crypto.randomUUID() + '.sflx');
  try {
    const resp = await httpGet(downloadUrl, { 'User-Agent': 'NeonRed SoundPad' });
    if (resp.statusCode !== 200) throw new Error('Package download failed (HTTP ' + resp.statusCode + ')');
    if (sha256 && !verifySha256(resp.body, sha256)) {
      throw new Error('Package checksum mismatch — download refused');
    }
    fs.writeFileSync(pkgPath, resp.body);
    if (onProgress) onProgress(0.9);
    return pkgPath;
  } catch (e) {
    try { fs.unlinkSync(pkgPath); } catch (e2) {}
    throw e;
  }
}

function extractPackage(pkgPath, packageId) {
  const zip = new AdmZip(pkgPath);
  const entries = zip.getEntries();
  const manifestEntry = entries.find((en) => en.entryName === 'manifest.json');
  const indexEntry = entries.find((en) => en.entryName === 'index.js');
  if (!manifestEntry || !indexEntry) {
    throw new Error('Invalid extension package: manifest.json and index.js required at archive root');
  }
  const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
  const indexCode = indexEntry.getData().toString('utf8');
  if (!indexCode || indexCode.length < 50) {
    throw new Error('Invalid extension package: index.js is empty');
  }
  const dir = path.join(extensionsRoot(), packageId);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(dir, 'index.js'), indexCode);
  return manifest;
}

async function installFromRegistry(reg) {
  const packageId = String(reg.packageId || reg.id || '').trim();
  if (!packageId || !/^[a-zA-Z0-9._-]+$/.test(packageId)) {
    return { success: false, error: 'Invalid extension id' };
  }
  try {
    const pkgPath = await downloadPackage(reg.download_url, reg.sha256);
    const manifest = extractPackage(pkgPath, packageId);
    try { fs.unlinkSync(pkgPath); } catch (e) {}
    return { success: true, extension: { packageId, manifest } };
  } catch (e) {
    return { success: false, error: e && e.message ? e.message : String(e) };
  }
}

async function installFromFile(filePath, packageId) {
  try {
    const manifest = extractPackage(filePath, packageId);
    return { success: true, extension: { packageId, manifest } };
  } catch (e) {
    return { success: false, error: e && e.message ? e.message : String(e) };
  }
}

function runExtensionCall(packageId, callType, args, opts) {
  return new Promise((resolve) => {
    const e = opts || {};
    const timeoutMs = e.timeoutMs || 30000;
    const extensionDir = path.join(extensionsRoot(), packageId);
    if (!fs.existsSync(path.join(extensionDir, 'index.js'))) {
      return resolve({ ok: false, error: 'Extension not installed' });
    }
    ensureHttpWorker();
    ensureSharedMemory();
    const workDir = path.join(workRoot(), packageId + '-' + crypto.randomUUID().slice(0, 8));
    try { fs.mkdirSync(workDir, { recursive: true }); } catch (e2) {}

    const worker = new Worker(workerScriptPath('sflx-extension-worker.js'), {
      workerData: {
        extensionDir,
        callType,
        args,
        workDir,
        appVersion: app.getVersion ? app.getVersion() : '1.3.3',
        requestId: 1,
        ctrlSab: _ctrlSab,
        reqSab: _reqSab,
        respSab: _respSab
      }
    });

    const timer = setTimeout(() => {
      try { worker.terminate(); } catch (e3) {}
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e4) {}
      resolve({ ok: false, error: 'Extension call timed out', timedOut: true });
    }, timeoutMs);

    worker.on('message', (msg) => {
      if (msg && typeof msg.progress === 'number') {
        if (e.onProgress) e.onProgress(msg.progress);
        return;
      }
      clearTimeout(timer);
      try { worker.terminate(); } catch (e3) {}
      if (e.keepWorkDir) {
        resolve({ ok: msg.ok, result: msg.result, error: msg.error, workDir });
      } else {
        try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e4) {}
        resolve({ ok: msg.ok, result: msg.result, error: msg.error });
      }
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      try { worker.terminate(); } catch (e3) {}
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e4) {}
      resolve({ ok: false, error: err && err.message ? err.message : String(err) });
    });

    worker.on('exit', () => {});
  });
}

function searchProvider(packageId, query) {
  return runExtensionCall(packageId, 'searchTracks', [query, 20], { timeoutMs: 30000 });
}

function downloadProvider(packageId, trackId, qualityId, onProgress, keepWorkDir) {
  return runExtensionCall(packageId, 'download', [trackId, qualityId], { timeoutMs: 600000, onProgress, keepWorkDir });
}

module.exports = {
  listInstalled,
  isInstalled,
  uninstall,
  installFromRegistry,
  installFromFile,
  searchProvider,
  downloadProvider,
  runExtensionCall,
  extensionsRoot,
  workRoot
};
