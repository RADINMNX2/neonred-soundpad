
export interface ChangelogEntry {
  version: string;
  date: string;
  features: {
    added?: string[];
    fixed?: string[];
    removed?: string[];
  };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.0.0",
    date: "2026-08-15",
    features: {
      added: [
        "Settings Rebuilt: Extension management moved out of the page into a brand-new Extensions modal — two clean tabs (Extensions + Store), live active counts, responsive cards and a fresh pink-to-violet identity.",
        "Studio-Grade 10-Band Mic EQ: Fully redesigned equalizer with an animated response-curve scan, floating dB readouts that follow the sliders, PEAK / AVG / Character stat chips, and click-to-reset frequency labels.",
        "Cinematic Loading Screen: A new audio-pulse intro — live waveform bars, EQ ring, vinyl halo and boot status messages that lock in as the app loads.",
        "Smarter Language Setup: The language picker is redesigned (glass cards, flags, recommendation chip) and now appears only once on first launch — never again.",
        "Hardened Extension Engine: Providers now run on a verified request protocol with retries, timeouts, binary-safe responses, redirect handling and FLAC/MP3 output matched to the selected quality — no more hangs or CPU spin.",
        "Resilient Online Music: Chart data is cached and falls back to a second catalog source when the primary one rate-limits, so Featured lists keep loading.",
        "Open Files Directly: Double-clicking a music file in Windows opens it straight into the player.",
        "Crash-Proof Shell: A new error boundary catches unexpected renderer errors and offers a clean reload instead of a silent freeze."
      ],
      fixed: [
        "45 bugs resolved — including 8 critical issues across the audio engine, file system and update pipeline.",
        "Microphone passthrough now shuts down cleanly when injection is off; mic streams no longer leak into the background.",
        "Removed the Tailwind CDN from production builds — styles are compiled into the app, making startup faster and fully offline-safe.",
        "The auto-updater no longer spams errors when the release channel has no file yet; update alerts only appear for real updates.",
        "Fixed 'Requested device not found' when a saved microphone is unplugged — the app now falls back gracefully.",
        "Fixed FLAC files being mislabeled as MP3; extension downloads now match the quality you pick.",
        "The language modal no longer reappears on every launch — your choice was never being saved.",
        "Album-art caching no longer overflows local storage; JSON parse crashes in settings, themes and EQ presets are gone."
      ],
      removed: [
        "Injected runtime scripts (Tailwind CDN, remote import maps) — the app is now fully self-contained."
      ]
    }
  },
  {
    version: "1.3.4",
    date: "2026-08-15",
    features: {
      added: [
        "Real Extension Runtime: The Extension Store is now fully functional — installed providers are executed live in a sandboxed engine and actually search their own catalogs (SoundCloud, Spotify Web, and more).",
        "Verified Package Installation: Community extensions are downloaded from the registry, sha256-checked against the official checksum and extracted before activation — corrupted or tampered packages are refused.",
        "Real Provider Downloads: SoundCloud and Spotify Web tracks are now fetched directly from their native services, then tagged with cover art, title, artist, album, year and ISRC via FFmpeg.",
        "Automatic Fallback: If a provider's live source is unavailable, NeonRed silently falls back to the built-in full-track engine, so a download never dies.",
        "Per-Provider Quality: Installed extensions expose their own real quality options (e.g. SoundCloud MP3) instead of generic buttons."
      ],
      fixed: [
        "Installing an extension used to only register it in the UI — it now also stores the verified package on disk.",
        "Removed a startup race that could prevent community extension packages from loading in the packaged app."
      ]
    }
  },
  {
    version: "1.3.3",
    date: "2026-08-14",
    features: {
      added: [
        "Spatiflac Online Music: Search the global iTunes/Apple catalog right inside the Music Player and stream or download tracks.",
        "Full-Track Playback: Press Play to load the complete track in the best available quality — no more 30-second clips.",
        "Smart Caching: Full tracks are saved to disk on first play, so replaying them never re-downloads.",
        "Online Queue: While an online track is playing, Next/Previous stay inside the online section instead of jumping into your local playlist.",
        "True Lossless FLAC: Download real, uncompressed FLAC files — no account, no login, fully account-free.",
        "30-Second Previews: Preview any track instantly in the track details without saving anything or touching your playlist.",
        "Extension Store: Install community providers (Spotify Web, Qobuz, Tidal, Deezer, Amazon Music, SoundCloud, YouTube Music, Pandora, Apple Music) straight from the SpatiFLAC registry, or add your own registry URL.",
        "Built-in Lossless Engine: Full tracks resolved via YouTube and FLAC converted losslessly with FFmpeg under the hood."
      ],
      fixed: [
        "Online Play previously played only a 30-second preview and added it to your playlist — it now plays the full, cached track.",
        "Skipping tracks while listening to online music used to fall back to the local playlist — it now follows the online list.",
        "FLAC downloads previously required an account and silently fell back to preview quality — they are now real lossless files for everyone.",
        "Fixed raw HTML entities in the Help modal rendering literally."
      ],
      removed: [
        "Qobuz account flow (email/password) removed entirely — FLAC and full downloads now work with zero accounts."
      ]
    }
  },
  {
    version: "1.1.2",
    date: "2024-03-26",
    features: {
      added: [
        "Mini Player Overhaul: Completely redesigned with a large, square artwork style and soft corners to match the main player aesthetic.",
        "Synced Visualizer: The Mini Player visualizer now reacts to real-time audio data from the main engine instead of a simulation.",
        "Adaptive Colors: Mini Player UI and visualizer now glow dynamically based on the album art color.",
        "Smart Positioning: Mini Player now intelligently snaps to the bottom-right of your screen."
      ],
      fixed: [
        "Fixed synchronization issues where the Mini Player would sometimes show 'No Track'.",
        "Resolved an issue where the visualizer data stream would pause when switching windows."
      ]
    }
  },
  {
    version: "1.1.1",
    date: "2024-03-25",
    features: {
      added: [
        "Music Details Editor: Right-click any song in the Music Player to view full metadata.",
        "Album Support: Added Album field to track info and metadata parser.",
        "Copy to Clipboard: Quickly copy Artist or Album names from the details modal.",
        "Visual Enhancements: New glass-morphism modal for track details with blurry backdrops."
      ],
      fixed: [
        "Improved metadata extraction reliability for MP3 files.",
        "Fixed text truncation issues in the playlist view."
      ]
    }
  },
  {
    version: "1.1.0",
    date: "2024-03-24",
    features: {
      added: [
        "Smart Core AI: New intelligent resource manager that monitors FPS and system load.",
        "Zero-Resource Tray Mode: Completely suspends GPU rendering when minimized to Tray, focusing all CPU power on the audio engine.",
        "Context Awareness: Automatically optimizes memory by garbage collecting unused visualizers based on the active page.",
        "Low Power Mode: Automatically simplifies UI animations if the system struggles (FPS < 30)."
      ],
      fixed: [
        "Fixed High CPU Usage: Optimized the performance monitoring loop to run efficiently.",
        "Equalizer UI Overhaul: Fixed label overlapping and positioning issues for better readability.",
        "Visualizer Simulation Fix: Preview now works correctly in Settings regardless of background state."
      ]
    }
  },
  {
    version: "1.0.9",
    date: "2024-03-21",
    features: {
      added: [
        "Auto Update System: Automatically checks GitHub for new releases.",
        "Source Code Export: Get the full source code directly from Settings.",
        "Green Neon Update UI: A fresh look for update notifications.",
        "Delete from Disk: Deleting a sound now removes the file to save space.",
        "What's New Modal: See exactly what changed after every update."
      ],
      fixed: [
        "Fixed an issue where shortcuts wouldn't register on first launch.",
        "Improved mic injection latency.",
        "Minor UI glitches in dark mode."
      ]
    }
  }
];
