
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, 
  ListMusic, Music, Volume2, VolumeX, Trash2, Plus, Disc, Sliders, X, MousePointer2, Settings, Shrink, Globe, FileText, Search, XCircle, ChevronUp,
  Folder, FolderPlus, Library, RefreshCw, HardDrive, Loader2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { MusicTrack, ExtendedAudioElement, VisualizerConfig, SpatiflacExtension, OnlineTrack, QualityOption } from '../types';
import { fileToBase64, extractAlbumArt, getDominantColor, parseAudioMetadata } from '../utils/audioHelpers';
import { buildLrcPath } from '../utils/lyrics';
import RealTimeVisualizer from '../components/RealTimeVisualizer';
import VisualizerSeekBar from '../components/VisualizerSeekBar';
import VolumeSlider from '../components/VolumeSlider';
import EqualizerModal from '../components/EqualizerModal';
import ConfirmationModal from '../components/ConfirmationModal';
import MusicDetailsModal from '../components/MusicDetailsModal';
import PlayerSettingsModal from '../components/PlayerSettingsModal';
import OnlineMusicPanel from '../components/OnlineMusicPanel';
import LyricsOverlay from '../components/LyricsOverlay';
import PlaylistRow from '../components/PlaylistRow';
import { loadExtensions, downloadOnlineTrack, resolveFullTrack, EXTENSIONS_CHANGED_EVENT } from '../utils/spatiflac';

interface MusicPlayerProps {
  monitorDeviceId: string;
  masterVolume: number;
  initialFile?: { path: string; id: number };
  onInitialFileConsumed?: () => void;
}

// 10-band frequencies standard for EQ
const FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

// Pre-allocate typed arrays for audio processing to reduce garbage collection
const AUDIO_BUFFER_SIZE = 256;

// Virtual list geometry (must match the rendered row CSS)
const TRACK_ROW_H = 72;   // 64px row + 8px mb-2 gap
const HEADER_ROW_H = 34;  // sticky album header (height is pinned by inline style)
const LIST_OVERSCAN = 4;  // rows buffered above/below the viewport
const LIST_TOP_PAD = 16;  // top padding inside the scroll content
const MAX_PERSIST_TRACKS = 5000; // above this, skip blocking localStorage writes

type VirtualRow =
  | { kind: 'header'; key: string; album: string; count: number }
  | { kind: 'track'; key: string; track: MusicTrack; playlistIndex: number; displayIndex: number };

interface VirtualLayout {
  rows: VirtualRow[];
  offsets: Float64Array;
  heights: Float64Array;
  totalHeight: number;
  indexToRow: Map<number, number>;
  idToIndex: Map<string, number>;
  searchCount: number;
}

const EMPTY_LAYOUT: VirtualLayout = {
  rows: [],
  offsets: new Float64Array(0),
  heights: new Float64Array(0),
  totalHeight: 0,
  indexToRow: new Map(),
  idToIndex: new Map(),
  searchCount: 0,
};

// --- Static per-song waveform for the seek bar (decoded once, never realtime) ---
const WAVE_BUCKETS = 80;

const hashString = (s: string) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Deterministic pseudo-waveform keyed by the track id — identical across sessions,
// used when the real audio can't be decoded (online sources, oversized files).
const seededWaveform = (seedStr: string): number[] => {
  const rand = mulberry32(hashString(seedStr));
  const peaks = new Array(WAVE_BUCKETS).fill(0);
  let phase = 0;
  for (let i = 0; i < WAVE_BUCKETS; i++) {
    phase += 0.35 + rand() * 1.1;
    const wrap = rand() > 0.72 ? 1.6 : 0.55;
    const env = 1 - Math.abs(i - WAVE_BUCKETS / 2) / (WAVE_BUCKETS / 2);
    peaks[i] = (0.35 + 0.65 * rand()) * (Math.abs(Math.sin(phase)) * 0.55 + 0.45) * (0.2 + 0.8 * env) * wrap;
  }
  for (let i = 1; i < WAVE_BUCKETS - 1; i++) {
    peaks[i] = (peaks[i - 1] + peaks[i] * 2 + peaks[i + 1]) / 4;
  }
  const max = Math.max(...peaks, 1e-9);
  return peaks.map(v => Math.min(1, Math.max(0.08, (v / max) * 0.95)));
};

