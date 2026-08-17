
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, 
  ListMusic, Music, Volume2, Trash2, Plus, Disc, Sliders, X, MousePointer2, Settings, Shrink, Globe, FileText, Search, XCircle, ChevronUp
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { MusicTrack, ExtendedAudioElement, VisualizerConfig, SpatiflacExtension, OnlineTrack, QualityOption } from '../types';
import { fileToBase64, extractAlbumArt, getDominantColor, parseAudioMetadata } from '../utils/audioHelpers';
import { buildLrcPath } from '../utils/lyrics';
import RealTimeVisualizer from '../components/RealTimeVisualizer';
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

  // Persist Settings
  useEffect(() => { localStorage.setItem('music_playlist', JSON.stringify(playlist.map(({ lyrics, ...rest }) => rest))); }, [playlist]);
  useEffect(() => { localStorage.setItem('visualizer_studio_config', JSON.stringify(visualizerConfig)); }, [visualizerConfig]);

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
  const progressRef = useRef<HTMLDivElement>(null);
  
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

              try {
                  const response = await fetch(`file://${filePath}`);
                  const blob = await response.blob();
                  const meta = await parseAudioMetadata(blob);
                  if (meta.title) title = meta.title;
                  if (meta.artist) artist = meta.artist;
                  if (meta.album) album = meta.album;
                  if (meta.cover) cover = meta.cover;
              } catch (e) { console.warn("Could not parse initial file metadata", e); }

              const newTrack: MusicTrack = {
                  id: tempId, title, artist, album, 
                  url: `file://${filePath}`, path: filePath, 
                  duration: 0, cover
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
    const ctx = new AudioContextClass();
    audioContextRef.current = ctx;

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
    const updateDuration = () => setDuration(audio.duration);
    
    const onEnded = () => handleNextRef.current();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
        audio.pause();
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('ended', onEnded);
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
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|ogg|m4a)$/i)) continue;
        const originalPath = (file as any).path;
        let url = originalPath ? `file://${originalPath}` : await fileToBase64(file);

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
        
        newTracks.push({ id: crypto.randomUUID(), title, artist, album, url, path: originalPath, duration: 0, cover });
    }
    setPlaylist(prev => [...prev, ...newTracks]);
    setIsAdding(false);
  };

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return playlist;
    const q = searchQuery.trim().toLocaleLowerCase();
    return playlist.filter(track =>
      track.title.toLocaleLowerCase().includes(q) ||
      track.artist.toLocaleLowerCase().includes(q) ||
      (track.album || '').toLocaleLowerCase().includes(q)
    );
  }, [playlist, searchQuery]);

  const groupedTracks = useMemo(() => {
    if (searchQuery.trim()) return null;
    const groups: { album: string; tracks: { track: MusicTrack; index: number }[] }[] = [];
    playlist.forEach((track, index) => {
      const album = track.album || t('unknownAlbum');
      const last = groups[groups.length - 1];
      if (last && last.album === album) last.tracks.push({ track, index });
      else groups.push({ album, tracks: [{ track, index }] });
    });
    return groups;
  }, [playlist, searchQuery, t]);

  const reorderEnabled = !isSelectionMode && !searchQuery.trim();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDragFrom(index);
    setDropPos(null);
  };

  const handleDragOverRow = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (dragFrom === null) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
    setDropPos(prev => (prev && prev.index === index && prev.pos === pos ? prev : { index, pos }));
  };

  const handleDropRow = (index: number) => {
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
  };

  const handleDragEnd = () => {
    setDragFrom(null);
    setDropPos(null);
  };

  const scrollToCurrentTrack = useCallback(() => {
    const container = playlistScrollRef.current;
    if (!container || currentTrackIndex === -1) return;
    const el = container.querySelector<HTMLElement>(`[data-track-id="${playlist[currentTrackIndex]?.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentTrackIndex, playlist]);

  useEffect(() => {
    const container = playlistScrollRef.current;
    if (!container || currentTrackIndex === -1) return;
    const el = container.querySelector<HTMLElement>(`[data-track-id="${playlist[currentTrackIndex]?.id}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [currentTrackIndex, playlist]);

  useEffect(() => {
    const container = playlistScrollRef.current;
    if (!container) return;
    const onScroll = () => {
      if (currentTrackIndex === -1) { setShowJump(false); return; }
      const el = container.querySelector<HTMLElement>(`[data-track-id="${playlist[currentTrackIndex]?.id}"]`);
      if (!el) { setShowJump(false); return; }
      const cr = container.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setShowJump(er.top < cr.top || er.bottom > cr.bottom);
    };
    onScroll();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [currentTrackIndex, playlist]);

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

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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

                <div className="w-full group/progress cursor-pointer" onClick={(e) => { if (!progressRef.current || !audioElementRef.current) return; if (!Number.isFinite(duration) || duration <= 0) return; const rect = progressRef.current.getBoundingClientRect(); const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1); audioElementRef.current.currentTime = percent * duration; }} ref={progressRef}>
                    <div className="flex justify-between text-xs text-gray-500 font-mono mb-1" dir="ltr"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden relative" dir="ltr">
                        <div className="absolute top-0 left-0 h-full transition-all duration-300 relative" style={{ width: `${(currentTime / duration) * 100 || 0}%`, backgroundColor: activeVisColor }}></div>
                        <div className="absolute inset-0 bg-white/0 group-hover/progress:bg-white/10 transition-colors"></div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-4 mt-2" dir="ltr">
                    <button onClick={() => setIsShuffle(!isShuffle)} className={`p-2 rounded-full transition-colors ${isShuffle ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-white'}`}><Shuffle size={20} /></button>
                    <div className="flex items-center gap-4">
                        <button onClick={handlePrev} className="p-3 text-white hover:text-red-500 transition-colors"><SkipBack size={28} className="fill-current" /></button>
                        <button onClick={() => togglePlay()} className="w-16 h-16 rounded-full text-white flex items-center justify-center shadow-lg shadow-black/40 hover:scale-105 active:scale-95 transition-all" style={{ backgroundColor: activeVisColor }}>
                            {isPlaying ? <Pause size={32} className="fill-white" /> : <Play size={32} className="fill-white translate-x-1" />}
                        </button>
                        <button onClick={handleNext} className="p-3 text-white hover:text-red-500 transition-colors"><SkipForward size={28} className="fill-current" /></button>
                    </div>
                    <button onClick={() => setIsLoop(!isLoop)} className={`p-2 rounded-full transition-colors ${isLoop ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-white'}`}><Repeat size={20} /></button>
                </div>

                 <div className="flex items-center gap-3 px-4 mt-2" dir="ltr">
                    <Volume2 size={16} className="text-gray-500" />
                    <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500" />
                 </div>
            </div>
        </div>

        {/* RIGHT: PLAYLIST */}
        <div className="flex-1 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl flex flex-col overflow-hidden relative">
            <div className="p-4 border-b border-white/5 bg-black/20 backdrop-blur-xl flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500"><ListMusic size={24} /></div>
                        <div><h3 className="text-lg font-bold text-white font-persian">{t('playlist')}</h3><p className="text-xs text-gray-500 font-mono">{filteredTracks.length} / {playlist.length} TRACKS</p></div>
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
                        <label className="cursor-pointer px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/5 hover:border-white/20"><Plus size={16} /><span>{t('addSongs')}</span><input type="file" multiple accept="audio/*" className="hidden" onChange={(e) => handleFileAdd(e.target.files)} /></label>
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
                        <span className="text-xs font-mono text-gray-500 shrink-0">{filteredTracks.length}/{playlist.length}</span>
                    </div>
                )}
            </div>

            <div ref={playlistScrollRef} className="flex-1 overflow-y-auto p-4 neon-scrollbar">
                {isAdding ? (
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
                ) : playlist.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4 animate-fade-in">
                        <div className="relative w-28 h-28">
                            <div className="absolute inset-0 rounded-full border-2 border-dashed border-red-500/40 animate-[ring-spin_14s_linear_infinite]" />
                            <div className="absolute inset-4 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center">
                                <Disc size={32} className="text-zinc-600" />
                            </div>
                        </div>
                        <p className="font-bold text-white font-persian">{t('noSongs')}</p>
                        <p className="text-sm text-gray-500 font-persian">{t('addSongsDesc')}</p>
                    </div>
                ) : searchQuery && filteredTracks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-500 animate-fade-in">
                        <XCircle size={48} className="text-zinc-700" />
                        <p className="text-sm font-bold text-white">{t('playlistNoResults')}</p>
                    </div>
                ) : groupedTracks ? (
                    <div key="grouped" className="flex flex-col gap-1">
                        {groupedTracks.map(group => (
                            <div key={group.album}>
                                <div className="sticky top-0 z-20 flex items-center gap-2 px-2 py-1.5 bg-zinc-950/90 backdrop-blur-md">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate">{group.album}</span>
                                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 shrink-0">{group.tracks.length}</span>
                                </div>
                                <div className="flex flex-col gap-2 mb-2">
                                    {group.tracks.map(({ track, index }) => (
                                        <PlaylistRow
                                            key={track.id}
                                            track={track}
                                            index={index}
                                            isCurrent={track.id === playlist[currentTrackIndex]?.id}
                                            isPlaying={isPlaying}
                                            isSelected={selectedTrackIds.has(track.id)}
                                            selectionMode={isSelectionMode}
                                            reorderEnabled={reorderEnabled}
                                            moreOpen={moreMenuId === track.id}
                                            dropPos={dropPos && dropPos.index === index ? dropPos.pos : null}
                                            staggerDelay={Math.min(index * 24, 400)}
                                            formatTime={formatTime}
                                            onPlay={(tr) => { setOnlineSession(null); const i = playlist.findIndex(p => p.id === tr.id); setCurrentTrackIndex(i); setIsPlaying(true); }}
                                            onDelete={(id) => { setTrackToDelete(id); setTracksToDeleteCount(1); setDeleteConfirmOpen(true); }}
                                            onDetails={(tr) => { setDetailsTrack(tr); setIsMusicDetailsOpen(true); }}
                                            onMoreToggle={setMoreMenuId}
                                            onToggleSelect={(id) => setSelectedTrackIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                                            onDragStart={handleDragStart}
                                            onDragOverRow={handleDragOverRow}
                                            onDropRow={handleDropRow}
                                            onDragEnd={handleDragEnd}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div key={searchQuery} className="flex flex-col gap-2">
                        {filteredTracks.map((track, idx) => (
                            <div key={track.id} className="cv-row mb-2">
                                <PlaylistRow
                                    track={track}
                                    index={idx}
                                    isCurrent={track.id === playlist[currentTrackIndex]?.id}
                                    isPlaying={isPlaying}
                                    isSelected={selectedTrackIds.has(track.id)}
                                    selectionMode={isSelectionMode}
                                    reorderEnabled={false}
                                    moreOpen={moreMenuId === track.id}
                                    dropPos={null}
                                    staggerDelay={Math.min(idx * 24, 400)}
                                    formatTime={formatTime}
                                    onPlay={(tr) => { setOnlineSession(null); const i = playlist.findIndex(p => p.id === tr.id); setCurrentTrackIndex(i); setIsPlaying(true); }}
                                    onDelete={(id) => { setTrackToDelete(id); setTracksToDeleteCount(1); setDeleteConfirmOpen(true); }}
                                    onDetails={(tr) => { setDetailsTrack(tr); setIsMusicDetailsOpen(true); }}
                                    onMoreToggle={setMoreMenuId}
                                    onToggleSelect={(id) => setSelectedTrackIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                                    onDragStart={handleDragStart}
                                    onDragOverRow={handleDragOverRow}
                                    onDropRow={handleDropRow}
                                    onDragEnd={handleDragEnd}
                                />
                            </div>
                        ))}
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
