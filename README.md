<div align="center">

<pre style="color:#FF2D55;font-weight:bold;line-height:1.15;">
███╗   ██╗ ███████╗  ██████╗ ███╗   ██╗ ██████╗ ███████╗ ██████╗
████╗  ██║ ██╔════╝ ██╔═══██╗████╗  ██║ ██╔══██╗██╔════╝ ██╔══██╗
██╔██╗ ██║ █████╗   ██║   ██║██╔██╗ ██║ ██████╔╝█████╗   ██████╔╝
██║╚██╗██║ ██╔══╝   ██║   ██║██║╚██╗██║ ██╔══██╗██╔══╝   ██╔══██╗
██║ ╚████║ ███████╗ ╚██████╔╝██║ ╚████║ ██║  ██║███████╗ ██║  ██║
╚═╝  ╚═══╝ ╚══════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═╝  ╚═╝╚══════╝ ╚═╝  ╚═╝
███████╗  ██████╗ ██╗   ██╗ ███╗   ██╗ ██████╗ ██████╗  █████╗ ██████╗
██╔════╝ ██╔═══██╗██║   ██║ ████╗  ██║ ██╔══██╗██╔══██╗██╔══██╗██╔══██╗
███████╗ ██║   ██║██║   ██║ ██╔██╗ ██║ ██████╔╝██████╔╝███████║██████╔╝
╚════██║ ██║   ██║██║   ██║ ██║╚██╗██║ ██╔══██╗██╔══██╗██╔══██║██╔══██╗
███████║ ╚██████╔╝╚██████╔╝ ██║ ╚████║ ██║  ██║██║  ██║██║  ██║██║  ██║
╚══════╝  ╚═════╝  ╚═════╝  ╚═╝  ╚═══╝ ╚═╝  ╚═╝╚══════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
</pre>

### A high-performance, modern soundboard for Windows with mic injection and real-time EQ.

