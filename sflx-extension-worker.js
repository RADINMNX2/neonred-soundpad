const { workerData, parentPort } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');
const { URL } = require('url');

const { extensionDir, callType, args, appVersion, httpTimeoutMs } = workerData;

const ctrl = new Int32Array(workerData.ctrlSab);
const reqSab = workerData.reqSab;
const respSab = workerData.respSab;

const STATE_IDLE = 0;
const STATE_REQUEST = 1;
const STATE_RESPONSE = 2;
const STATE_CANCEL = 3;

let _reqSeq = 0;

function syncRequest(method, url, headers, body, destPath) {
  const flags = destPath ? 1 : 0;
  const payload = JSON.stringify({ method, url, headers: headers || {}, body: body || '', destPath, flags });
  const buf = Buffer.from(payload, 'utf8');
  const maxReq = reqSab.byteLength;
  if (buf.length > maxReq) throw new Error('Request payload too large');
  const myId = ++_reqSeq;
  const timeoutMs = destPath ? 320000 : (httpTimeoutMs || 60000);
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      Atomics.store(ctrl, 1, STATE_CANCEL);
      Atomics.notify(ctrl, 1);
      throw new Error('HTTP request timed out');
    }
    new Uint8Array(reqSab, 0, buf.length).set(buf);
    Atomics.store(ctrl, 2, buf.length);
    Atomics.store(ctrl, 5, flags);
    Atomics.store(ctrl, 0, Atomics.load(ctrl, 0) + 1);
    Atomics.store(ctrl, 7, myId);
    Atomics.store(ctrl, 1, STATE_REQUEST);
    Atomics.notify(ctrl, 1);

    Atomics.wait(ctrl, 1, STATE_REQUEST, Math.min(remaining, 5000));
    const state = Atomics.load(ctrl, 1);
    const echoId = Atomics.load(ctrl, 7);
    if (state !== STATE_REQUEST && echoId === myId) {
      const respLen = Atomics.load(ctrl, 3);
      const respFlags = Atomics.load(ctrl, 5);
      let raw = '';
      try {
        raw = Buffer.from(new Uint8Array(respSab, 0, respLen)).toString('utf8');
      } catch (e) {
        raw = '';
      }
      if (Atomics.load(ctrl, 7) === myId) {
        Atomics.store(ctrl, 1, STATE_IDLE);
        let resp = null;
        try { resp = JSON.parse(raw); } catch (e) { resp = null; }
        if (respFlags & 2) throw new Error('HTTP response too large');
        if (!resp) throw new Error('Invalid HTTP response');
        return resp;
      }
      continue;
    }
    if (state !== STATE_REQUEST && state !== STATE_CANCEL && state !== STATE_IDLE) {
      Atomics.wait(ctrl, 1, state, Math.min(remaining, 5000));
    }
  }
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function normalizeForMatch(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(s) {
  const out = new Map();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    out.set(g, (out.get(g) || 0) + 1);
  }
  return out;
}

function compareStrings(a, b) {
  const x = normalizeForMatch(a);
  const y = normalizeForMatch(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  if (x === y) return 1;
  const gx = bigrams(x);
  const gy = bigrams(y);
  let inter = 0;
  for (const [g, c] of gx) {
    const cy = gy.get(g) || 0;
    inter += Math.min(c, cy);
  }
  return (2 * inter) / (x.length + y.length - 2 || 1);
}

function compareDuration(a, b) {
  const da = Number(a) || 0;
  const db = Number(b) || 0;
  if (!da && !db) return 1;
  if (!da || !db) return 0;
  const diff = Math.abs(da - db);
  if (diff <= 1500) return 1;
  return Math.max(0, 1 - diff / Math.max(da, db));
}

function b64encode(str) {
  return Buffer.from(String(str), 'utf8').toString('base64');
}

function b64decode(str) {
  return Buffer.from(String(str), 'base64').toString('utf8');
}

const storagePath = path.join(extensionDir, 'storage.json');

let _storageChain = Promise.resolve();

function storageGet(key) {
  try {
    const raw = fs.readFileSync(storagePath, 'utf8');
    const data = JSON.parse(raw);
    return data[key];
  } catch (e) {
    return undefined;
  }
}

function storageSet(key, value) {
  _storageChain = _storageChain.then(() => {
    try {
      let data = {};
      try { data = JSON.parse(fs.readFileSync(storagePath, 'utf8')); } catch (e) {}
      data[key] = value;
      const tmp = storagePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, storagePath);
    } catch (e) {}
  });
  return _storageChain;
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(path.join(extensionDir, 'manifest.json'), 'utf8'));
  } catch (e) {
    return {};
  }
}

const manifest = readManifest();
const name = manifest.name || 'extension';

