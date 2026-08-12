
export interface SoundEffect {
  id: string;
  name: string;
  url: string; // Blob URL or Data URL
  path?: string; // File system path for Electron
  color: string;
  volume: number;
  shortcut?: string;
  duration?: number;
  image?: string;
  isFavorite?: boolean;
  trimStart?: number;
  trimEnd?: number;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  url: string;
  path?: string;
  duration: number;
  cover?: string;
}

export interface MiniPlayerState {
  track: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface VisualizerConfig {
  isEnabled: boolean;
  height: number;      // 0.5 to 2.0
  sensitivity: number; // 0.5 to 3.0
  barCount: number;    // 20 to 100
  barGap: number;      // 1 to 10
  colorMode: 'auto' | 'manual';
  manualColor: string;
}

// Extending HTMLAudioElement to support setSinkId
export interface ExtendedAudioElement extends HTMLAudioElement {
  setSinkId(deviceId: string): Promise<void>;
  sinkId: string;
}

export interface AudioDevice {
  deviceId: string;
  kind: string;
  label: string;
  groupId: string;
}

export enum Page {
  PAD = 'PAD',
  MUSIC = 'MUSIC',
  SETTINGS = 'SETTINGS'
}

export interface MicEqSettings {
  micGain: number;
  voiceClarity: number;
  noiseSuppression: boolean;
  noiseGateThreshold: number;
  echoCancellation: boolean;
  compressor: boolean;
  eq10Bands?: number[];
}

export interface AppSettings {
  masterVolume: number;
  micVolume: number;
  monitorDeviceId: string;
  injectorDeviceId: string;
  micInputDeviceId: string;
  startWithWindows: boolean;
  minimizeToTray: boolean;
  micEq: MicEqSettings;
}

export interface GlobalShortcut {
  id: string;
  accelerator: string;
}

export interface UpdateInfo {
  version: string;
  files: any[];
  path: string;
  sha512: string;
  releaseDate: string;
}

export interface UpdateProgress {
  bytesPerSecond: number;
  delta: number;
  percent: number;
  total: number;
  transferred: number;
}

// Add Electron API definition to Window
declare global {
  interface Window {
    electronAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      hideToTray: () => void;
      showMainApp: () => void;
      quitApp: () => void;
      registerShortcuts: (shortcuts: GlobalShortcut[]) => void;
      onShortcutTriggered: (callback: (id: string) => void) => void;
      removeShortcutListener: () => void;
      saveSoundFile: (path: string) => Promise<string>;
      deleteSoundFile: (path: string) => Promise<{ success: boolean; error?: string }>;
      setStartAtLogin: (enabled: boolean) => void;
      installVBCable: () => Promise<{ success: boolean; error?: string }>;
      saveSourceCode: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
      
      // File Open
      onFileOpened: (callback: (path: string) => void) => () => void;

      // Updates
      checkForUpdates: () => void;
      downloadUpdate: () => void;
      installUpdate: () => void;
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
      onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void;
      onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
      onUpdateError: (callback: (err: string) => void) => () => void;

      // Mini Player Sync
      switchToMini: () => void; 
      syncMusicState: (state: MiniPlayerState) => void;
      onMusicStateChange: (callback: (state: MiniPlayerState) => void) => () => void;
      sendMusicControl: (action: 'play' | 'pause' | 'next' | 'prev') => void;
      onMusicControl: (callback: (action: string) => void) => () => void;
      
      // Visualizer Sync (NEW)
      syncVisualizerData: (data: Uint8Array) => void;
      onVisualizerData: (callback: (data: Uint8Array) => void) => () => void;

      // Seeking
      seekMusic: (time: number) => void;
      onSeekMusic: (callback: (time: number) => void) => () => void;
    };
    jsmediatags?: any;
  }
}