const MusicPlayer: React.FC<MusicPlayerProps> = ({ 
  monitorDeviceId, 
  masterVolume,
  initialFile,
  onInitialFileConsumed
}) => {
  const { t } = useLanguage();
  
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);
  
  // --- STATE ---
  const [playlist, setPlaylist] = useState<MusicTrack[]>(() => {
    const saved = localStorage.getItem('music_playlist');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Refs for State Access inside Event Listeners (CRITICAL FOR FIXING MINI PLAYER BUG)
  const playlistRef = useRef(playlist);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);

  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  // Ref for track index to avoid closure staleness in audio events
  const currentTrackIndexRef = useRef(currentTrackIndex);
  useEffect(() => { currentTrackIndexRef.current = currentTrackIndex; }, [currentTrackIndex]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLoop, setIsLoop] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(1.0);
  const [adaptiveColor, setAdaptiveColor] = useState<string>('#ef4444');
  
  // Player Settings (Visualizer)
  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>(() => {
    const saved = localStorage.getItem('visualizer_studio_config');
    return saved ? JSON.parse(saved) : {
        isEnabled: true,
        height: 1.0,
        sensitivity: 1.5,
        barCount: 40,
        barGap: 1,
        colorMode: 'auto',
        manualColor: '#ec4899'
    };
  });

  // Persist Settings (debounced playlist save to avoid excessive localStorage writes)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (playlist.length > MAX_PERSIST_TRACKS) {
        console.warn(`Playlist too large (${playlist.length} tracks) to persist safely — skipping localStorage save to avoid freezing the renderer.`);
        return;
      }
      try {
        localStorage.setItem('music_playlist', JSON.stringify(playlist.map(({ lyrics, ...rest }) => rest)));
      } catch (err) {
        console.warn('Failed to persist playlist', err);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [playlist]);
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('visualizer_studio_config', JSON.stringify(visualizerConfig));
      } catch (err) {
        console.warn('Failed to persist visualizer config', err);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [visualizerConfig]);

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());

  // EQ State
  const [eqGains, setEqGains] = useState<number[]>(new Array(10).fill(0));
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Delete Confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tracksToDeleteCount, setTracksToDeleteCount] = useState<number>(0);
  const [trackToDelete, setTrackToDelete] = useState<string | null>(null);

  // Playlist Modernization State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropPos, setDropPos] = useState<{ index: number; pos: 'top' | 'bottom' } | null>(null);
  const [moreMenuId, setMoreMenuId] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const playlistScrollRef = useRef<HTMLDivElement | null>(null);

  // Music Details Modal
  const [detailsTrack, setDetailsTrack] = useState<MusicTrack | null>(null);
  const [isMusicDetailsOpen, setIsMusicDetailsOpen] = useState(false);

  // Online Music (Spatiflac)
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [onlineExtensions, setOnlineExtensions] = useState<SpatiflacExtension[]>(() => loadExtensions());

  const [onlineSession, setOnlineSession] = useState<{ tracks: OnlineTrack[]; index: number } | null>(null);
  const onlineSessionRef = useRef<{ tracks: OnlineTrack[]; index: number } | null>(null);
  useEffect(() => { onlineSessionRef.current = onlineSession; }, [onlineSession]);
  const onlineMappedRef = useRef<Record<string, number>>({});
  // Atomic playlist-length mirror for online plays (immune to render timing races)
  const nextPlaylistIdxRef = useRef(playlist.length);
  useEffect(() => { nextPlaylistIdxRef.current = playlist.length; }, [playlist]);
  // Guards against double-triggered online plays (e.g. rapid handleNext clicks)
  const onlinePlayInFlightRef = useRef(false);

  // --- SMART MUSIC LIBRARY (folder scan · deleted-file sync · play-in-place) ---
  const normPath = (p: string) => p.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');

  const [libraryFolders, setLibraryFolders] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem('music_library_folders');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const libraryFoldersRef = useRef(libraryFolders);
  useEffect(() => { libraryFoldersRef.current = libraryFolders; }, [libraryFolders]);

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [libScanCount, setLibScanCount] = useState(0);
  const [libStatus, setLibStatus] = useState<string | null>(null);
  const scanningRef = useRef(false);
  const missingCheckBusyRef = useRef(false);
  const autoSyncedRef = useRef(false);
  const enrichedPathsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const tId = setTimeout(() => {
      try { localStorage.setItem('music_library_folders', JSON.stringify(libraryFolders)); }
      catch (e) { console.warn('Failed to persist library folders', e); }
    }, 300);
    return () => clearTimeout(tId);
  }, [libraryFolders]);

  const enrichNewTracks = (tracks: MusicTrack[]) => {
    const target = tracks
      .filter(t => t.path && !enrichedPathsRef.current.has(normPath(t.path)))
      .slice(0, 1500);
    if (target.length === 0) return;
    target.forEach(t => enrichedPathsRef.current.add(normPath(t.path!)));
    const updates: Record<string, MusicTrack> = {};
    let idx = 0;
    const POOL = 6;
    const worker = async () => {
      while (idx < target.length) {
        const t = target[idx++];
        try {
          const meta = await window.electronAPI.readTrackMeta(t.path!);
          if (meta) {
            updates[t.id] = {
              ...t,
              title: meta.title || t.title,
              artist: meta.artist || t.artist,
              album: meta.album || t.album,
              cover: meta.cover || t.cover,
              duration: meta.duration || t.duration || 0,
            };
          }
        } catch (e) { /* unreadable file — keep filename-based title */ }
      }
    };
    const workers: Promise<void>[] = [];
    for (let i = 0; i < POOL; i++) workers.push(worker().catch(() => {}));
    Promise.all(workers).then(() => {
      if (!mountedRef.current) return;
      const keys = Object.keys(updates);
      if (keys.length === 0) return;
      setPlaylist(prev => {
        const byId = new Map<string, MusicTrack>();
        for (let i = 0; i < keys.length; i++) byId.set(keys[i], updates[keys[i]]);
        return prev.map(tr => byId.get(tr.id) || tr);
      });
    });
  };

  const runMissingCheck = useCallback(async () => {
    if (missingCheckBusyRef.current) return;
    const paths = playlistRef.current.filter(t => t.path && !t.onlineId).map(t => t.path as string);
    if (paths.length === 0) return;
    missingCheckBusyRef.current = true;
    try {
      const missing: string[] = [];
      for (let i = 0; i < paths.length; i += 50000) {
        const res = await window.electronAPI.filterMissingTracks(paths.slice(i, i + 50000));
        if (res && res.missing && res.missing.length) missing.push(...res.missing);
      }
      if (missing.length === 0) return;
      const missingNorm = new Set(missing.map(normPath));
      const removeIds = new Set<string>();
      const currentList = playlistRef.current;
      for (let i = 0; i < currentList.length; i++) {
        const tr = currentList[i];
        if (tr.path && missingNorm.has(normPath(tr.path))) removeIds.add(tr.id);
      }
      if (removeIds.size === 0) return;
      const curIdx = currentTrackIndexRef.current;
      const curId = curIdx !== -1 ? currentList[curIdx]?.id : undefined;
      const isCurRemoved = curId ? removeIds.has(curId) : false;
      let shift = 0;
      if (curIdx !== -1 && !isCurRemoved) {
        for (let i = 0; i < curIdx; i++) if (removeIds.has(currentList[i].id)) shift++;
      }
      setPlaylist(prev => {
        if (prev.length === 0) return prev;
        return prev.filter(t => !removeIds.has(t.id));
      });
      if (isCurRemoved) {
        setCurrentTrackIndex(-1);
        setIsPlaying(false);
        setOnlineSession(null);
        if (audioElementRef.current) audioElementRef.current.pause();
      } else if (shift > 0) {
        setCurrentTrackIndex(prev => (prev === -1 ? prev : prev - shift));
      }
      if (mountedRef.current) {
        setLibStatus(tRef.current('libraryMissingRemoved').replace('{count}', String(removeIds.size)));
      }
    } finally {
      missingCheckBusyRef.current = false;
    }
  }, []);

  const scanLibraryFolders = useCallback((foldersInput?: string[]) => {
    const folders = foldersInput && foldersInput.length > 0 ? foldersInput : libraryFoldersRef.current;
    if (folders.length === 0 || scanningRef.current || !mountedRef.current) return;
    scanningRef.current = true;
    setIsScanning(true);
    setLibScanCount(0);
    setLibStatus(null);
    const foundPaths: string[] = [];
    const cleanupFns: (() => void)[] = [];

    const finishError = (error: string) => {
      cleanupFns.forEach(c => c());
      scanningRef.current = false;
      if (mountedRef.current) {
        setIsScanning(false);
        setLibStatus(error);
      }
    };

    const onChunk = (payload: { paths: string[]; found: number }) => {
      foundPaths.push(...payload.paths);
      if (mountedRef.current) setLibScanCount(payload.found);
    };

    const onComplete = (payload: { total: number }) => {
      cleanupFns.forEach(c => c());
      scanningRef.current = false;
      if (!mountedRef.current) return;
      setIsScanning(false);
      const existing = new Set<string>();
      const currentList = playlistRef.current;
      for (let i = 0; i < currentList.length; i++) {
        const tr = currentList[i];
        if (tr.path) existing.add(normPath(tr.path));
      }
      const toAdd = foundPaths.filter(p => !existing.has(normPath(p)));
      if (toAdd.length > 0) {
        const newTracks: MusicTrack[] = toAdd.map(p => {
          const parts = p.split(/[\\/]/).filter(Boolean);
          const fname = parts[parts.length - 1] || 'Unknown';
          const parent = parts.length > 1 ? parts[parts.length - 2] : undefined;
          return {
            id: crypto.randomUUID(),
            title: fname.replace(/\.[^/.]+$/, '').trim() || fname,
            artist: tRef.current('unknownArtist'),
            album: parent || tRef.current('unknownAlbum'),
            url: `file://${p}`,
            path: p,
            duration: 0,
          };
        });
        setPlaylist(prev => {
          const seen = new Set<string>();
          for (let i = 0; i < prev.length; i++) {
            const tr = prev[i];
            if (tr.path) seen.add(normPath(tr.path));
          }
          const merged = [...prev];
          let added = 0;
          for (let i = 0; i < newTracks.length; i++) {
            const nt = newTracks[i];
            if (nt.path && seen.has(normPath(nt.path))) continue;
            seen.add(normPath(nt.path));
            merged.push(nt);
            added++;
          }
          return merged;
        });
        enrichNewTracks(newTracks);
        setLibStatus(tRef.current('libraryNewAdded').replace('{count}', String(toAdd.length)));
      } else {
        setLibStatus(tRef.current('libraryFoundTracks').replace('{count}', String(payload.total)));
      }
      runMissingCheck();
    };

    const onError = (payload: { error: string }) => finishError(payload.error || 'Scan failed');

    cleanupFns.push(window.electronAPI.onLibraryScanChunk(onChunk));
    cleanupFns.push(window.electronAPI.onLibraryScanComplete(onComplete));
    cleanupFns.push(window.electronAPI.onLibraryScanError(onError));
    window.electronAPI.scanLibrary(folders);
  }, [runMissingCheck]);

  const handleAddFolder = useCallback(async () => {
    const res = await window.electronAPI.pickMusicFolders();
    if (!res || res.cancelled || !res.paths || res.paths.length === 0) return;
    let changed = false;
    setLibraryFolders(prev => {
      const next = [...prev];
      for (const p of res.paths) {
        if (!next.some(x => normPath(x) === normPath(p))) { next.push(p); changed = true; }
      }
      return changed ? next : prev;
    });
    scanLibraryFolders(res.paths);
  }, [scanLibraryFolders]);

  const removeLibraryFolder = (folder: string) => {
    setLibraryFolders(prev => prev.filter(f => normPath(f) !== normPath(folder)));
  };

  useEffect(() => {
    if (autoSyncedRef.current) return;
    autoSyncedRef.current = true;
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      runMissingCheck();
      if (libraryFoldersRef.current.length > 0) scanLibraryFolders(libraryFoldersRef.current);
    }, 1200);
    return () => clearTimeout(timer);
  }, [runMissingCheck, scanLibraryFolders]);

  useEffect(() => {
    const handler = () => setOnlineExtensions(loadExtensions());
    window.addEventListener(EXTENSIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(EXTENSIONS_CHANGED_EVENT, handler);
  }, []);

  const handleOnlinePlay = useCallback(async (track: OnlineTrack, contextTracks: OnlineTrack[]): Promise<{ success: boolean; isPreview?: boolean; cached?: boolean; error?: string }> => {
    try {
      if (onlinePlayInFlightRef.current) {
        return { success: false, error: 'An online track is already loading' };
      }
      onlinePlayInFlightRef.current = true;

      const foundIdx = contextTracks.findIndex(t => t.id === track.id);
      if (foundIdx === -1) return { success: false, error: 'Track not found in session' };
      const sessionIndex = foundIdx;
      setOnlineSession({ tracks: contextTracks, index: sessionIndex });

      const existingIdx = onlineMappedRef.current[track.id];
      if (existingIdx !== undefined && playlistRef.current[existingIdx]?.onlineId === track.id) {
        setCurrentTrackIndex(existingIdx);
        setIsPlaying(true);
        return { success: true, cached: true };
      }

      const resolved = await resolveFullTrack(track);
      if (resolved.success && resolved.path) {
        const idx = nextPlaylistIdxRef.current;
        nextPlaylistIdxRef.current = idx + 1;
        const newTrack: MusicTrack = {
          id: crypto.randomUUID(),
          title: track.title,
          artist: track.artist,
          album: track.album,
          url: `file://${resolved.path}`,
          path: resolved.path,
          duration: track.duration || 0,
          cover: track.cover,
          onlineId: track.id,
        };
        setPlaylist(prev => [...prev, newTrack]);
        onlineMappedRef.current[track.id] = idx;
        setCurrentTrackIndex(idx);
        setIsPlaying(true);
        return { success: true, cached: !!resolved.cached };
      }
      if (track.previewUrl) {
        const idx = nextPlaylistIdxRef.current;
        nextPlaylistIdxRef.current = idx + 1;
        const newTrack: MusicTrack = {
          id: crypto.randomUUID(),
          title: track.title,
          artist: track.artist,
          album: track.album,
          url: track.previewUrl,
          duration: track.duration || 30,
          cover: track.cover,
          onlineId: track.id,
        };
        setPlaylist(prev => [...prev, newTrack]);
        onlineMappedRef.current[track.id] = idx;
        setCurrentTrackIndex(idx);
        setIsPlaying(true);
        return { success: true, isPreview: true };
      }
      return { success: false, error: resolved.error || 'No stream available' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Playback failed' };
    } finally {
      onlinePlayInFlightRef.current = false;
    }
  }, []);

  const handleOnlineDownload = async (track: OnlineTrack, quality: QualityOption, onProgress?: (percent: number) => void) => {
    const res = await downloadOnlineTrack(track, quality, onProgress);
    if (res.success && res.path) {
      const localTrack: MusicTrack = {
        id: crypto.randomUUID(),
        title: track.title,
        artist: track.artist,
        album: track.album,
        url: `file://${res.path}`,
        path: res.path,
        duration: track.duration || 0,
        cover: track.cover,
      };
      setPlaylist(prev => [...prev, localTrack]);
      return { success: true, path: res.path, isFallback: res.isFallback, fallbackExt: res.fallbackExt };
    }
    return res;
  };

  // Refs for Audio System
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  // Keep a ref to the latest monitorDeviceId so the audio engine can access it without stale closures
  const monitorDeviceIdRef = useRef<string>(monitorDeviceId);
  useEffect(() => { monitorDeviceIdRef.current = monitorDeviceId; }, [monitorDeviceId]);
  
  // Track the *intended* source string to compare against, avoiding browser encoding mismatches
  const currentAudioSrcRef = useRef<string | null>(null);
  
  // Handle Initial File from OS (Open With)
  useEffect(() => {
      if (!initialFile) return;
      const filePath = initialFile.path;
      const handleOpenWith = async () => {
          const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
          const existingIndex = playlistRef.current.findIndex(track => 
              track.path && track.path.replace(/\\/g, '/').toLowerCase() === normalizedPath
          );

          if (existingIndex !== -1) {
              setCurrentTrackIndex(existingIndex);
              setIsPlaying(true);
          } else {
              const filename = filePath.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, "") || "Unknown";
              const tempId = crypto.randomUUID();
              
              let title = filename;
              let artist = tRef.current('unknownArtist');
              let album = "Unknown Album";
              let cover = undefined;
              let metaDuration: number | undefined;

              try {
                  const meta = await window.electronAPI.readTrackMeta(filePath);
                  if (meta) {
                      if (meta.title) title = meta.title;
                      if (meta.artist) artist = meta.artist;
                      if (meta.album) album = meta.album;
                      if (meta.cover) cover = meta.cover;
                      metaDuration = meta.duration;
                  }
              } catch (e) { console.warn("Could not parse initial file metadata", e); }

              const newTrack: MusicTrack = {
                  id: tempId, title, artist, album, 
                  url: `file://${filePath}`, path: filePath, 
                  duration: metaDuration || 0, cover
              };
              
              setPlaylist(prev => [newTrack, ...prev]);
              setCurrentTrackIndex(0);
              setIsPlaying(true);
          }
          onInitialFileConsumed?.();
      };
      handleOpenWith();
  }, [initialFile]);

  // Extract color when track changes
  const currentTrack = playlist[currentTrackIndex];
  useEffect(() => {
    if (currentTrack && currentTrack.cover) {
      getDominantColor(currentTrack.cover).then(color => setAdaptiveColor(color));
    } else {
      setAdaptiveColor('#ef4444');
    }
  }, [currentTrack]);

  // --- STATIC per-song waveform for the seek bar ---
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [audioCtxReady, setAudioCtxReady] = useState(false);
  const waveformCacheRef = useRef<Map<string, number[]>>(new Map());

  const computeWaveform = useCallback(async (track: MusicTrack, ctx: AudioContext): Promise<number[] | null> => {
    try {
      let buf: ArrayBuffer | null = null;
      if (track.path && window.electronAPI?.readAudioBytes) {
        const res = await window.electronAPI.readAudioBytes(track.path);
        if (res && res.success && res.bytes) {
          const bytes = res.bytes;
          buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        }
      } else if (track.url) {
        const r = await fetch(track.url);
        if (r.ok) buf = await r.arrayBuffer();
      }
      if (!buf || buf.byteLength < 4096) return null;
      const audioBuf = await ctx.decodeAudioData(buf);
      const data = audioBuf.getChannelData(0);
      const segment = Math.floor(data.length / WAVE_BUCKETS);
      if (segment < 1) return null;
      const out = new Array<number>(WAVE_BUCKETS).fill(0);
      for (let i = 0; i < WAVE_BUCKETS; i++) {
        let mx = 0, mn = 0;
        const s = i * segment;
        for (let j = 0; j < segment; j++) {
          const v = data[s + j];
          if (v > mx) mx = v;
          if (v < mn) mn = v;
        }
        out[i] = mx - mn;
      }
      const sorted = [...out].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1e-9;
      return out.map(v => Math.min(1, Math.pow(Math.max(0.03, v / p95), 0.7)));
    } catch (e) {
      return null;
    }
  }, []);

  // Load (or resolve from cache) the waveform whenever the current track changes.
  const waveformEffectRef = useRef<number>(0); // guard against stale async results
  useEffect(() => {
    const track = currentTrack;
    const guard = ++waveformEffectRef.current;
    if (!track) {
      setWaveformData(null);
      return;
    }
    const key = track.id ?? track.path ?? track.url ?? 'none';
    const cached = waveformCacheRef.current.get(key);
    if (cached) {
      setWaveformData(cached);
      return;
    }
    setWaveformData(null);
    const ctx = audioContextRef.current;
    if (!ctx) return;
    computeWaveform(track, ctx)
      .then((w) => {
        const shape = w || seededWaveform(String(key));
        if (w) waveformCacheRef.current.set(key, shape);
        if (guard === waveformEffectRef.current) setWaveformData(shape);
      })
      .catch(() => {
        if (guard === waveformEffectRef.current) setWaveformData(seededWaveform(String(key)));
      });
  }, [currentTrack, computeWaveform, audioCtxReady]);

  // --- LYRICS (embedded USLT + sidecar .lrc) ---
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsEverOpen, setLyricsEverOpen] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsRaw, setLyricsRaw] = useState('');
  const lyricsCacheRef = useRef<Map<string, string>>(new Map());
  const lyricsTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    const track = currentTrack;
    if (!track) {
      setLyricsRaw('');
      setLyricsLoading(false);
      return;
    }
    lyricsTrackIdRef.current = track.id;
    const cached = lyricsCacheRef.current.get(track.id);
    if (cached !== undefined) {
      setLyricsRaw(cached);
      setLyricsLoading(false);
      return;
    }
    if (track.lyrics) {
      lyricsCacheRef.current.set(track.id, track.lyrics);
      setLyricsRaw(track.lyrics);
      setLyricsLoading(false);
      return;
    }
    if (track.path && !track.onlineId) {
      setLyricsRaw('');
      setLyricsLoading(true);
      const lrcPath = buildLrcPath(track.path);
      const loadLyrics = async (): Promise<string> => {
        try {
          if (window.electronAPI?.readEmbeddedLyrics) {
            const res = await window.electronAPI.readEmbeddedLyrics(track.path);
            if (res.success && res.lyrics) return res.lyrics;
          }
          if (window.electronAPI?.readLyricsFile) {
            const res = await window.electronAPI.readLyricsFile(lrcPath);
            if (res.success && res.content) return res.content;
          }
        } catch (e) {
          console.error('Lyrics load failed', e);
        }
        return '';
      };
      loadLyrics()
        .then((text) => {
          if (lyricsTrackIdRef.current !== track.id) return;
          lyricsCacheRef.current.set(track.id, text);
          setLyricsRaw(text);
          if (text) setPlaylist((prev) => prev.map((tr) => (tr.id === track.id ? { ...tr, lyrics: text } : tr)));
        })
        .finally(() => {
          if (lyricsTrackIdRef.current === track.id) setLyricsLoading(false);
        });
    } else {
      lyricsCacheRef.current.set(track.id, '');
      setLyricsRaw('');
      setLyricsLoading(false);
    }
  }, [currentTrack]);

  const toggleLyrics = useCallback(() => {
    setLyricsOpen((prev) => {
      const next = !prev;
      if (next) setLyricsEverOpen(true);
      return next;
    });
  }, []);

  const handleLyricsSeek = useCallback((time: number) => {
    if (audioElementRef.current) audioElementRef.current.currentTime = time;
  }, []);

  // --- SYNC WITH TRAY ---
  // Send state update whenever critical properties change
  useEffect(() => {
      if (window.electronAPI) {
          window.electronAPI.syncMusicState({
              track: currentTrack || null,
              isPlaying: isPlaying,
              currentTime: audioElementRef.current ? audioElementRef.current.currentTime : currentTime,
              duration: duration
          });
      }
  }, [currentTrack, isPlaying, duration]); // Intentionally omitting currentTime to prevent spamming from this effect

  const activeVisColor = visualizerConfig.colorMode === 'manual' ? visualizerConfig.manualColor : adaptiveColor;

  const handleNext = useCallback(() => {
    const session = onlineSessionRef.current;
    if (session && session.index < session.tracks.length - 1) {
      setOnlineSession({ tracks: session.tracks, index: session.index + 1 });
      handleOnlinePlay(session.tracks[session.index + 1], session.tracks);
      return;
    }
    if (playlistRef.current.length === 0) return;
    if (isLoop && !isShuffle) { 
        if (audioElementRef.current) { 
            audioElementRef.current.currentTime = 0; 
            setCurrentTime(0);
            audioElementRef.current.play(); 
        } 
        return; 
    }
    if (!isLoop && playlistRef.current.length <= 1) {
        setIsPlaying(false);
        if (audioElementRef.current) audioElementRef.current.pause();
        return;
    }
    if (isShuffle) setCurrentTrackIndex(Math.floor(Math.random() * playlistRef.current.length));
    else setCurrentTrackIndex((prev) => (prev + 1) % playlistRef.current.length);
    setIsPlaying(true);
  }, [isLoop, isShuffle, handleOnlinePlay]);

  const handleNextRef = useRef(handleNext);
  useEffect(() => {
      handleNextRef.current = handleNext;
  }, [handleNext]);

  const handlePrev = useCallback(() => {
    const session = onlineSessionRef.current;
    if (session && session.index > 0) {
      setOnlineSession({ tracks: session.tracks, index: session.index - 1 });
      handleOnlinePlay(session.tracks[session.index - 1], session.tracks);
      return;
    }
    if (playlistRef.current.length === 0) return;
    if (audioElementRef.current && audioElementRef.current.currentTime > 3) audioElementRef.current.currentTime = 0;
    else setCurrentTrackIndex((prev) => (prev - 1 + playlistRef.current.length) % playlistRef.current.length);
    setIsPlaying(true);
  }, [handleOnlinePlay]);

  const togglePlay = useCallback(() => {
    if (playlistRef.current.length === 0) return;
    if (currentTrackIndex === -1) setCurrentTrackIndex(0);
    setIsPlaying(prev => !prev);
  }, [currentTrackIndex]);

  // --- LISTEN FOR TRAY COMMANDS ---
  useEffect(() => {
      if (window.electronAPI) {
          const cleanupControls = window.electronAPI.onMusicControl((action) => {
              switch (action) {
                  case 'play': setIsPlaying(true); break;
                  case 'pause': setIsPlaying(false); break;
                  case 'next': handleNextRef.current(); break;
                  case 'prev': handlePrev(); break;
              }
          });
          
          const cleanupSeek = window.electronAPI.onSeekMusic((time) => {
              if (audioElementRef.current) {
                  audioElementRef.current.currentTime = time;
              }
          });

          return () => {
              cleanupControls();
              cleanupSeek();
          }
      }
  }, [handlePrev]);

  // --- AUDIO ENGINE ---
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass({ latencyHint: 'playback' });
    audioContextRef.current = ctx;
    setAudioCtxReady(true);

    const audio = new Audio();
    audioElementRef.current = audio;

    // Immediately route audio element to the monitor device (not VB-Audio injector)
    // This must happen before the first play() call.
    if (monitorDeviceIdRef.current && typeof (audio as any).setSinkId === 'function') {
      (audio as any).setSinkId(monitorDeviceIdRef.current).catch(console.warn);
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const masterGain = ctx.createGain();
    gainNodeRef.current = masterGain;

    const filters = FREQUENCIES.map(freq => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.0;
        filter.gain.value = 0;
        return filter;
    });
    eqNodesRef.current = filters;

    try {
        const source = ctx.createMediaElementSource(audio);
        sourceNodeRef.current = source;
        let currentNode: AudioNode = source;
        filters.forEach(filter => {
            currentNode.connect(filter);
            currentNode = filter;
        });
        currentNode.connect(analyser);
        analyser.connect(masterGain);
        // Route to ctx.destination. MusicPlayer's AudioContext is completely separate
        // from SoundPad's AudioContext — they never share any nodes or streams.
        masterGain.connect(ctx.destination);
    } catch (e) { console.error(e); }

    // --- FIX: Use refs inside the timeupdate callback ---
    const updateTime = () => {
        setCurrentTime(audio.currentTime);
        // Sync time to tray frequently using REFS to get current state without closures
        if (window.electronAPI) {
            const idx = currentTrackIndexRef.current;
            const currentTrack = (idx !== -1 && playlistRef.current[idx]) ? playlistRef.current[idx] : null;
            
            // Only send if we have a valid track or if we explicitly stopped
            if (currentTrack) {
                window.electronAPI.syncMusicState({
                    track: currentTrack,
                    isPlaying: !audio.paused,
                    currentTime: audio.currentTime,
                    duration: audio.duration
                });
            }
        }
    };
    const updateDuration = () => {
        const d = audio.duration;
        setDuration(d);
        const idx = currentTrackIndexRef.current;
        if (Number.isFinite(d) && d > 0 && idx !== -1) {
            const dur = Math.round(d);
            setPlaylist(prev => {
                const tr = prev[idx];
                if (!tr) return prev;
                if (tr.duration === dur || (tr.duration || 0) > 0) return prev;
                const next = [...prev];
                next[idx] = { ...tr, duration: dur };
                return next;
            });
        }
    };
    
    const onEnded = () => handleNextRef.current();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
        audio.pause();
        audio.src = ''; // Clean up to prevent memory leaks
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('ended', onEnded);
        
        // Disconnect all audio nodes to prevent memory leaks
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.disconnect(); } catch(e) {}
        }
        eqNodesRef.current.forEach(filter => {
            try { filter.disconnect(); } catch(e) {}
        });
        if (analyserRef.current) {
            try { analyserRef.current.disconnect(); } catch(e) {}
        }
        if (gainNodeRef.current) {
            try { gainNodeRef.current.disconnect(); } catch(e) {}
        }
        
        ctx.close();
    };
  }, []); // Empty dependency array means setup only once

  useEffect(() => {
      eqNodesRef.current.forEach((filter, index) => {
          if (filter) filter.gain.setTargetAtTime(eqGains[index], audioContextRef.current?.currentTime || 0, 0.1);
      });
  }, [eqGains]);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    if (currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
        const track = playlist[currentTrackIndex];
        const normalizedPath = track.path ? track.path.replace(/\\/g, '/') : null;
        const newSrc = normalizedPath ? `file://${normalizedPath}` : track.url;
        
        const doPlay = async () => {
            // Re-apply sinkId before every play to prevent browser from resetting it on src change
            if (monitorDeviceIdRef.current && typeof (audio as any).setSinkId === 'function') {
                await (audio as any).setSinkId(monitorDeviceIdRef.current).catch((e: any) => {
                    if (e?.name !== 'AbortError' && e?.name !== 'NotSupportedError') console.warn('setSinkId failed', e);
                });
            }
            if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
            audio.play().catch(console.error);
        };

        if (currentAudioSrcRef.current !== newSrc) {
            audio.src = newSrc;
            // Only use CORS for http(s) URLs; file:// and blob: break with it
            if (newSrc.startsWith('http')) audio.crossOrigin = 'anonymous';
            else audio.removeAttribute('crossorigin');
            currentAudioSrcRef.current = newSrc;
            if (isPlaying) doPlay();
        } else {
            if (isPlaying) doPlay();
            else audio.pause();
        }
    } else {
        audio.pause();
        currentAudioSrcRef.current = null;
    }
  }, [currentTrackIndex, isPlaying, playlist]);

  useEffect(() => {
      if (gainNodeRef.current) gainNodeRef.current.gain.setTargetAtTime(volume * masterVolume, audioContextRef.current?.currentTime || 0, 0.1);
  }, [volume, masterVolume]);

  const toggleMute = useCallback(() => {
      if (volume > 0.001) {
          prevVolumeRef.current = volume;
          setVolume(0);
          setIsMuted(true);
      } else {
          setVolume(prevVolumeRef.current || 0.8);
          setIsMuted(false);
      }
  }, [volume]);

  useEffect(() => {
      if (volume > 0.001 && isMuted) setIsMuted(false);
  }, [volume, isMuted]);

  useEffect(() => {
      const audio = audioElementRef.current as ExtendedAudioElement;
      if (audio && monitorDeviceId && typeof audio.setSinkId === 'function') audio.setSinkId(monitorDeviceId).catch((e: any) => {
          if (e?.name !== 'AbortError' && e?.name !== 'NotSupportedError') console.warn('setSinkId failed', e);
      });
  }, [monitorDeviceId]);

  // Add Files Manually
  const handleFileAdd = async (files: FileList | null) => {
    if (!files) return;
    setIsAdding(true);
    const newTracks: MusicTrack[] = [];
    const knownPaths = new Set<string>();
    for (let i = 0; i < playlistRef.current.length; i++) {
      const tr = playlistRef.current[i];
      if (tr.path) knownPaths.add(normPath(tr.path));
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|ogg|m4a)$/i)) continue;
        const originalPath = (file as any).path;
        if (originalPath && knownPaths.has(normPath(originalPath))) continue;
        let url = originalPath ? `file://${originalPath}` : await fileToBase64(file);
        const key = originalPath ? normPath(originalPath) : url;
        if (knownPaths.has(key)) continue;
        knownPaths.add(key);

        let title = file.name.replace(/\.[^/.]+$/, "");
        let artist = t('unknownArtist');
        let album = "Unknown Album";
        let cover = undefined;
        
        const meta = await parseAudioMetadata(file);
        if (meta.title) title = meta.title;
        if (meta.artist) artist = meta.artist;
        if (meta.album) album = meta.album;
        if (meta.cover) cover = meta.cover;
        if (!cover) cover = await extractAlbumArt(file);
        
        newTracks.push({ id: crypto.randomUUID(), title, artist, album, url, path: originalPath, duration: meta.duration || 0, cover });
    }
    setPlaylist(prev => [...prev, ...newTracks]);
    setIsAdding(false);
  };

  const isSearching = !!searchQuery.trim();

  const virtual = useMemo((): VirtualLayout => {
    const indexToRow = new Map<number, number>();
    const idToIndex = new Map<string, number>();
    const rows: VirtualRow[] = [];

    if (isSearching) {
      const q = searchQuery.trim().toLocaleLowerCase();
      const n = playlist.length;
      let displayIdx = 0;
      for (let i = 0; i < n; i++) {
        const track = playlist[i];
        idToIndex.set(track.id, i);
        if (
          track.title.toLocaleLowerCase().includes(q) ||
          track.artist.toLocaleLowerCase().includes(q) ||
          (track.album || '').toLocaleLowerCase().includes(q)
        ) {
          rows.push({ kind: 'track', key: track.id, track, playlistIndex: i, displayIndex: displayIdx++ });
          indexToRow.set(i, rows.length - 1);
        }
      }
    } else {
      const n = playlist.length;
      const UNKNOWN_ALBUM = t('unknownAlbum');
      let prevKey: string | null = null;
      let headerRow: VirtualRow | null = null;
      for (let i = 0; i < n; i++) {
        const track = playlist[i];
        idToIndex.set(track.id, i);
        const album = track.album;
        const hasAlbum = !!album && album !== 'Unknown Album' && album !== UNKNOWN_ALBUM;
        const groupKey = hasAlbum ? album : (track.artist || t('unknownArtist'));
        if (groupKey !== prevKey) {
          headerRow = { kind: 'header', key: `h-${groupKey}`, album: groupKey, count: 1 };
          rows.push(headerRow);
          prevKey = groupKey;
        } else if (headerRow && headerRow.kind === 'header') {
          headerRow.count++;
        }
        rows.push({ kind: 'track', key: track.id, track, playlistIndex: i, displayIndex: i });
        indexToRow.set(i, rows.length - 1);
      }
    }

    const total = rows.length;
    const offsets = new Float64Array(total);
    const heights = new Float64Array(total);
    let cumulative = 0;
    for (let i = 0; i < total; i++) {
      offsets[i] = cumulative;
      heights[i] = rows[i].kind === 'header' ? HEADER_ROW_H : TRACK_ROW_H;
      cumulative += heights[i];
    }

    return {
      rows,
      offsets,
      heights,
      totalHeight: cumulative,
      indexToRow,
      idToIndex,
      searchCount: isSearching ? total : playlist.length,
    };
  }, [playlist, searchQuery, isSearching, t]);

  const layoutRef = useRef<VirtualLayout>(EMPTY_LAYOUT);
  useEffect(() => { layoutRef.current = virtual; }, [virtual]);

  const visibleRangeRef = useRef({ start: 0, end: 0 });
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const scrollRafRef = useRef<number | null>(null);

  const updateVisibleRange = useCallback(() => {
    const container = playlistScrollRef.current;
    const layout = layoutRef.current;
    if (!container || layout.rows.length === 0) {
      setVisibleRange(prev => (prev.start === 0 && prev.end === 0 ? prev : { start: 0, end: 0 }));
      return;
    }
    const scrollTop = container.scrollTop;
    const viewportH = container.clientHeight || 0;
    const { offsets, heights } = layout;
    const n = layout.rows.length;
    let lo = 0, hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid] + heights[mid] <= scrollTop) lo = mid + 1;
      else hi = mid;
    }
    let start = Math.max(0, lo - LIST_OVERSCAN);
    let end = start;
    while (end < n && offsets[end] < scrollTop + viewportH) end++;
    end = Math.min(n, end + LIST_OVERSCAN);
    if (start !== visibleRangeRef.current.start || end !== visibleRangeRef.current.end) {
      visibleRangeRef.current = { start, end };
      setVisibleRange(visibleRangeRef.current);
    }
  }, []);

  const handleListScroll = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      updateVisibleRange();
    });
  }, [updateVisibleRange]);

  useEffect(() => {
    const container = playlistScrollRef.current;
    if (!container) return;
    updateVisibleRange();
    const ro = new ResizeObserver(() => updateVisibleRange());
    ro.observe(container);
    return () => {
      ro.disconnect();
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    };
  }, [updateVisibleRange, virtual]);

  const reorderEnabled = !isSelectionMode && !isSearching;

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDragFrom(index);
    setDropPos(null);
  }, []);

  const handleDragOverRow = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (dragFrom === null) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
    setDropPos(prev => (prev && prev.index === index && prev.pos === pos ? prev : { index, pos }));
  }, [dragFrom]);

  const handleDropRow = useCallback((index: number) => {
    if (dragFrom === null) return;
    setPlaylist(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragFrom, 1);
      let to = index;
      if (dragFrom < index) to = index - 1;
      next.splice(to, 0, moved);
      return next;
    });
    setDragFrom(null);
    setDropPos(null);
  }, [dragFrom]);

  const handleDragEnd = useCallback(() => {
    setDragFrom(null);
    setDropPos(null);
  }, []);

  const scrollToCurrentTrack = useCallback(() => {
    const container = playlistScrollRef.current;
    const layout = layoutRef.current;
    if (!container || currentTrackIndex === -1) return;
    const rowIdx = layout.indexToRow.get(currentTrackIndex);
    if (rowIdx === undefined) return;
    container.scrollTo({ top: LIST_TOP_PAD + layout.offsets[rowIdx], behavior: 'smooth' });
  }, [currentTrackIndex]);

  useEffect(() => {
    const container = playlistScrollRef.current;
    const layout = layoutRef.current;
    if (!container || currentTrackIndex === -1) return;
    const rowIdx = layout.indexToRow.get(currentTrackIndex);
    if (rowIdx === undefined) return;
    container.scrollTop = LIST_TOP_PAD + layout.offsets[rowIdx];
    updateVisibleRange();
  }, [currentTrackIndex, updateVisibleRange, virtual]);

  useEffect(() => {
    const container = playlistScrollRef.current;
    if (!container) return;
    const onScroll = () => {
      if (currentTrackIndex === -1) { setShowJump(false); return; }
      const layout = layoutRef.current;
      const rowIdx = layout.indexToRow.get(currentTrackIndex);
      if (rowIdx === undefined) { setShowJump(false); return; }
      const top = LIST_TOP_PAD + layout.offsets[rowIdx];
      const bottom = top + layout.heights[rowIdx];
      setShowJump(top < container.scrollTop || bottom > container.scrollTop + container.clientHeight);
    };
    onScroll();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [currentTrackIndex, virtual]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && e.target !== document.body) return;
      if (e.key === '/') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('#playlist-search-input');
        input?.focus();
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSearchOpen]);

  useEffect(() => { setMoreMenuId(null); }, [isSelectionMode, isSearchOpen]);

  const handleDeleteSelected = () => {
    if (selectedTrackIds.size === 0) return;
    setTracksToDeleteCount(selectedTrackIds.size);
    setTrackToDelete(null);
    setDeleteConfirmOpen(true);
  };

  const handleTrackUpdate = (id: string, newTitle: string) => {
      setPlaylist(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t));
  };

  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const handlePlayTrack = useCallback((track: MusicTrack) => {
    setOnlineSession(null);
    const index = layoutRef.current.idToIndex.get(track.id);
    if (index === undefined) return;
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  }, []);

  const handleDeleteTrack = useCallback((id: string) => {
    setTrackToDelete(id);
    setTracksToDeleteCount(1);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDetailsTrack = useCallback((track: MusicTrack) => {
    setDetailsTrack(track);
    setIsMusicDetailsOpen(true);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedTrackIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const handleSwitchToMini = () => {
      if (window.electronAPI) {
          window.electronAPI.switchToMini();
      }
  };

  // Function to sync data to MiniPlayer via IPC
  const handleVisualizerSync = useCallback((data: Uint8Array) => {
      if (window.electronAPI && isPlaying) {
          window.electronAPI.syncVisualizerData(data);
      }
  }, [isPlaying]);

  const confirmDeleteTracks = () => {
      const toDelete = trackToDelete ? new Set([trackToDelete]) : selectedTrackIds;
      if (toDelete.size === 0) return;
      const currentId = playlist[currentTrackIndex]?.id;
      const isCurrentDeleted = currentId && toDelete.has(currentId);
      let shift = 0;
      if (currentTrackIndex !== -1 && !isCurrentDeleted) {
          for (let i = 0; i < currentTrackIndex; i++) if (toDelete.has(playlist[i].id)) shift++;
      }
      const deletedIndexes: number[] = [];
      playlist.forEach((p, i) => {
          if (toDelete.has(p.id)) {
              if (p.onlineId) delete onlineMappedRef.current[p.onlineId];
              deletedIndexes.push(i);
          }
      });
      // Decrement stored online indexes for tracks that follow any deleted track
      Object.keys(onlineMappedRef.current).forEach(oid => {
          let delta = 0;
          for (const di of deletedIndexes) if (onlineMappedRef.current[oid] > di) delta++;
          if (delta > 0) onlineMappedRef.current[oid] -= delta;
      });
      if (isCurrentDeleted) setOnlineSession(null);
      setPlaylist(prev => prev.filter(t => !toDelete.has(t.id)));
      if (isCurrentDeleted) {
          setIsPlaying(false);
          setCurrentTrackIndex(-1);
          if (audioElementRef.current) audioElementRef.current.pause();
      } else if (shift > 0) {
          setCurrentTrackIndex(prev => prev - shift);
      }
      setTrackToDelete(null);
      setSelectedTrackIds(new Set());
      setDeleteConfirmOpen(false);
      setIsSelectionMode(false);
  };

  const currentTrackId = playlist[currentTrackIndex]?.id;
  const virtualRowCount = virtual.rows.length;
  const listTopGap = virtualRowCount > 0 && visibleRange.start > 0 ? virtual.offsets[visibleRange.start] : 0;
  const lastVisibleIdx = virtualRowCount > 0 ? Math.min(visibleRange.end, virtualRowCount) - 1 : -1;
  const listBottomGap = lastVisibleIdx >= 0
    ? Math.max(0, virtual.totalHeight - (virtual.offsets[lastVisibleIdx] + virtual.heights[lastVisibleIdx]))
    : 0;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-black via-zinc-950 to-black p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row gap-6 h-full z-10 page-stagger">
        
        {/* LEFT: NOW PLAYING */}
        <div className="lg:w-1/3 flex flex-col gap-6">
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl shadow-black/50 group">
                <div className="absolute top-4 left-4 z-40 flex gap-2">
                    {(lyricsLoading || lyricsRaw.length > 0) && (
                        <button onClick={toggleLyrics} className={`p-2 backdrop-blur-md rounded-full border border-white/10 transition-all ${lyricsOpen ? 'bg-red-500/80 text-white' : 'bg-black/40 text-white/70 hover:text-white hover:bg-black/60'}`} title={t('lyrics')}><FileText size={18} /></button>
                    )}
                    <button onClick={() => setIsEqOpen(true)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-white hover:bg-black/60 transition-all border border-white/10" title={t('equalizer')}><Sliders size={18} /></button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-white hover:bg-black/60 transition-all border border-white/10" title="Visualizer Settings"><Settings size={18} /></button>
                </div>
                
                {/* Switch to Mini Player Button */}
                <div className="absolute top-4 right-4 z-40">
                    <button onClick={handleSwitchToMini} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-white hover:bg-black/60 transition-all border border-white/10" title="Mini Player">
                        <Shrink size={18} />
                    </button>
                </div>

                {currentTrack?.cover ? (
                    <>
                        <img src={currentTrack.cover} alt="Cover" className={`w-full h-full object-cover transition-transform duration-[10s] ease-linear ${isPlaying ? 'scale-110' : 'scale-100'}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800/50">
                        <div className={`p-8 rounded-full border-4 border-zinc-700 bg-zinc-800 ${isPlaying ? 'animate-pulse-slow' : ''}`}><Music size={64} className="text-zinc-600" /></div>
                    </div>
                )}
                
                {visualizerConfig.isEnabled && (
                    <div className="absolute bottom-0 left-0 right-0 h-40 flex items-end justify-center px-8 opacity-80 pointer-events-none mix-blend-screen">
                        {/* Pass handleVisualizerSync to emit data */}
                        <RealTimeVisualizer 
                            analyser={analyserRef.current} 
                            isPlaying={isPlaying} 
                            color={activeVisColor} 
                            config={visualizerConfig} 
                            onSync={handleVisualizerSync}
                        />
                    </div>
                )}

                {(lyricsEverOpen && (lyricsLoading || lyricsRaw.length > 0)) && (
                    <>
                        {currentTrack?.cover && (
                            <img src={currentTrack.cover} alt="" aria-hidden className={`absolute inset-0 w-full h-full object-cover blur-2xl brightness-[.5] saturate-150 scale-110 pointer-events-none transition-opacity duration-700 ${lyricsOpen ? 'opacity-100' : 'opacity-0'}`} />
                        )}
                        <div className={`absolute inset-0 bg-black/45 backdrop-blur-md transition-opacity duration-500 ${lyricsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>
                        <div className={`absolute inset-0 transition-opacity duration-500 ${lyricsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <LyricsOverlay
                                lyricsRaw={lyricsRaw}
                                currentTime={currentTime}
                                duration={duration}
                                isPlaying={isPlaying}
                                onSeek={handleLyricsSeek}
                                loading={lyricsLoading}
                            />
                        </div>
                    </>
                )}
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
                <div className="text-center mb-2">
                    <h2 className="text-2xl font-bold text-white truncate font-persian">{currentTrack?.title || t('noSongs')}</h2>
                    <p className="text-gray-400 font-medium font-persian">{currentTrack?.artist || (playlist.length > 0 ? t('unknownArtist') : t('addSongsDesc'))}</p>
                </div>

                <div className="w-full">
                    <div className="flex justify-between text-xs text-gray-500 font-mono mb-1" dir="ltr"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                    <VisualizerSeekBar
                        waveform={waveformData}
                        color={activeVisColor}
                        currentTime={currentTime}
                        duration={duration}
                        trackKey={currentTrack?.id ?? 'none'}
                        onSeek={(seconds) => { if (audioElementRef.current) audioElementRef.current.currentTime = seconds; }}
                    />
                </div>

                <div className="flex items-center justify-between px-4 mt-2" dir="ltr" role="group" aria-label="Playback controls">
                    <button onClick={() => setIsShuffle(!isShuffle)} aria-label={isShuffle ? 'Shuffle on' : 'Shuffle off'} aria-pressed={isShuffle} className={`p-2 rounded-full transition-colors ${isShuffle ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-white'}`}><Shuffle size={20} aria-hidden="true" /></button>
                    <div className="flex items-center gap-4">
                        <button onClick={handlePrev} aria-label="Previous track" className="p-3 text-white hover:text-red-500 transition-colors"><SkipBack size={28} className="fill-current" aria-hidden="true" /></button>
                        <button onClick={() => togglePlay()} aria-label={isPlaying ? 'Pause' : 'Play'} aria-pressed={isPlaying} className="w-16 h-16 rounded-full text-white flex items-center justify-center shadow-lg shadow-black/40 hover:scale-105 active:scale-95 transition-all" style={{ backgroundColor: activeVisColor }}>
                            {isPlaying ? <Pause size={32} className="fill-white" aria-hidden="true" /> : <Play size={32} className="fill-white translate-x-1" aria-hidden="true" />}
                        </button>
                        <button onClick={handleNext} aria-label="Next track" className="p-3 text-white hover:text-red-500 transition-colors"><SkipForward size={28} className="fill-current" aria-hidden="true" /></button>
                    </div>
                    <button onClick={() => setIsLoop(!isLoop)} aria-label={isLoop ? 'Loop on' : 'Loop off'} aria-pressed={isLoop} className={`p-2 rounded-full transition-colors ${isLoop ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-white'}`}><Repeat size={20} aria-hidden="true" /></button>
                </div>

                 <div className="flex items-center gap-3 px-4 mt-2" dir="ltr">
                    <button onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'} aria-pressed={isMuted} title={isMuted ? 'Unmute' : 'Mute'} className={`p-1.5 rounded-lg transition-all duration-300 hover:bg-white/5 hover:scale-110 active:scale-95 ${isMuted ? 'text-red-400' : 'text-gray-400'} cursor-pointer`}>
                        {isMuted ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}
                    </button>
                    <VolumeSlider value={volume} onChange={setVolume} color={activeVisColor} />
                 </div>
            </div>
        </div>

        {/* RIGHT: PLAYLIST */}
        <div className="flex-1 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl flex flex-col overflow-hidden relative">
            <div className="p-4 border-b border-white/5 bg-black/20 backdrop-blur-xl flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500"><ListMusic size={24} /></div>
                        <div><h3 className="text-lg font-bold text-white font-persian">{t('playlist')}</h3><p className="text-xs text-gray-500 font-mono">{virtual.searchCount} / {playlist.length} TRACKS</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSelectionMode ? (
                            <div className="flex items-center gap-2 animate-slide-up">
                                <button onClick={handleDeleteSelected} disabled={selectedTrackIds.size === 0} className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"><Trash2 size={16} />Delete ({selectedTrackIds.size})</button>
                                <button onClick={() => setIsSelectionMode(false)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-xl transition-all"><X size={16} /></button>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => setIsSearchOpen(prev => !prev)} className={`p-2 rounded-xl transition-all border ${isSearchOpen ? 'bg-pink-500/15 text-pink-400 border-pink-500/30' : 'bg-zinc-800 hover:bg-zinc-700 text-gray-400 hover:text-white border-white/5'}`} title={t('playlistSearchPlaceholder')}><Search size={18} /></button>
                                <button onClick={() => setIsSelectionMode(true)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5" title="Select Mode"><MousePointer2 size={18} /></button>
                            </>
                        )}
                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                        <button onClick={() => setOnlineOpen(true)} className="px-3 py-2 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-pink-500/40 shadow-lg shadow-pink-900/20 hover:shadow-[0_0_20px_rgba(236,72,153,0.35)] active:scale-95"><Globe size={16} /><span>{t('onlineBtn')}</span></button>
                        <button onClick={() => setIsLibraryOpen(true)} className={`px-3 py-2 flex items-center gap-2 rounded-xl text-xs font-bold transition-all border active:scale-95 cursor-pointer ${isScanning ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700 text-white border-white/5 hover:border-white/20'} `} title={t('libraryManage')}><Folder size={16} /><span>{t('libraryBtn')}</span>{isScanning && <Loader2 size={12} className="animate-spin" />}</button>
                    </div>
                </div>
                {isSearchOpen && (
                    <div className="flex items-center gap-2 animate-slide-up">
                        <div className="flex-1 relative">
                            <Search size={16} className="absolute inset-y-0 start-3 my-auto text-gray-500 pointer-events-none" />
                            <input
                                id="playlist-search-input"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('playlistSearchPlaceholder')}
                                className="w-full bg-black/40 border border-white/10 focus:border-pink-500/50 rounded-xl px-10 py-2 text-sm text-white outline-none placeholder-gray-600 transition-colors"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 end-2 my-auto p-1 text-gray-500 hover:text-white transition-colors" title={t('playlistClearSearch')}><XCircle size={16} /></button>
                            )}
                        </div>
                        <span className="text-xs font-mono text-gray-500 shrink-0">{virtual.searchCount}/{playlist.length}</span>
                    </div>
                )}
            </div>

            {isLibraryOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in" onClick={() => setIsLibraryOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-zinc-950/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/70 animate-slide-up overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-56 h-56 bg-pink-600/10 blur-[70px] rounded-full pointer-events-none"></div>
                        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-fuchsia-600/10 blur-[70px] rounded-full pointer-events-none"></div>
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-pink-500 via-fuchsia-400 to-pink-500 bg-[length:200%_100%] animate-gradient-x"></div>

                        <div className="p-6 relative z-10">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-black text-white text-lg font-persian flex items-center gap-2">
                                    <span className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center">
                                        <HardDrive size={16} className="text-pink-500" />
                                    </span>
                                    {t('libraryTitle')}
                                </h3>
                                <button onClick={() => setIsLibraryOpen(false)} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all"><X size={16} /></button>
                            </div>
                            <p className="text-[11px] text-gray-500 font-persian leading-relaxed mb-5">{t('libraryDesc')}</p>

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <button onClick={handleAddFolder} disabled={isScanning} className="group flex flex-col items-start gap-2 p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-pink-500/40 transition-all active:scale-[0.97] disabled:opacity-40 text-left cursor-pointer">
                                    <span className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        {isScanning ? <Loader2 size={16} className="text-pink-400 animate-spin" /> : <FolderPlus size={16} className="text-pink-400" />}
                                    </span>
                                    <span className="font-bold text-white text-xs font-persian">{t('addFolder')}</span>
                                    <span className="text-[10px] text-gray-500 font-persian leading-snug">{t('libraryAddFolderDesc')}</span>
                                </button>
                                <label className="group flex flex-col items-start gap-2 p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/40 transition-all active:scale-[0.97] cursor-pointer text-left">
                                    <span className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus size={16} className="text-emerald-400" />
                                    </span>
                                    <span className="font-bold text-white text-xs font-persian">{t('addSongs')}</span>
                                    <span className="text-[10px] text-gray-500 font-persian leading-snug">{t('libraryAddFilesDesc')}</span>
                                    <input type="file" multiple accept="audio/*" className="hidden" onChange={(e) => { handleFileAdd(e.target.files); setIsLibraryOpen(false); }} />
                                </label>
                            </div>

                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold font-persian text-gray-300 flex items-center gap-1.5"><Library size={13} className="text-gray-500" />{t('libraryScannedDirs')}</h4>
                                <button onClick={() => scanLibraryFolders()} disabled={libraryFolders.length === 0 || isScanning} className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all border border-white/5 disabled:opacity-40 disabled:cursor-not-allowed"><RefreshCw size={11} className={isScanning ? 'animate-spin' : ''} />{t('libraryRescan')}</button>
                            </div>

                            {isScanning && (
                                <div className="flex items-center gap-2 text-[11px] text-pink-300 mb-2">
                                    <Loader2 size={12} className="animate-spin" />{t('libraryScanning')}
                                    <span className="font-mono ml-auto">{libScanCount.toLocaleString()}</span>
                                </div>
                            )}
                            {libStatus && !isScanning && (
                                <p className="text-[11px] text-emerald-300/90 font-persian mb-2">{libStatus}</p>
                            )}

                            {libraryFolders.length === 0 ? (
                                <p className="text-xs text-gray-600 font-persian mb-3">{t('libraryEmpty')}</p>
                            ) : (
                                <ul className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar mb-3">
                                    {libraryFolders.map(f => (
                                        <li key={normPath(f)} className="flex items-center gap-2.5 text-[11px] text-gray-300 bg-zinc-900/70 border border-white/5 rounded-xl px-3 py-2">
                                            <Folder size={13} className="text-zinc-500 shrink-0" />
                                            <span className="truncate flex-1" dir="ltr">{f}</span>
                                            <button onClick={() => removeLibraryFolder(f)} className="px-2 py-1 rounded-lg bg-white/5 hover:bg-red-500/15 hover:text-red-400 text-gray-500 text-[10px] font-bold transition-colors">{t('libraryRemove')}</button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="flex items-start gap-2 text-[10px] text-gray-600 border-t border-white/5 pt-3">
                                <Disc size={12} className="text-zinc-600 shrink-0 mt-0.5" />
                                <span className="font-persian text-gray-500">{t('libraryPlayInPlace')} — {t('libraryPlayInPlaceDesc')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div ref={playlistScrollRef} onScroll={handleListScroll} className="flex-1 overflow-y-auto neon-scrollbar" style={{ overflowAnchor: 'none' }}>
                {isAdding ? (
                    <div className="p-4">
                        <div className="flex flex-col gap-2">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-3 h-16 px-3 rounded-2xl bg-zinc-900/40 border border-white/5 relative overflow-hidden">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-800/70 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-1/3 bg-zinc-800/70 rounded" />
                                        <div className="h-2 w-1/4 bg-zinc-800/70 rounded" />
                                    </div>
                                    <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : playlist.length === 0 ? (
                    <div className="h-full p-4 flex flex-col items-center justify-center text-gray-500 gap-4 animate-fade-in">
                        <div className="relative w-28 h-28">
                            <div className="absolute inset-0 rounded-full border-2 border-dashed border-red-500/40 animate-[ring-spin_14s_linear_infinite]" />
                            <div className="absolute inset-4 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center">
                                <Disc size={32} className="text-zinc-600" />
                            </div>
                        </div>
                        <p className="font-bold text-white font-persian">{t('noSongs')}</p>
                        <p className="text-sm text-gray-500 font-persian">{t('addSongsDesc')}</p>
                        <button onClick={() => setIsLibraryOpen(true)} className="mt-1 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-pink-900/30 hover:shadow-[0_0_20px_rgba(236,72,153,0.35)] active:scale-95"><FolderPlus size={16} /><span>{t('libraryBtn')}</span></button>
                    </div>
                ) : isSearching && virtual.rows.length === 0 ? (
                    <div className="h-full p-4 flex flex-col items-center justify-center gap-3 text-gray-500 animate-fade-in">
                        <XCircle size={48} className="text-zinc-700" />
                        <p className="text-sm font-bold text-white">{t('playlistNoResults')}</p>
                    </div>
                ) : (
                    <div className="px-4" style={{ paddingTop: 16, paddingBottom: 12 }}>
                        <div style={{ height: listTopGap }} />
                        {virtual.rows.slice(visibleRange.start, visibleRange.end).map((row) =>
                            row.kind === 'header' ? (
                                <div key={row.key} style={{ height: HEADER_ROW_H }} className="sticky top-0 z-20 flex items-center gap-2 px-2 border-b border-white/5 bg-zinc-950/95">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate">{row.album}</span>
                                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 shrink-0">{row.count}</span>
                                </div>
                            ) : (
                                <div key={row.key} className="mb-2">
                                    <PlaylistRow
                                        track={row.track}
                                        index={row.playlistIndex}
                                        displayIndex={row.displayIndex}
                                        virtualized
                                        isCurrent={row.track.id === currentTrackId}
                                        isPlaying={isPlaying}
                                        isSelected={selectedTrackIds.has(row.track.id)}
                                        selectionMode={isSelectionMode}
                                        reorderEnabled={reorderEnabled && !isSearching}
                                        moreOpen={moreMenuId === row.track.id}
                                        dropPos={dropPos && dropPos.index === row.playlistIndex ? dropPos.pos : null}
                                        staggerDelay={0}
                                        formatTime={formatTime}
                                        onPlay={handlePlayTrack}
                                        onDelete={handleDeleteTrack}
                                        onDetails={handleDetailsTrack}
                                        onMoreToggle={setMoreMenuId}
                                        onToggleSelect={handleToggleSelect}
                                        onDragStart={handleDragStart}
                                        onDragOverRow={handleDragOverRow}
                                        onDropRow={handleDropRow}
                                        onDragEnd={handleDragEnd}
                                    />
                                </div>
                            )
                        )}
                        <div style={{ height: listBottomGap }} />
                    </div>
                )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>

            {showJump && playlist.length > 12 && currentTrackIndex !== -1 && (
                <button
                    onClick={scrollToCurrentTrack}
                    className="absolute bottom-6 right-6 rtl:right-auto rtl:left-6 z-30 w-10 h-10 rounded-full bg-pink-600/90 backdrop-blur-md border border-pink-400/40 text-white shadow-[0_0_18px_rgba(236,72,153,0.5)] hover:scale-105 active:scale-95 transition-transform animate-slide-up"
                    title={t('nowPlaying')}
                >
                    <ChevronUp size={18} className="mx-auto" />
                </button>
            )}

            {onlineOpen && (
                <OnlineMusicPanel
                    extensions={onlineExtensions}
                    onClose={() => setOnlineOpen(false)}
                    onPlay={handleOnlinePlay}
                    onDownload={handleOnlineDownload}
                />
            )}
        </div>
      </div>

      <EqualizerModal isOpen={isEqOpen} onClose={() => setIsEqOpen(false)} gains={eqGains} onGainChange={(idx, val) => { const n = [...eqGains]; n[idx] = val; setEqGains(n); }} onLoadProfile={setEqGains} />
      
      <PlayerSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        visConfig={visualizerConfig} 
        onVisUpdate={setVisualizerConfig}
      />

      <ConfirmationModal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} onConfirm={confirmDeleteTracks} title={t('confirmTitle')} description={t('confirmBody').replace('{count}', String(tracksToDeleteCount))} confirmText={t('confirmDelete')} cancelText={t('cancel')} count={tracksToDeleteCount} />
      <MusicDetailsModal track={detailsTrack} isOpen={isMusicDetailsOpen} onClose={() => setIsMusicDetailsOpen(false)} onSave={handleTrackUpdate} />
    </div>
  );
};

export default MusicPlayer;
