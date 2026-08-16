const { workerData, parentPort } = require('worker_threads');
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const ctrl = new Int32Array(workerData.ctrlSab);
const reqSab = workerData.reqSab;
const respSab = workerData.respSab;

const STATE_IDLE = 0;
const STATE_REQUEST = 1;
const STATE_RESPONSE = 2;
const STATE_CANCEL = 3;

const FLAG_DOWNLOAD = 1;

function writeResponse(code, httpStatus, flags, payload) {
  const buf = Buffer.from(payload, 'utf8');
  const max = respSab.byteLength;
  const len = Math.min(buf.length, max);
  new Uint8Array(respSab, 0, len).set(buf.subarray(0, len));
  Atomics.store(ctrl, 3, len);
  Atomics.store(ctrl, 4, code);
  Atomics.store(ctrl, 6, httpStatus);
  if (buf.length > max) Atomics.store(ctrl, 5, flags | 2);
  else Atomics.store(ctrl, 5, flags);
  Atomics.store(ctrl, 1, STATE_RESPONSE);
  Atomics.notify(ctrl, 1);
}

function finishRequest() {
  Atomics.store(ctrl, 1, STATE_IDLE);
}

function redirectLocation(req) {
  return req.res.headers.location || '';
}

function doGet(req, url) {
  return new Promise((resolve, reject) => {
    let redirects = 0;
    const attempt = (u) => {
      const mod = /^http:/.test(u) ? http : https;
      const r = mod.get(u, { headers: req.headers || {} }, (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects >= 5) return reject(new Error('Too many redirects'));
          redirects++;
          const next = new URL(res.headers.location, u).toString();
          return attempt(next);
        }
        if (status !== 200 && status !== 206) {
          res.resume();
          return reject(new Error('HTTP ' + status));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          let body = Buffer.concat(chunks);
          const enc = String(res.headers['content-encoding'] || '').toLowerCase();
          if (enc === 'gzip' || enc === 'deflate') {
            try {
              body = enc === 'gzip' ? zlib.gunzipSync(body) : zlib.inflateSync(body);
            } catch (e) {
              return reject(new Error('Decompression failed'));
            }
          }
          const headers = {};
          for (const k of Object.keys(res.headers)) headers[k] = res.headers[k];
          const ctype = String(res.headers['content-type'] || '');
          const isText = /(^text\/|json|xml|javascript|x-www-form-urlencoded|svg)/i.test(ctype);
          resolve({ statusCode: status, headers, body: isText ? body.toString('utf8') : body.toString('base64'), base64Body: !isText, url: u });
        });
      });
      r.on('error', reject);
      r.setTimeout(60000, () => r.destroy(new Error('Request timeout')));
    };
    attempt(url);
  });
}

function doDownload(req, url) {
  return new Promise((resolve, reject) => {
    let redirects = 0;
    const attempt = (u) => {
      const mod = /^http:/.test(u) ? http : https;
      const r = mod.get(u, { headers: req.headers || {} }, (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects >= 5) return reject(new Error('Too many redirects'));
          redirects++;
          const next = new URL(res.headers.location, u).toString();
          return attempt(next);
        }
        if (status !== 200) {
          res.resume();
          return reject(new Error('HTTP ' + status));
        }
        const tmp = req.destPath + '.part';
        try { fs.mkdirSync(path.dirname(tmp), { recursive: true }); } catch (e) {}
        const out = fs.createWriteStream(tmp);
        let bytes = 0;
        res.on('data', (c) => { bytes += c.length; });
        res.pipe(out);
        out.on('finish', () => {
          out.close(() => {
            try { fs.renameSync(tmp, req.destPath); } catch (e) {}
            resolve({ success: true, path: req.destPath, bytes });
          });
        });
        out.on('error', (err) => {
          res.destroy();
          try { fs.unlinkSync(tmp); } catch (e) {}
          reject(err);
        });
        res.on('error', (err) => {
          out.destroy();
          try { fs.unlinkSync(tmp); } catch (e) {}
          reject(err);
        });
      });
      r.on('error', reject);
      r.setTimeout(300000, () => r.destroy(new Error('Download timeout')));
    };
    attempt(url);
  });
}

async function handleRequest(req) {
  if (!req || !req.url) {
    return writeResponse(1, 0, req && req.flags || 0, JSON.stringify({ success: false, error: 'Invalid request' }));
  }
  const flags = req.flags || 0;
  try {
    if (flags & FLAG_DOWNLOAD) {
      const result = await doDownload(req, req.url);
      return writeResponse(0, 0, flags, JSON.stringify(result));
    }
    const result = await doGet(req, req.url);
    return writeResponse(0, result.statusCode, flags, JSON.stringify({
      statusCode: result.statusCode,
      headers: result.headers,
      body: result.body,
      url: result.url
    }));
  } catch (e) {
    if (flags & FLAG_DOWNLOAD) {
      return writeResponse(1, 0, flags, JSON.stringify({ success: false, error: e.message || String(e) }));
    }
    return writeResponse(1, 0, flags, JSON.stringify({ error: e.message || String(e) }));
  }
}

parentPort.on('message', () => {
  Atomics.store(ctrl, 1, STATE_IDLE);
  Atomics.notify(ctrl, 1);
});

(async () => {
  while (true) {
    Atomics.wait(ctrl, 1, STATE_IDLE);
    const state = Atomics.load(ctrl, 1);
    if (state === STATE_CANCEL) {
      finishRequest();
      continue;
    }
    if (state === STATE_RESPONSE) {
      Atomics.wait(ctrl, 1, STATE_RESPONSE, 100);
      if (Atomics.load(ctrl, 1) === STATE_RESPONSE) finishRequest();
      continue;
    }
    if (state !== STATE_REQUEST) continue;
    const reqLen = Atomics.load(ctrl, 2);
    let req = null;
    try {
      const raw = Buffer.from(new Uint8Array(reqSab, 0, reqLen)).toString('utf8');
      req = JSON.parse(raw);
    } catch (e) {
      req = null;
    }
    await handleRequest(req);
  }
})();