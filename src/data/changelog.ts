
export interface ChangelogEntry {
  version: string;
  date: string;
  features: {
    added?: string[];
    fixed?: string[];
    removed?: string[];
  };
  featuresFa?: {
    added?: string[];
    fixed?: string[];
    removed?: string[];
  };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.4.0",
    date: "2026-09-08",
    features: {
      added: [
        "Smart Music Library: point NeonRed at your music folders and it scans them at lightning speed (batched in the background, zero UI stutter) — every track plays straight from its original folder, nothing is copied or moved, so zero space is wasted.",
        "Auto-Sync With Your Disk: the app remembers your library folders and re-scans them, automatically adding newly discovered songs and removing tracks whose files have been deleted from disk — your playlist is always a true mirror of your hard drive.",
        "Deleted-file cleanup is fully incremental and processed in the background, so even a 1,000,000-track library stays buttery smooth while syncing.",
        "Casual Persian What's New: the changelog now speaks casual Persian, so Persian-speaking users instantly understand what changed in every release.",
        "Online Music is now honestly labeled as a preview/demo build while the Spatiflac provider runtime is finalized.",
      ],
      fixed: [
        "Files discovered by more than one folder scan (or added manually before a scan) are now deduplicated by their real path — no more double entries.",
      ]
    },
    featuresFa: {
      added: [
        "کتابخونهٔ هوشمند موزیک: پوشه‌هات رو معرفی کن و برنامه با سرعت نور اسکنشون میکنه (توی پس‌زمینه و بدون لگ) — همهٔ آهنگ‌ها مستقیم از همون پوشهٔ خودشون پخش میشن، نه کپی میشن نه جابه‌جا؛ یه بایت فضا هم اشغال نمیشه.",
        "همگام‌سازی خودکار با دیسکت: برنامه پوشه‌هات رو یادش می‌مونه و همیشه چکشون میکنه — آهنگ‌های تازه‌اضافه‌شده رو خودش پیدا میکنه و آهنگ‌هایی که فایلشون از دیسک پاک شده رو هم خودش از لیست پخش حذف میکنه.",
        "پاک‌سازی فایل‌های حذف‌شده کاملاً توی پس‌زمینه و مرحله‌به‌مرحله انجام میشه، پس حتی با یه کتابخونهٔ ۱٬۰۰۰٬۰۰۰ تایی بازم همه‌چیز نرم و روانه.",
        "ول‌سرویس فارسی خودمونی: چیزای جدید که تغییر کرده حالا به فارسی خودمونی نشون داده میشه تا فارسی‌زبانا سریع بفهمن چی عوض شده.",
        "بخش موزیک آنلاین حالا صادقانه به‌عنوان نسخهٔ پیش‌نمایش (دمو) نشون داده میشه تا وقتی موتور اسپاتیفلاک کاملاً آماده بشه.",
      ],
      fixed: [
        "آهنگ‌هایی که با چند بار اسکن (یا با افزودن دستی قبل از اسکن) پیدا می‌شن حالا بر اساس مسیر واقعیشون تکراری‌زدایی می‌شن — دیگه دوبار توی لیست نمیاد.",
      ]
    }
  },
  {
    version: "2.3.0",
    date: "2026-09-08",
    features: {
      added: [
        "Turbo-Virtualized Playlist (the big one): the playlist now renders ONLY the rows you can actually see, no matter how huge it is. Even with 1,000,000 tracks the list stays buttery smooth — scrolling, search, select-mode and drag-to-reorder all work instantly instead of freezing and crashing the window.",
        "Zero-Freeze Startup & Saving: giant playlists no longer block the renderer on launch, and saving is paused above 5,000 tracks so the app never stutters or dies while typing.",
        "Crisper Text Everywhere: the running-track title and active lyric line no longer use GPU gradient-clipped text (the old technique rendered blurry on Windows) — they now render sharp neon with a soft glow instead.",
      ],
      fixed: [
        "Fixed the 'page keeps refreshing' bug: the old code mounted every single song as a real element, so a big library would freeze the page until the window auto-reloaded in an endless loop. Now only ~20 rows are in the DOM at any moment.",
        "Fixed the loading screen occasionally restarting or never finishing, caused by an unstable completion callback.",
        "Fixed blurry/faded text on the active track title and current lyric line.",
      ]
    },
    featuresFa: {
      added: [
        "لیست پخش مجازی (همونی که واقعاً مهم بود): حالا فقط تایی‌ها رندر میشن که واقعاً دیده میشن، مهم نیست لیستت چقدر گنده باشه. حتی با ۱٬۰۰۰٬۰۰۰ آهنگ بازم همه‌چیز روانه — اسکرول، جستجو، حالت انتخاب و کشیدن و رها کردن همه فوری کار می‌کنن به‌جای اینکه صفحه قفل بشه و بپره.",
        "شروع و ذخیره‌سازی بدون فریز: لیست‌های گنده دیگه موقع بالا اومدن برنامه رو قفل نمی‌کنن، و ذخیره‌سازی بعد از ۵٬۰۰۰ آهنگ متوقف میشه تا هیچوقت برنامه لکنت نکنه.",
        "متن‌های تیزتر همه‌جا: عنوان آهنگ در حال پخش و خط فعال لیریک دیگه از متن گرادیانی GPU استفاده نمی‌کنن (که روی ویندوز مات می‌شد) — حالا شفاف و نئونی با یه هالهٔ نرم رندر میشن.",
      ],
      fixed: [
        "باگ «صفحه مدام رفرش میشد» درست شد: کد قبلی همهٔ آهنگ‌ها رو به‌صورت المان واقعی می‌ساخت، پس با یه کتابخونهٔ بزرگ صفحه فریز می‌شد تا پنجره توی یه حلقهٔ بی‌پایان اتو-ری‌لود بشه. حالا فقط ~۲۰ ردیف توی DOM هستن.",
        "صفحهٔ لودینگ که بعضی وقت‌ها دوباره شروع می‌شد یا تموم نمی‌شد درست شد (مشکل از یه کالبک ناپایدار بود).",
        "متن مات/کمرنگ روی عنوان آهنگ فعال و خط لیریک فعلی درست شد.",
      ]
    }
  },
  {
    version: "2.2.0",
    date: "2026-09-07",
    features: {
      added: [
        "Escape-to-Close Everywhere: The Color Picker, Device Selector, Rename and Update modals now dismiss cleanly with the Escape key — no more hunting for the ✕.",
        "Full Reduced-Motion Mode: All cinematic animations (page sweeps, EQ bars, pulse/spin/shimmer, halo, lyrics glow) are now switched off under the OS Reduce Motion setting and the in-app Low Power mode — smooth and battery-friendly.",
        "Smoother Local Persistence: The Music Playlist and Visualizer Studio config now save with debouncing, so rapid editing no longer hammers localStorage.",
      ],
      fixed: [
        "Modals that previously ignored the keyboard are fixed — Escape closes the Color Picker, Device Selector, Rename and Update dialogs consistently."
      ]
    }
  },
  {
    version: "2.1.2",
    date: "2026-08-16",
    features: {
      fixed: [
        "Fixed a startup crash in the App shell (missing useCallback import) that could freeze the renderer right after launch.",
        "Fixed the same class of bug in the Music Player queue (missing useMemo import) — the search / grouping engine now runs safely."
      ]
    }
  },
  {
    version: "2.1.1",
    date: "2026-08-16",
    features: {
      added: [
        "Playlist 2.0: A modernized queue with instant search (press /), album-grouped sticky headers, drag-and-drop reorder with drop indicators, and a jump-to-current-track button.",
        "Per-Track Mini EQ: Each playing row lights up with its own animated equalizer bars — you can always see what's alive.",
        "Smarter Playlist Actions: A clean per-row menu for play / details / remove, plus a selection mode for mass cleanup.",
        "Cinematic Page Transitions: Switching between Settings, Soundboard and Music Player now glides with a directional sweep, staggered children and a glowing progress indicator — with automatic reduced-motion support.",
        "Mic EQ Studio Upgrade: Draft mode with Cancel/Save, fine-tune +/- buttons per band, live response-curve canvas, vertical axis legend, keyboard-friendly sliders and a proper focus trap."
      ],
      fixed: [
        "Fixed the blur/lyrics overlay stealing clicks — equalizer, minimize and settings buttons on the cover are clickable again.",
        "Mic EQ modal now closes with Escape, remembers your starting point until you Save, and no longer double-buffers the curve with stale frames."
      ]
    }
  },
  {
    version: "2.1.0",
    date: "2026-08-16",
    features: {
      added: [
        "Lyrics & Subtitles: Synchronized lyrics overlay in the Music Player with a blurred-art stage, glowing active-line highlight, progress underline and click-to-seek on any line.",
        "Mini Player Lyrics: The compact player gets the same synced lyrics experience — open the overlay right from the album art.",
        "Sidecar .lrc Support: Drop a .lrc file next to your audio file and NeonRed loads it automatically; embedded USLT lyrics are read too.",
        "Visualizer 2.0: A brand-new neon core — mirrored rounded bars with glow caps and peak dots, reflections, smart frequency mapping, buttery physics and smoother peaks.",
        "Crisper Rendering: The visualizer now renders at full display resolution and adapts to any size, with a 60fps data pipeline that keeps the Mini Player light."
      ],
      fixed: [
        "The visualizer no longer tears down its animation loop when the player window is minimized.",
        "Mini Player no longer re-renders its whole UI 60 times per second while visualizer data streams in.",
        "Bars now fade out gracefully (no more frozen spikes) when playback pauses or the window goes to background."
      ]
    }
  },
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