[![Version](https://img.shields.io/badge/version-2.0.0-FF2D55.svg?style=flat-square)](https://github.com/RADINMNX2/neonred-soundpad/releases)
[![Windows](https://img.shields.io/badge/Windows-10%20%2F%2011-0078D6.svg?style=flat-square)](https://github.com/RADINMNX2/neonred-soundpad/releases)
[![License](https://img.shields.io/badge/license-MIT-27ae60.svg?style=flat-square)](https://github.com/RADINMNX2/neonred-soundpad/blob/main/package.json)
[![Electron](https://img.shields.io/badge/built%20with-Electron-47848F.svg?style=flat-square)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg?style=flat-square)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178c6.svg?style=flat-square)](https://www.typescriptlang.org/)

<p align="center">
  <a href="#-what-is-neonred">What is NeonRed?</a> •
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-setup-guide">Setup Guide</a> •
  <a href="#-development">Development</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-writing-an-extension">Extensions</a>
</p>

</div>

---

## 🚀 What is NeonRed?

**NeonRed SoundPad** is a complete audio command center for Windows — a soundboard, a real-time microphone studio, and a music player (local *and* online), all in one sleek neon-red glassmorphism app.

- 🎙️ **Mic injection + real-time DSP** — polish your voice with a studio-grade 10-band EQ and effects, then route it straight into Discord, games, and OBS via VB-CABLE.
- 💿 **Lossless online downloads** — stream and download real lossless FLAC tracks from the Apple/iTunes catalog, no account required.
- 🌐 **Fully bilingual** — English and **فارسی (Persian)** with a complete right-to-left (RTL) layout.

---

## ✨ Highlights

| Preview | What you'll see |
| :---: | :--- |
| 🔊 **Soundboard** | [![Soundboard](docs/screenshots/soundboard.png)](docs/screenshots/soundboard.png) — Custom pads, global hotkeys, drag & drop upload, delete-from-disk |
| 🎙️ **Mic DSP Studio** | [![Mic DSP](docs/screenshots/mic-dsp.png)](docs/screenshots/mic-dsp.png) — 10-band EQ with response curve, voice clarity, noise suppression, gate, echo cancellation, compressor |
| 🎵 **Music Player** | [![Music Player](docs/screenshots/music-player.png)](docs/screenshots/music-player.png) — Library, metadata & album art, playlists, trim, synced visualizer, Mini Player glow |
| 🌐 **Spatiflac Online Music** | [![Online Music](docs/screenshots/spatiflac-online.png)](docs/screenshots/spatiflac-online.png) — Catalog search, 30s previews, full tracks, lossless FLAC, smart caching |
| 🧩 **Extensions & Settings** | [![Extensions Store](docs/screenshots/extensions-store.png)](docs/screenshots/extensions-store.png) — Community providers, sandboxed runtime, redesigned v2.0.0 Settings |

---

## 💎 Features

### 🔊 Soundboard
- Play custom sounds instantly from a keyboard-friendly pad grid
- Assign a **global hotkey** to any pad and trigger it from anywhere
- **Drag & drop** audio files straight onto the app to add pads
- Delete a sound — and its file — from disk right from the app
- Trim any sound to start/end exactly where you need
- Per-pad playback volume, plus master and mic volume

### 🎙️ Microphone DSP Studio
- **10-band EQ** (`31 Hz – 16 kHz`) with presets: Vocal Clarity, Radio Broadcast, De-Esser, Deep Bass, Gamer, Flat — plus a live response-curve preview
- **Mic gain boost** and **voice clarity** enhancement
- **Noise suppression**, **noise gate**, and **echo cancellation**
- Built-in **compressor** with studio parameters
- Every effect adjusts **live**, while you speak

### 🎵 Music Player
- Import local music — `.mp3`, `.wav`, `.flac`, `.ogg`, `.m4a` and more
- Metadata & **album art** extraction (jsmediatags), track details editor, copy artist/album
- Playlists, shuffle/repeat, 30-second trim tool
- Real-time synced **visualizer** (HTML5 Canvas)
- **Mini Player** that snaps to your screen corner and **glows with your album art's colors**
- Open music files from Windows directly in NeonRed

### 🌐 Online Music — Spatiflac Engine
- Search the **iTunes/Apple catalog** from inside the app
- **30-second previews** without downloading anything
- **Full-track streaming** with smart disk caching (replays never re-download)
- Download **true lossless FLAC** via FFmpeg — no account, no login
- **Extension store**: install community providers — Spotify Web, Qobuz, Tidal, Deezer, Amazon Music, SoundCloud, YouTube Music, Pandora, Apple Music
- Add your own **custom registry URLs**, verify **sha256 package checksums**, enable/disable per provider

### 🧠 Smart Core AI
- Monitors **FPS and system load**; automatically simplifies UI animations when the system struggles
- **Zero-resource tray mode**: GPU rendering is suspended when minimized to tray while audio keeps playing
- Suspends the visualizer loop when the window is hidden

### ⚙️ System & Integration
- **Start with Windows**, **minimize to tray**
- **Auto-updates** delivered from GitHub Releases
- **Export the app source code** directly from Settings
- Neon-red glassmorphism UI with themes and color presets

---

## 📥 Download & Install

1. Go to the [**GitHub Releases**](https://github.com/RADINMNX2/neonred-soundpad/releases) page.
2. Download the latest installer for **Windows 10/11** and run it.
3. Done — NeonRed is ready to go.

> 🛡️ **About Windows SmartScreen:** the first time you run the installer, Windows may show an *"unknown publisher"* warning. This is normal for open-source apps without a paid code-signing certificate. Click **More info → Run anyway**.

> 🎤 **First mic setup:** the first time you configure mic injection, the app offers to install **VB-CABLE** (the free virtual audio cable) automatically if it isn't already present.

---

## ⚡ Quick Start (3 Steps)

1. **Pick your microphone** — open **Settings → Microphone Input** and select your real mic.
2. **Enable VB-CABLE** — when the app asks, let it install VB-CABLE, then select **"CABLE Input (VB-Audio)"** as the **Injector Output**.
3. **Choose your monitor** — pick your headphones as the **Monitor Output**. Done! Your processed voice now goes straight into your calls.

### 🛠️ Setup Guide (Discord / Games / OBS)

To let others *hear* your sounds, the target app must also listen to the cable:

1. **Install the driver** — in the app, **Help/Guide → Install Driver** installs VB-CABLE. (Restart your PC after installing.)
2. **Configure NeonRed** (Settings page):
   - **Microphone Input:** your *real* microphone (e.g. Blue Yeti, headset mic).
   - **Injector Output:** `CABLE Input (VB-Audio Virtual Cable)`.
   - **Monitor Output:** your *headphones/speakers* (so you hear the sounds too).
3. **Configure Discord / games** — change the app's **Input Device** (Discord → Settings → Voice & Video):
   - ❌ **Old:** Your real microphone.
   - ✅ **New:** `CABLE Output (VB-Audio Virtual Cable)`.

*Now when you speak, NeonRed processes your voice and sends it to the cable; when you play a sound, it mixes into the cable. Everyone hears both.*

### 🔧 Troubleshooting

- 🔇 **Nothing heard in the call?** Open Windows sound settings and make sure **"CABLE Output"** is set as your default playback device.
- 🔊 **You hear yourself?** Lower the monitoring volume, or pick a different Monitor Output device.
- ⚠️ **"Requested device not found"?** Unplug and replug your microphone, then re-select it in Settings — the app now falls back gracefully.

---

## 🆕 What's New in 2.0.0

- 🎛️ **Redesigned Settings** — extension management moved into a new Extensions modal (Extensions + Store tabs, live active counts)
- 🎚️ **Redesigned 10-band mic EQ studio** — animated response curve, floating dB readouts, PEAK/AVG/Character stats, click-to-reset bands
- 🎬 **Cinematic loading screen** — audio-pulse waveform, EQ ring and vinyl halo
- 🌐 **Language picker** now shows only once (and is fully redesigned)
- 🛡️ **Hardened extension engine** — verified request protocol, retries, timeouts, binary-safe responses, FLAC/MP3 output matched to quality
- 🐛 **45 bugs fixed** — mic stream leaks, updater 404 noise, "Requested device not found" fallback, FLAC mislabel, JSON parse crashes, localStorage overflows, crash-proof error boundary, and fully self-contained builds (no CDN)

---

## 🌍 فارسی / Persian

NeonRed is **fully bilingual** — English and **Persian (فارسی)** with complete RTL support.

- Switch languages anytime in **Settings → Language**.
- The Persian interface **mirrors its layout automatically** — panels, sliders and menus feel native.
- No restart required — the change applies instantly.

---

## 💻 Development

```bash
# 1. Clone the repository
git clone https://github.com/RADINMNX2/neonred-soundpad.git
cd neonred-soundpad

# 2. Install dependencies
npm install

# 3. Start in Development Mode (hot reloading)
npm run electron:dev
```

| Script | What it does |
| ------ | ------------ |
| `npm start` | CRA dev server (port 3000) |
| `npm run prebuild` | `scripts/zip-source.js` — zips the source into `public/source.zip` |
| `npm run build` | `prebuild` + `react-scripts build` |
| `npm run electron:dev` | CRA dev server + `electron .` (waits for port 3000) |
| `npm run dist` | clean, build, then `electron-builder -w` (NSIS installer) |

**Stack:** Electron 28 · React 18 · TypeScript 4.9 · Tailwind CSS 3 · Web Audio API · HTML5 Canvas · FFmpeg (`ffmpeg-static`) · ytdl-core / yt-search · jsmediatags · lucide-react · electron-builder / electron-updater

---

## 🏗️ Architecture

Three processes cooperate:

```
┌────────────────────────── MAIN PROCESS (main.js) ──────────────────────────┐
│  • Window lifecycle (main / mini-player / tray), tray icon, global hooks   │
│  • electron-updater (check / download / install)                           │
│  • File import → userData/sounds, source export, VB-CABLE installer        │
│  • Spatiflac runtime: extension install/search/download, FLAC conversion,  │
│    YouTube full-track engine, HTTP downloads                               │
└───────────────▲───────────────────────────▲────────────────────────────────┘
                │ IPC (send/invoke)         │ events (webContents.send)
┌───────────────┴────────── PRELOAD (preload.js) ──┴─────────────────────────┐
│  contextBridge.exposeInMainWorld('electronAPI', …) — the only surface the  │
│  renderer can touch (contextIsolation: true, nodeIntegration: false)       │
└───────────────▲────────────────────────────────────────────────────────────┘
                │ window.electronAPI.*
┌───────────────┴─────────────────── REACT RENDERER (src/) ──────────────────┐
│  App.tsx switches on URL query:                                             │
│    ?mode=mini  → <MiniPlayer/>    (frameless, always-on-top)                │
│    ?mode=tray  → <TrayMenu/>      (popup above the tray icon)               │
│    (none)      → full app: TitleBar + SoundPad | MusicPlayer | Settings     │
│  All audio lives HERE (Web Audio API).                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Single instance** — a second launch focuses the main window and forwards "Open With" file paths (`open-file`).
- **Close behavior** — closing the main window never quits: if music is playing it shows the Mini Player, otherwise it hides to tray.
- **Mini Player sync** — the main window pushes `music-state-change` and `visualizer-data-update` frames; the Mini Player sends back play/pause/next/prev and seek commands.
- **Device enumeration is renderer-side** — `getUserMedia` + `enumerateDevices`, no device IPC.

### Folder Structure

```
neonred-soundpad/
├── main.js                          # Electron main process (all IPC handlers)
├── preload.js                       # contextBridge → window.electronAPI
├── spatiflac-extension-runtime.js   # Main-process side of the .sflx runtime
├── sflx-extension-worker.js         # worker_threads: sandboxed vm for extension code
├── sflx-http-worker.js              # worker_threads: HTTP engine over SharedArrayBuffer
├── scripts/zip-source.js            # prebuild: packages source into public/source.zip
├── .github/workflows/build.yml      # CI: build + GitHub Release upload
├── public/
│   ├── index.html                   # app shell (jsmediatags CDN)
│   └── assets/                      # VB driver, fonts (Inter + Vazirmatn), icons
└── src/
    ├── App.tsx                      # providers, page switching, window modes, device state
    ├── constants.ts                 # APP_NAME, VERSION, COLORS
    ├── types.ts                     # shared types + window.electronAPI declaration
    ├── pages/                       # SoundPad, MusicPlayer, Settings, MiniPlayer
    ├── components/                  # modals (EQ, extensions, device, hotkey, update, …)
    ├── context/                     # LanguageContext, SmartCoreContext, ThemeContext
    ├── utils/                       # spatiflac.ts, extensionRegistry.ts, audioHelpers.ts, translations.ts
    ├── data/changelog.ts            # "What's New" entries
    └── index.css                    # global styles + custom keyframes
```

### Audio Engine

All audio runs in the **renderer** using the Web Audio API — the main process never touches audio.

- **SoundPad (dual-output playback):** each sound plays as two `<audio>` elements — one routed to your speakers (Monitor) with `setSinkId`, one routed to VB-CABLE (Injector). Deafen mutes the monitor, Mic Mute mutes the injector.
- **Mic chain:** `getUserMedia` → gain → 10× BiquadFilter (EQ) → clarity highshelf → compressor → destination → VB-CABLE. EQ/clarity/compressor parameters update live with `setTargetAtTime`.
- **MusicPlayer:** `<audio>` → 10× peaking EQ → analyser → master gain → destination, with `setSinkId` re-applied before every play.
- The 10-band EQ uses `lowshelf` on the first band and `highshelf` on the last; `noiseGateThreshold` exists in the settings model (default off) with browser-level noise suppression active via constraints.

### IPC Channel Map (excerpt)

Renderer → Main (`invoke`): `save-sound-file`, `delete-sound-file` (path-traversal guarded), `save-source-code`, `install-vb-cable`, `online-download`, `online-full-track`, `online-download-track`, `extensions-installed`, `extensions-install` (sha256 verified), `extensions-uninstall`, `extensions-search`, `extensions-download`, `check-for-updates`, `download-update`, `install-update`, `register-shortcuts`, `set-start-at-login`, `sync-music-state`, `send-music-control`, `seek-music`, `sync-visualizer-data`, plus window control channels.

Main → Renderer (events): `update-available`, `update-progress`, `update-downloaded`, `update-error` (a missing `latest.yml`/404 is silently treated as "no update"), `open-file`, `shortcut-triggered`, `music-state-change`, `music-control-action`, `seek-music-action`, `visualizer-data-update`, `online-download-progress`.

### Data Persistence

Settings live in `localStorage` (`app_language`, `hasPickedLanguage`, `micEqSettings`, `monitorDeviceId`, `injectorDeviceId`, `micInputDeviceId`, `masterVolume`, `micVolume`, `soundpad_sounds`, `music_playlist`, `spatiflac_enabled_extensions`, `spatiflac_registry_urls`, `startWithWindows`, …). Files live under:

- `userData/sounds/` — imported sound files
- `userData/extensions/` — installed `.sflx` packages
- `userData/bin/` — extracted FFmpeg binary
- `Music/NeonRed Spatiflac/` — downloaded tracks (+ `.cache/`)

---

## 🧩 Writing an Extension

Spatiflac extensions are ZIP packages containing exactly `manifest.json` + `index.js` at the archive root. Installs are **sha256-verified** and run in a **sandboxed worker thread** (`vm` sandbox, no Node globals — only an injected API).

```json
{
  "name": "my-provider",
  "displayName": "My Provider",
  "version": "1.0.0",
  "description": "Search & download from My Provider",
  "type": ["metadata_provider", "download_provider"],
  "qualityOptions": [
    { "id": "FLAC", "label": "FLAC Lossless", "description": "Full track · lossless", "ext": "flac" },
    { "id": "BEST", "label": "Best Quality", "description": "Full track", "ext": "mp3" }
  ],
  "minAppVersion": "2.0.0"
}
```

```js
registerExtension({
  searchTracks: async function (query, limit) {
    const res = await http.get('https://api.example.com/search?q=' + encodeURIComponent(query), {
      'User-Agent': randomUserAgent()
    });
    if (res.statusCode !== 200) return [];
    return JSON.parse(res.body).results.map((r) => ({
      id: String(r.id), name: r.title, artists: r.artist,
      album_name: r.album, cover_url: r.artwork, duration_ms: r.duration_ms
    }));
  },

  download: async function (trackId, qualityId, outputPath, onProgress) {
    const info = await http.get('https://api.example.com/stream/' + trackId);
    if (info.statusCode !== 200) throw new Error('Stream not found');
    const dl = await file.download(JSON.parse(info.body).streamUrl, outputPath, {
      headers: { 'User-Agent': randomUserAgent() }
    });
    if (!dl.success) throw new Error(dl.error || 'Download failed');
    return { file_path: outputPath, title: '…', artist: '…', album: '…', isrc: '…' };
  }
});
```

**Sandbox API:** `http` (`get`/`post`, synchronous, binary-safe), `file` (download/write/read/exists/delete), `storage` (persisted to `storage.json`), `utils` (user agents, hashes, base64, HMAC), `matching` (normalize, similarity, duration), `log`.

**Publishing:** a registry is a JSON document with an `extensions` array (`id`, `name`, `version`, `description`, `download_url`, `sha256`, `category`, `tags`, `min_app_version`, `icon_url`, …). Users add registry URLs in **Settings → Extensions → Store**; entries are deduplicated by `id` across registries.

---

## 📦 Build & Release

- `npm run dist` → clean + build + `electron-builder -w` (NSIS, user-selectable install dir, desktop + start-menu shortcuts).
- **Auto-update:** `electron-updater` with a GitHub feed; `autoDownload: false`, the renderer drives check → download → install. `latest.yml` is published to Releases by CI.
- **CI:** `.github/workflows/build.yml` builds on Windows and uploads `dist/*.exe` + `*.blockmap` to GitHub Releases on tags — exactly what feeds the auto-updater.
- **File associations:** `.mp3/.wav/.ogg/.flac/.m4a` open directly in the Music Player.
- **Source export:** Settings → App Info → Get Source Code saves the bundled `source.zip` (generated by `prebuild`).

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Run `npm run build` — it must pass before pushing
4. Commit your Changes
5. Push to the Branch and open a Pull Request

**Code style:**
- **No explanatory comments** in new code — the codebase is deliberately comment-free in logic paths.
- **Tailwind-only styling** — utility classes, no extra CSS files beyond `src/index.css`.
- **RTL awareness** — use `const { t, isRTL } = useLanguage()` for any directional styling.
- **Localization** — new user-facing strings must be added to **both** `en` and `fa` in `src/utils/translations.ts`.
- Don't bump `version` in `package.json` (maintainer handles releases); update `src/data/changelog.ts` for user-visible changes.

---

## 💬 Feedback & Support

- 🐛 Report a bug or ask a question: [GitHub Issues](https://github.com/RADINMNX2/neonred-soundpad/issues)
- 💡 Request a feature: open an issue and tag it as a feature request
- ✉️ Email: [radinmnx@gmail.com](mailto:radinmnx@gmail.com)

---

## 👤 Author & License

**RADINMNX** — [GitHub](https://github.com/RADINMNX2) · [Email](mailto:radinmnx@gmail.com)

Released under the **MIT License**. Built with ❤️, 🎧, and far too much neon.

> VB-CABLE driver by VB-Audio Software is bundled for one-click installation.