function writeBytes(filePath, dataB64, opts) {
  try {
    const o = opts || {};
    const buf = o.encoding === 'base64' ? Buffer.from(String(dataB64), 'base64') : Buffer.from(String(dataB64), 'utf8');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (o.truncate || !fs.existsSync(filePath)) fs.writeFileSync(filePath, buf);
    else fs.appendFileSync(filePath, buf);
    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

function readBytes(filePath, opts) {
  try {
    const o = opts || {};
    const size = fs.statSync(filePath).size;
    const start = Number(o.offset) || 0;
    const length = Number(o.length) > 0 ? Number(o.length) : size - start;
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(length);
    const bytesRead = fs.readSync(fd, buf, 0, length, start);
    fs.closeSync(fd);
    const data = o.encoding === 'base64' ? buf.slice(0, bytesRead).toString('base64') : buf.slice(0, bytesRead).toString('utf8');
    return { success: true, data, bytes_read: bytesRead, eof: start + bytesRead >= size };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

function getSize(filePath) {
  try {
    return { success: true, size: fs.statSync(filePath).size };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

function fileDownload(url, destPath, opts) {
  const headers = (opts && opts.headers) || {};
  const resp = syncRequest('GET', url, headers, '', destPath);
  return resp && (resp.success !== undefined) ? resp : { success: false, error: resp && resp.error ? resp.error : 'Download failed' };
}

function buildSandbox() {
  const sandbox = {
    registerExtension: (def) => { sandbox.__extension = def; },
    http: {
      get: (url, headers) => {
        const r = syncRequest('GET', url, headers, '');
        if (!r) return { error: 'Request failed' };
        return r;
      },
      post: (url, body, headers) => {
        const r = syncRequest('POST', url, headers, body);
        if (!r) return { error: 'Request failed' };
        return r;
      }
    },
    utils: {
      randomUserAgent: () => randomUA(),
      appUserAgent: () => 'NeonRed SoundPad/' + appVersion,
      appVersion: () => appVersion,
      base64Encode: b64encode,
      base64Decode: b64decode,
      md5: (s) => crypto.createHash('md5').update(String(s)).digest('hex'),
      sha256: (s) => crypto.createHash('sha256').update(String(s)).digest('hex'),
      sha1: (s) => crypto.createHash('sha1').update(String(s)).digest('hex'),
      sha512: (s) => crypto.createHash('sha512').update(String(s)).digest('hex'),
      hmacSHA1: (key, data) => {
        const k = Buffer.isBuffer(key) ? key : Buffer.from(String(key));
        const d = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        return new Uint8Array(crypto.createHmac('sha1', k).update(d).digest());
      },
      isDownloadCancelled: () => false,
      randomBytes: (n) => crypto.randomBytes(n).toString('hex'),
      decryptBlockCipher: () => ({ success: false, error: 'Block cipher decryption is not supported by NeonRed' })
    },
    matching: {
      normalizeString: (s) => normalizeForMatch(s),
      compareStrings,
      compareDuration
    },
    storage: {
      get: storageGet,
      set: storageSet
    },
    log: {
      debug: (...args) => { try { console.log('[ext:' + name + ':debug]', ...args); } catch (e) {} },
      info: (...args) => { try { console.log('[ext:' + name + ':info]', ...args); } catch (e) {} },
      warn: (...args) => { try { console.log('[ext:' + name + ':warn]', ...args); } catch (e) {} },
      error: (...args) => { try { console.log('[ext:' + name + ':error]', ...args); } catch (e) {} }
    },
    file: {
      download: fileDownload,
      writeBytes,
      readBytes,
      getSize,
      delete: (p) => { try { fs.unlinkSync(p); return { success: true }; } catch (e) { return { success: false, error: e.message || String(e) }; } },
      exists: (p) => { try { return fs.existsSync(p); } catch (e) { return false; } },
      name: (p) => { try { return path.basename(String(p)); } catch (e) { return ''; } },
      verified: (p) => { try { return fs.existsSync(p) && fs.statSync(p).size > 1024; } catch (e) { return false; } }
    },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (t) => clearTimeout(t),
    atob: b64decode,
    btoa: (s) => b64encode(s),
    URL,
    TextEncoder,
    TextDecoder,
    console
  };
  return sandbox;
}

function postResult(payload) {
  try {
    parentPort.postMessage({ requestId: workerData.requestId, ...payload });
  } catch (e) {}
}

function safeJson(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    return null;
  }
}

async function main() {
  try {
    const codePath = path.join(extensionDir, 'index.js');
    if (!fs.existsSync(codePath)) throw new Error('index.js missing in extension package');
    const code = fs.readFileSync(codePath, 'utf8');
    const sandbox = buildSandbox();
    const ctx = vm.createContext(sandbox);
    vm.runInContext(code, ctx, { filename: 'extension-' + name + '.js' });
    const ext = sandbox.__extension;
    if (!ext) throw new Error('Extension did not call registerExtension');

    const method = typeof ext[callType] === 'function' ? ext[callType] : null;
    if (!method) {
      return postResult({ ok: false, error: 'Extension does not implement ' + callType });
    }

    let result;
    if (callType === 'download') {
      const trackId = args[0];
      const quality = args[1];
      const qualityStr = String(quality || '');
      const extName = qualityStr.toLowerCase().includes('flac') ? 'flac' : 'mp3';
      const outputPath = path.join(workerData.workDir, 'output.' + extName);
      result = await method.call(ext, trackId, quality, outputPath, (p) => {
        try { parentPort.postMessage({ requestId: workerData.requestId, progress: p }); } catch (e) {}
      });
    } else {
      result = await method.apply(ext, args);
    }
    await _storageChain.catch(() => {});
    return postResult({ ok: true, result: safeJson(result) });
  } catch (e) {
    return postResult({ ok: false, error: e && e.message ? e.message : String(e) });
  }
}

main().catch((e) => postResult({ ok: false, error: e && e.message ? e.message : String(e) }));
