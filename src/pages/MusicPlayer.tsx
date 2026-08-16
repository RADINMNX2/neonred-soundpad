
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, 
  ListMusic, Music, Volume2, Trash2, Plus, Disc, Clock, Sliders, Check, X, MousePointer2, Settings, BarChart2, Shrink, Globe
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { MusicTrack, ExtendedAudioElement, VisualizerConfig, SpatiflacExtension, OnlineTrack, QualityOption } from '../types';
import { fileToBase64, extractAlbumArt, getDominantColor, parseAudioMetadata } from '../utils/audioHelpers';
import RealTimeVisualizer from '../components/RealTimeVisualizer';
import EqualizerModal from '../components/EqualizerModal';
import ConfirmationModal from '../components/ConfirmationModal';
import MusicDetailsModal from '../components/MusicDetailsModal';
import PlayerSettingsModal from '../components/PlayerSettingsModal';
import OnlineMusicPanel from '../components/OnlineMusicPanel';
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
  useEffect(() => { localStorage.setItem('music_playlist', JSON.stringify(playlist)); }, [playlist]);
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
  };

  const handleDeleteSelected = () => {
    if (selectedTrackIds.size === 0) return;
    setTracksToDeleteCount(selectedTrackIds.size);
    setTrackToDelete(null);
    setDeleteConfirmOpen(true);
  };

  const handleTrackContextMenu = (e: React.MouseEvent, track: MusicTrack) => {
      e.preventDefault();
      setDetailsTrack(track);
      setIsMusicDetailsOpen(true);
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
    <div className="flex flex-col h-full bg-gradient-to-br from-black via-zinc-950 to-black p-4 md:p-6 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row gap-6 h-full z-10">
        
        {/* LEFT: NOW PLAYING */}
        <div className="lg:w-1/3 flex flex-col gap-6">
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl shadow-black/50 group">
                <div className="absolute top-4 left-4 z-30 flex gap-2">
                    <button onClick={() => setIsEqOpen(true)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-white hover:bg-black/60 transition-all border border-white/10" title={t('equalizer')}><Sliders size={18} /></button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-white hover:bg-black/60 transition-all border border-white/10" title="Visualizer Settings"><Settings size={18} /></button>
                </div>
                
                {/* Switch to Mini Player Button */}
                <div className="absolute top-4 right-4 z-30">
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
            <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 justify-between items-center bg-black/20">
                <div className="flex items-center gap-3"><div className="p-2 bg-pink-500/10 rounded-lg text-pink-500"><ListMusic size={24} /></div><div><h3 className="text-lg font-bold text-white font-persian">{t('playlist')}</h3><p className="text-xs text-gray-500 font-mono">{playlist.length} TRACKS</p></div></div>
                <div className="flex items-center gap-2">
                    {isSelectionMode ? (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <button onClick={handleDeleteSelected} disabled={selectedTrackIds.size === 0} className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"><Trash2 size={16} />Delete ({selectedTrackIds.size})</button>
                            <button onClick={() => setIsSelectionMode(false)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-xl transition-all"><X size={16} /></button>
                        </div>
                    ) : (
                        <button onClick={() => setIsSelectionMode(true)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5" title="Select Mode"><MousePointer2 size={18} /></button>
                    )}
                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                    <button onClick={() => setOnlineOpen(true)} className="px-3 py-2 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-pink-500/40 shadow-lg shadow-pink-900/20 hover:shadow-[0_0_20px_rgba(236,72,153,0.35)] active:scale-95"><Globe size={16} /><span>{t('onlineBtn')}</span></button>
                    <label className="cursor-pointer px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/5 hover:border-white/20"><Plus size={16} /><span>{t('addSongs')}</span><input type="file" multiple accept="audio/*" className="hidden" onChange={(e) => handleFileAdd(e.target.files)} /></label>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {playlist.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50"><Disc size={64} className="mb-4 text-zinc-700" /><p>{t('noSongs')}</p></div>
                ) : (
                    <div className="space-y-2">
                        {playlist.map((track, idx) => {
                            const isCurrent = idx === currentTrackIndex;
                            const isSelected = selectedTrackIds.has(track.id);
                            
                            return (
                                <div 
                                    key={track.id} 
                                    onContextMenu={(e) => handleTrackContextMenu(e, track)}
                                    onClick={() => isSelectionMode ? setSelectedTrackIds(prev => { const n = new Set(prev); if (n.has(track.id)) n.delete(track.id); else n.add(track.id); return n; }) : (setOnlineSession(null), setCurrentTrackIndex(idx), setIsPlaying(true))} 
                                    className={`group relative flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden hover:scale-[1.01] border
                                        ${isSelected ? 'bg-red-900/20 border-red-500/50' : 
                                          isCurrent ? 'bg-white/5 border-pink-500/30' : 
                                          'bg-transparent border-transparent hover:bg-white/5'
                                        }
                                    `}
                                >
                                    {/* Selection/Index */}
                                    <div className="w-8 text-center text-xs font-mono text-gray-500 flex justify-center items-center z-10 shrink-0">
                                        {isSelectionMode ? (
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-red-500 border-red-500' : 'border-zinc-600 bg-black/40'}`}>
                                                {isSelected && <Check size={12} className="text-white" />}
                                            </div>
                                        ) : (
                                            <span className="group-hover:text-white transition-colors">{idx + 1}</span>
                                        )}
                                    </div>

                                    {/* Album Art Frame */}
                                    <div className={`relative w-14 h-14 rounded-xl overflow-hidden shadow-lg border border-white/10 shrink-0 group-hover:shadow-pink-900/20 transition-all z-10 ${isCurrent && isPlaying ? 'ring-2 ring-pink-500/50' : ''}`}>
                                        {track.cover ? (
                                            <img src={track.cover} alt="Art" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                                                <Music size={20} className="text-zinc-600" />
                                            </div>
                                        )}
                                        
                                        {/* Playing Overlay */}
                                        {isCurrent && isPlaying && (
                                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                                <BarChart2 size={24} className="text-white animate-pulse" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 z-10">
                                        <h4 className={`font-bold truncate text-base mb-0.5 ${isCurrent ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-400' : 'text-gray-200 group-hover:text-white'}`}>
                                            {track.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 truncate font-medium group-hover:text-gray-400 transition-colors">
                                            {track.artist}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-4 z-10 pr-2">
                                        {isCurrent && (
                                            <div className="px-2 py-1 rounded-md bg-pink-500/10 border border-pink-500/20">
                                                <span className="text-[10px] font-bold text-pink-500 animate-pulse">PLAYING</span>
                                            </div>
                                        )}
                                        
                                        {!isSelectionMode && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setTrackToDelete(track.id); setTracksToDeleteCount(1); setDeleteConfirmOpen(true); }} 
                                                className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Active Glow Background */}
                                    {isCurrent && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-pink-600/5 to-transparent pointer-events-none"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>

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
