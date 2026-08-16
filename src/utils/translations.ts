
export type Language = 'en' | 'fa';

export const translations = {
  en: {
    // Sidebar
    soundPad: "Sound Pad",
    musicPlayer: "Music Player",
    settings: "Settings",
    systemReady: "SYSTEM READY",
    
    // SoundPad
    searchPlaceholder: "Search sounds...",
    deafen: "Deafen",
    muteMic: "Mute Mic",
    stopAll: "Stop All",
    upload: "Upload",
    noSounds: "No sounds loaded",
    dragDrop: "Drag & drop or click upload",
    audioEngineActive: "AUDIO ENGINE ACTIVE",

    // Music Player
    nowPlaying: "Now Playing",
    playlist: "Playlist",
    addSongs: "Add Files",
    addFolder: "Add Folder",
    noSongs: "Your playlist is empty",
    addSongsDesc: "Add MP3, WAV or FLAC files",
    unknownArtist: "Unknown Artist",
    unknownTitle: "Unknown Title",
    equalizer: "Equalizer",
    lyrics: "Lyrics",
    eqProfiles: "Profiles",
    saveProfile: "Save Profile",

    // Online Music (Spatiflac)
    onlineBtn: "Online",
    onlineTitle: "Online Music",
    onlineDesc: "Powered by Spatiflac extensions — search millions of songs, pick quality, play & download.",
    onlineSearchPlaceholder: "Search millions of songs...",
    readyMusic: "Ready For You",
    topCharts: "Top Charts",
    topAlbums: "Top Albums",
    allExtensions: "All Sources",
    searching: "Searching...",
    loadingCharts: "Loading top charts...",
    noResults: "Nothing found",
    noResultsDesc: "Try a different track or enable more extensions.",
    viaExtension: "Found via",
    qualityTitle: "Quality & Versions",
    qualityDesc: "Pick the exact version of this file",
    extensionUsed: "EXTENSION USED",
    playPreview: "Play Preview",
    stopPreview: "Stop",
    download: "Download",
    downloadingTrack: "Downloading...",
    downloadReady: "Downloaded & added to your playlist",
    fallbackNote: "Full quality needs {source} — AAC preview saved instead",
    previewBadge: "PREVIEW",
    requiresBadge: "REQUIRES ACCOUNT",
    addedToPlaylist: "Added to playlist",
    addToPlaylist: "Add to Playlist",
    playOnline: "Play",
    fromExtension: "via",
    downloadFailed: "Download failed",
    playingPreview: "PLAYING PREVIEW",
    playingFullTrack: "Loading full track...",
    playPreviewFallback: "Full track unavailable — playing 30s preview instead",
    playFailed: "Couldn't start playback",
    flacNote: "FLAC is real lossless — converted losslessly by the built-in engine. No account needed.",
    
    // Extension Store
    extStoreTitle: "Extension Store",
    extStoreDesc: "Install community extensions from a SpatiFLAC registry for more providers.",
    extStoreRegistryLabel: "REGISTRY URLS",
    extStoreRegistryPlaceholder: "https://.../registry.json",
    extStoreAddRegistry: "Add",
    extStoreRefresh: "Refresh Store",
    extStoreLoading: "Loading extensions...",
    extStoreRegistryError: "A registry could not be loaded",
    extStoreEmpty: "No extensions found. Add a registry URL or check your connection.",
    extStoreInstall: "Install",
    extStoreInstalled: "INSTALLED",
    extStoreUninstall: "Uninstall",
    extStoreRequires: "Requires app v",
    extStoreInstallError: "Could not install extension",
    
    // Settings
    settingsTitle: "Settings",
    settingsDesc: "Configure audio routing, language, and preferences.",
    refreshDevices: "Refresh Device List",
    stopKeybindTitle: "Global Stop Keybind",
    stopKeybindDesc: "Press this key to stop all sounds instantly.",
    
    // Language Section
    languageTitle: "App Language",
    languageDesc: "Choose your preferred language.",
    langEn: "English",
    langFa: "Persian (Farsi)",

    // System Integration
    sysIntegration: "System Integration",
    sysIntegrationDesc: "Startup and Window behavior.",
    startWindows: "Start with Windows",
    minToTray: "Minimize to Tray on Close",
    
    // Audio Config
    micInput: "Microphone Input",
    micInputDesc: "Select your Real Microphone.",
    micGain: "GAIN",
    micClarity: "CLARITY",
    micNoise: "NOISE & FX",
    micEq10BandTitle: "10-Band Mic Equalizer Studio",
    micEq10BandDesc: "Master your voice tone with studio-grade 10-band DSP filters",
    open10BandEq: "Open 10-Band EQ Studio",
    presets: "Presets",
    presetVocalClarity: "Vocal Clarity Pro",
    presetRadioBroadcast: "Radio Broadcast",
    presetDeEsser: "De-Esser Smooth",
    presetDeepVoice: "Deep Bass Warmth",
    presetDiscordGamer: "Discord Gamer",
    presetFlat: "Flat Linear",
    resetEq: "Reset EQ",
    
    injector: "Injector Output",
    injectorDesc: "Select CABLE Input (VB-Audio).",
    injectorNone: "None (Don't inject)",
    
    monitor: "Monitor Output",
    monitorDesc: "Where YOU hear sounds.",
    monitorDefault: "Default System Output",
    
    masterVol: "Master Volume",
    masterVolDesc: "Controls soundboard volume level.",
    
    appInfo: "Application",
    version: "Version",
    engine: "Engine",
    getSource: "Get Source Code",
    downloading: "Saving...",
    sourceSaved: "Source Saved!",

    // Spatiflac Settings Section
    spatiflacTitle: "Spatiflac Extensions",
    spatiflacDesc: "Enable or disable the music source extensions powering the Online player.",
    spatiflacRepoLabel: "REPOSITORY",
    spatiflacBuiltinRepo: "NeonRed Spatiflac",
    spatiflacBuiltinRepoDesc: "Built-in — always available",
    spatiflacExtensionOn: "Active",
    spatiflacExtensionOff: "Disabled",
    spatiflacPoweredBy: "Online music is powered by the Spatiflac engine. Extensions define which sources can be searched and downloaded.",
    spatiflacQualityNote: "Quality options",
    
    // Device Selectors
    selectedDevice: "SELECTED DEVICE",
    activeDevice: "ACTIVE DEVICE",
    clickToSelect: "Click to select...",
    
    // Modals
    renameTitle: "Rename Sound",
    soundName: "Sound Name",
    cancel: "Cancel",
    save: "Save Changes",
    
    trimTitle: "Trim Sound",
    trimDesc: "Adjust start and end points.",
    trimStart: "Start",
    trimEnd: "End",
    preview: "Preview",
    
    hotkeyTitle: "Global Hotkey",
    hotkeyDesc: "Works even when app is minimized",
    pressKey: "Press any key...",
    clearKey: "Press Backspace to clear",
    setHotkey: "Set Hotkey",

    // Confirmation Modal
    confirmTitle: "Delete Sounds?",
    confirmBody: "Are you sure you want to remove {count} selected sound(s)? This action cannot be undone.",
    confirmDelete: "Yes, Delete",
    confirmSingleBody: "Are you sure you want to delete this sound? This cannot be undone.",

    // Advanced Audio Modal
    advAudioTitle: "Advanced Audio Processing",
    advAudioDesc: "Enhance your microphone quality with professional filters.",
    noiseSuppression: "Noise Suppression",
    noiseDesc: "Removes background noise using AI.",
    echoCancellation: "Echo Cancellation",
    echoDesc: "Prevents speaker feedback.",
    compressor: "Radio Voice (Compressor)",
    compressorDesc: "Evens out volume for a professional broadcast sound.",

    // Help Modal - English
    helpTitle: "Setup Guide",
    
    // Step 1: Install
    step1Title: "1. Install Virtual Cable",
    step1Desc: "The bridge between this app and your games.",
    step1Content: "We need the VB-CABLE driver. It creates a virtual line to send your sounds into Discord or Games.",
    installBtn: "Install Driver",
    installing: "Installing...",
    installSuccess: "Launched! Follow the setup wizard.",
    installError: "Installer missing.",
    restartNotice: "IMPORTANT: Restart your PC after installation!",
    
    // Step 2: Windows Settings
    step2Title: "2. Windows Defaults",
    step2Desc: "Do NOT change your default devices!",
    step2Content: "Keep your Windows Sound Settings as they are.\n\n• Output: Your Headphones\n• Input: Your Real Microphone\n\nSoundPad will handle the routing internally.",

    // Step 3: App Config (Auto Scan)
    step3Title: "3. App Configuration",
    step3Desc: "Let SoundPad connect to the Cable.",
    step3Mic: "Real Microphone",
    step3Inj: "CABLE Input (VB-Audio)",
    step3Mon: "Headphones",
    autoScanBtn: "Start Auto-Scan",
    scanning: "Analyzing Audio Topology...",
    scanSuccess: "Configuration Applied",
    scanFail: "Virtual Cable Not Found",
    deviceFound: "Device Detected",
    deviceMissing: "Missing",
    manualOverride: "Manual Configuration",

    // Step 4: Target Apps
    step4Title: "4. Games & Discord",
    step4Desc: "The most important step.",
    step4Intro: "In Discord, OBS, or Games settings, change your INPUT DEVICE:",
    step4InputLabel: "INPUT DEVICE",
    step4InputValue: "CABLE Output (VB-Audio)",
    step4OutputLabel: "OUTPUT DEVICE",
    step4OutputValue: "Your Headphones",
    step4Note: "By selecting 'CABLE Output', they will hear both your Microphone AND the Soundboard.",

    // Step 5: Pro Tips
    step5Title: "5. Pro Tips",
    step5Desc: "Avoid bad audio quality.",
    step5Tip1: "Turn OFF 'Noise Suppression' in Discord (Standard/Krisp).",
    step5Tip2: "Turn OFF 'Echo Cancellation' in Discord.",
    step5Why: "Why? Because Discord thinks music is background noise and tries to remove it, making it sound underwater!",
    
    next: "Next",
    back: "Back",
    finish: "Finish Setup",
    welcomeTitle: "Welcome to SoundPad",
    welcomeDesc: "Complete Setup Guide (5 Steps)",
    whySetup: "Why do I need setup?",
    whySetupDesc: "To inject audio into games without losing mic quality, we use a bridge called a Virtual Cable.",
    endTour: "End Tour",
    clickToContinue: "Click to continue",
    skipTour: "Skip Tour",
  },
  fa: {
    // Sidebar
    soundPad: "پنل صداها",
    musicPlayer: "موزیک پلیر",
    settings: "تنظیمات",
    systemReady: "سیستم آمادست",
    
    // SoundPad
    searchPlaceholder: "دنبال چی میگردی؟...",
    deafen: "کر شدن (Deafen)",
    muteMic: "بستن مایک",
    stopAll: "سکوت کامل",
    upload: "افزودن صدا",
    noSounds: "هیچی صدا نداری که!",
    dragDrop: "فایل‌هاتو بنداز اینجا یا کلیک کن",
    audioEngineActive: "موتور صوتی روشنه",

    // Music Player
    nowPlaying: "در حال پخش",
    playlist: "لیست پخش",
    addSongs: "افزودن فایل",
    addFolder: "افزودن پوشه",
    noSongs: "لیست پخشت خالیه که!",
    addSongsDesc: "آهنگ‌هاتو با فرمت MP3 یا WAV اضافه کن",
    unknownArtist: "خواننده ناشناس",
    unknownTitle: "بدون عنوان",
    equalizer: "اکولایزر",
    lyrics: "متن آهنگ",
    eqProfiles: "پروفایل‌ها",
    saveProfile: "ذخیره پروفایل",

    // Online Music (Spatiflac)
    onlineBtn: "آنلاین",
    onlineTitle: "موزیک آنلاین",
    onlineDesc: "قدرت گرفته از اکستنشن‌های اسپاتیفلاک — میلیون‌ها آهنگ رو جستجو کن، کیفیت رو انتخاب کن، پخش کن و دانلود کن.",
    onlineSearchPlaceholder: "دنبال آهنگت بگرد...",
    readyMusic: "آماده برات",
    topCharts: "پرفروش‌ترین‌ها",
    topAlbums: "آلبوم‌های برتر",
    allExtensions: "همه منابع",
    searching: "در حال جستجو...",
    loadingCharts: "در حال لود چارت‌ها...",
    noResults: "چیزی پیدا نشد",
    noResultsDesc: "یه اسم دیگه امتحان کن یا اکستنشن‌های بیشتری رو روشن کن.",
    viaExtension: "پیدا شده با",
    qualityTitle: "کیفیت و نسخه‌ها",
    qualityDesc: "دقیقاً همون نسخه‌ای که میخوای رو انتخاب کن",
    extensionUsed: "اکستنشن استفاده شده",
    playPreview: "پخش پیش‌نمایش",
    stopPreview: "ایست",
    download: "دانلود",
    downloadingTrack: "در حال دانلود...",
    downloadReady: "دانلود شد و به لیست پخش اضافه شد",
    fallbackNote: "کیفیت کامل نیاز به {source} داره — به جاش پیش‌نمایش ذخیره شد",
    previewBadge: "پیش‌نمایش",
    requiresBadge: "نیاز به اکانت",
    addedToPlaylist: "به لیست پخش اضافه شد",
    addToPlaylist: "افزودن به لیست پخش",
    playOnline: "پخش",
    fromExtension: "با",
    downloadFailed: "دانلود انجام نشد",
    playingPreview: "در حال پخش پیش‌نمایش",
    playingFullTrack: "در حال بارگیری نسخه کامل...",
    playPreviewFallback: "نسخه کامل در دسترس نبود — پیش‌نمایش ۳۰ ثانیه پخش شد",
    playFailed: "پخش شروع نشد",
    flacNote: "FLAC کاملاً بدون افت کیفیت است — توسط موتور داخلی تبدیل می‌شود. نیازی به اکانت نیست.",
    
    // Extension Store
    extStoreTitle: "فروشگاه اکستنشن",
    extStoreDesc: "اکستنشن‌های انجمن رو از ریجستری اسپاتی‌فلاک نصب کن تا سرویس‌های بیشتری داشته باشی.",
    extStoreRegistryLabel: "آدرس ریجستری",
    extStoreRegistryPlaceholder: "https://.../registry.json",
    extStoreAddRegistry: "افزودن",
    extStoreRefresh: "به‌روزرسانی فروشگاه",
    extStoreLoading: "در حال بارگیری اکستنشن‌ها...",
    extStoreRegistryError: "یکی از ریجستری‌ها بارگیری نشد",
    extStoreEmpty: "اکستنشنی پیدا نشد. یه آدرس ریجستری اضافه کن یا اتصالت رو چک کن.",
    extStoreInstall: "نصب",
    extStoreInstalled: "نصب شده",
    extStoreUninstall: "حذف",
    extStoreRequires: "نیازمند نسخه ",
    extStoreInstallError: "اکستنشن نصب نشد",
    
    // Settings
    settingsTitle: "تنظیمات و اینا",
    settingsDesc: "اینجا می‌تونی ورودی خروجی‌ها و زبون برنامه رو ردیف کنی.",
    refreshDevices: "رفرش لیست دیوایس‌ها",
    stopKeybindTitle: "دکمه سکوت مطلق",
    stopKeybindDesc: "این دکمه رو بزنی همه صداها درجا قطع میشن.",
    
    // Language Section
    languageTitle: "زبون برنامه",
    languageDesc: "هر جور حال میکنی انتخاب کن.",
    langEn: "انگلیسی (English)",
    langFa: "فارسی (خودمون)",

    // System Integration
    sysIntegration: "هماهنگی با سیستم",
    sysIntegrationDesc: "تنظیمات بالا اومدن و بستن برنامه.",
    startWindows: "با ویندوز بیاد بالا",
    minToTray: "بره اون پایین قایم شه (Tray)",
    
    // Audio Config
    micInput: "ورودی میکروفون",
    micInputDesc: "میکروفون اصلیتو انتخاب کن داداش.",
    micGain: "زور صدا",
    micClarity: "شفافیت",
    micNoise: "نویز و افکت",
    micEq10BandTitle: "استودیو اکولایزر ۱۰ بانده میکروفون",
    micEq10BandDesc: "کیفیت و تن صدای میکروفونتو به حالت استودیویی حرفه‌ای تغییر بده",
    open10BandEq: "تنظیم اکولایزر ۱۰ بانده میکروفون",
    presets: "پریست‌های آماده",
    presetVocalClarity: "شفاف‌سازی صدا (Vocal Clarity)",
    presetRadioBroadcast: "صدای گرم رادیویی (Radio Broadcast)",
    presetDeEsser: "کاهش صدای تیز (De-Esser)",
    presetDeepVoice: "صدای بم و سنگین (Deep Bass)",
    presetDiscordGamer: "مخصوص گیم و دیسکورد (Gamer)",
    presetFlat: "مسطح و عادی (Flat)",
    resetEq: "ریست اکولایزر",
    
    injector: "خروجی اینجکتور",
    injectorDesc: "اینو وصل کن به کابل مجازی (VB-Audio).",
    injectorNone: "هیچی (اینجکت نکن)",
    
    monitor: "خروجی مانیتور",
    monitorDesc: "اونجایی که خودت صدا رو میشنوی.",
    monitorDefault: "پیش‌فرض سیستم",
    
    masterVol: "صدای کل",
    masterVolDesc: "ولوم کل ساوندپد رو اینجا کم و زیاد کن.",
    
    appInfo: "درباره برنامه",
    version: "نسخه",
    engine: "موتور",
    getSource: "دانلود سورس کد",
    downloading: "در حال ذخیره...",
    sourceSaved: "سورس ذخیره شد!",

    // Spatiflac Settings Section
    spatiflacTitle: "اکستنشن‌های اسپاتیفلاک",
    spatiflacDesc: "اکستنشن‌های منبع موزیک بخش آنلاین رو اینجا روشن یا خاموش کن.",
    spatiflacRepoLabel: "ریپازیتوری",
    spatiflacBuiltinRepo: "نیون‌رد اسپاتیفلاک",
    spatiflacBuiltinRepoDesc: "ساخته‌شده — همیشه در دسترسه",
    spatiflacExtensionOn: "فعال",
    spatiflacExtensionOff: "غیرفعال",
    spatiflacPoweredBy: "موزیک آنلاین با موتور اسپاتیفلاک کار می‌کنه. اکستنشن‌ها مشخص می‌کنن از کدوم منبع می‌شه جستجو و دانلود کرد.",
    spatiflacQualityNote: "کیفیت‌های قابل انتخاب",

    // Device Selectors
    selectedDevice: "دیوایس انتخاب شده",
    activeDevice: "دیوایس فعال",
    clickToSelect: "انتخاب کنید...",
    
    // Modals
    renameTitle: "تغییر اسم صدا",
    soundName: "اسم صدا",
    cancel: "بیخیال",
    save: "ذخیره کن",
    
    trimTitle: "برش صدا (Trim)",
    trimDesc: "محدوده پخش صدا رو انتخاب کن.",
    trimStart: "شروع",
    trimEnd: "پایان",
    preview: "پیش‌نمایش",
    
    hotkeyTitle: "هات‌کی (دکمه میانبر)",
    hotkeyDesc: "حتی وقتی برنامه پایینه کار میکنه",
    pressKey: "دکمه رو بزن...",
    clearKey: "بک‌اسپیس بزنی پاک میشه",
    setHotkey: "ثبت دکمه",

    // Confirmation Modal
    confirmTitle: "حذف صداها",
    confirmBody: "مطمئنی میخوای {count} تا صدا رو پاک کنی؟ این کار برگشت نداره.",
    confirmDelete: "آره، پاک کن",
    confirmSingleBody: "مطمئنی میخوای این صدا رو پاک کنی؟ دیگه برنمیگرده ها.",

    // Advanced Audio Modal
    advAudioTitle: "پردازش حرفه‌ای صدا",
    advAudioDesc: "کیفیت میکروفون رو با این فیلترها منفجر کن.",
    noiseSuppression: "حذف نویز (Noise Suppression)",
    noiseDesc: "حذف صدای محیط با هوش مصنوعی.",
    echoCancellation: "حذف اکو (Echo Cancellation)",
    echoDesc: "جلوگیری از برگشت صدا.",
    compressor: "صدای رادیویی (Compressor)",
    compressorDesc: "یک‌دست کردن صدا برای حرفه‌ای شنیده شدن.",

    // Help Modal - Persian
    helpTitle: "راهنمای نصب کامل",
    
    // Step 1
    step1Title: "۱. نصب کابل مجازی",
    step1Desc: "پل ارتباطی بین این برنامه و بازی‌ها.",
    step1Content: "برای انتقال صدا نیاز به درایور VB-CABLE داریم. روی دکمه زیر بزن تا نصب شه.",
    installBtn: "شروع نصب هوشمند",
    installing: "در حال اجرای فایل...",
    installSuccess: "نصاب اجرا شد! مراحل رو طی کن.",
    installError: "فایل نصب پیدا نشد.",
    restartNotice: "مهم: بعد از نصب حتماً سیستم رو ریستارت کن!",
    
    // Step 2
    step2Title: "۲. تنظیمات ویندوز",
    step2Desc: "به تنظیمات پیش‌فرض ویندوز دست نزن!",
    step2Content: "تنظیمات صدای ویندوز باید همونجوری که بود بمونه:\n\n• خروجی (Output): هدفون خودت\n• ورودی (Input): میکروفون اصلیت\n\nتغییرات فقط داخل برنامه SoundPad انجام میشه.",

    // Step 3
    step3Title: "۳. پیکربندی برنامه",
    step3Desc: "اتصال SoundPad به کابل مجازی.",
    step3Mic: "میکروفون اصلی",
    step3Inj: "CABLE Input (VB-Audio)",
    step3Mon: "هدفون",
    autoScanBtn: "شروع اسکن هوشمند",
    scanning: "در حال آنالیز سخت‌افزار...",
    scanSuccess: "کانفیگ با موفقیت انجام شد",
    scanFail: "کابل مجازی پیدا نشد",
    deviceFound: "پیدا شد",
    deviceMissing: "نیست",
    manualOverride: "تنظیم دستی",
    
    // Step 4
    step4Title: "۴. تنظیم بازی و دیسکورد",
    step4Desc: "مهم‌ترین مرحله برای شنیده شدن صدا.",
    step4Intro: "توی تنظیمات دیسکورد، OBS یا بازی‌ها، بخش Voice Settings رو اینجوری تغییر بده:",
    step4InputLabel: "INPUT DEVICE (ورودی)",
    step4InputValue: "CABLE Output (VB-Audio)",
    step4OutputLabel: "OUTPUT DEVICE (خروجی)",
    step4OutputValue: "هدفون خودت (Default)",
    step4Note: "با انتخاب CABLE Output، بقیه هم صدای میکروفون تو رو میشنون هم صدای ساوندپد رو.",

    // Step 5
    step5Title: "۵. نکات حرفه‌ای",
    step5Desc: "جلوگیری از خراب شدن صدا.",
    step5Tip1: "گزینه Noise Suppression رو توی دیسکورد خاموش کن.",
    step5Tip2: "گزینه Echo Cancellation رو خاموش کن.",
    step5Why: "چرا؟ چون دیسکورد فکر میکنه موزیک نویزه و حذفش میکنه، صدا میپیچه و خراب میشه!",
    
    next: "بعدی",
    back: "قبلی",
    finish: "بزن بریم!",
    welcomeTitle: "خوش اومدی به ساوندپد",
    welcomeDesc: "راهنمای کامل راه‌اندازی (۵ مرحله)",
    whySetup: "داستان چیه؟",
    whySetupDesc: "برای اینکه هم صدای خودت بره هم صدای آهنگ‌ها بدون افت کیفیت، ما از یک کابل مجازی استفاده می‌کنیم.",
    endTour: "پایان تور",
    clickToContinue: "برای ادامه کلیک کنید",
    skipTour: "رد شدن از تور",
  }
};