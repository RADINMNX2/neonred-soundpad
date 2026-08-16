
import React, { useState, useRef, useEffect, useCallback, createRef } from 'react';
import { Upload, VolumeX, Search, Mic, MicOff, Headphones, Trash2, X, StopCircle, MousePointer2, Plus } from 'lucide-react';
import { SoundEffect, ExtendedAudioElement, GlobalShortcut, MicEqSettings } from '../types';
import SoundButton from '../components/SoundButton';
import RenameModal from '../components/RenameModal';
import HotkeyModal from '../components/HotkeyModal';
import SoundDetailsModal from '../components/SoundDetailsModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchModal from '../components/SearchModal';
import { fileToBase64, extractAlbumArt } from '../utils/audioHelpers';
import { useLanguage } from '../context/LanguageContext';

interface SoundPadProps {
  monitorDeviceId: string;
  injectorDeviceId: string;
  micInputDeviceId: string;
  masterVolume: number;
  micVolume: number;
  micEqSettings: MicEqSettings;
  stopKeybind: string | null;
  onStopKeybindChange: (key: string | undefined) => void;
}

interface DualAudio {
  monitor: ExtendedAudioElement;
  injector: ExtendedAudioElement | null;
  originalVolume: number;
  visSource?: MediaStreamAudioSourceNode; 
  stopListener?: () => void;
}

const SoundPad: React.FC<SoundPadProps> = ({ 
  monitorDeviceId, 
  injectorDeviceId, 
  micInputDeviceId, 
  masterVolume, 
  micVolume, 
  micEqSettings,
  stopKeybind,
  onStopKeybindChange
}) => {
  const { t, isRTL } = useLanguage();

  // --- STATE ---
  const [sounds, setSounds] = useState<SoundEffect[]>(() => {
    const saved = localStorage.getItem('soundpad_sounds');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (err) {
      console.error("Error parsing soundpad_sounds", err);
      return [];
    }
  });

  const soundsRef = useRef(sounds);
  useEffect(() => {
    soundsRef.current = sounds;
    try {
      localStorage.setItem('soundpad_sounds', JSON.stringify(sounds));
    } catch (err) {
      console.warn("Sound persistence failed (quota exceeded?), retrying without album art", err);
      try {
        const withoutImages = sounds.map(s => ({ ...s, image: undefined }));
        localStorage.setItem('soundpad_sounds', JSON.stringify(withoutImages));
      } catch (err2) {
        console.error("Could not persist sounds", err2);
      }
    }
  }, [sounds]);

  const [playingIds, setPlayingIds] = useState<Set<string>>(new Set());
  
  // Search & Highlight Logic
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedSoundId, setHighlightedSoundId] = useState<string | null>(null);
  const soundCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSoundIds, setSelectedSoundIds] = useState<Set<string>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [isMicMuted, setIsMicMuted] = useState(() => localStorage.getItem('isMicMuted') === 'true');
  const [isDeafened, setIsDeafened] = useState(() => localStorage.getItem('isDeafened') === 'true');

  // --- REFS FOR SYNC STATE ACCESS (Fixes the "Double Click" bug) ---
  const isMicMutedRef = useRef(isMicMuted);
  const isDeafenedRef = useRef(isDeafened);
  
  useEffect(() => { isMicMutedRef.current = isMicMuted; localStorage.setItem('isMicMuted', String(isMicMuted)); }, [isMicMuted]);
  useEffect(() => { isDeafenedRef.current = isDeafened; localStorage.setItem('isDeafened', String(isDeafened)); }, [isDeafened]);

  // Modals
  const [editingSound, setEditingSound] = useState<SoundEffect | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isHotkeyOpen, setIsHotkeyOpen] = useState(false);
  const [isStopHotkeyOpen, setIsStopHotkeyOpen] = useState(false);
  const [detailsSound, setDetailsSound] = useState<SoundEffect | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [playbackState, setPlaybackState] = useState({ currentTime: 0, duration: 0 });

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioMap = useRef<Map<string, DualAudio>>(new Map());
  
  // Mic Processing Refs
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const eq10BandFiltersRef = useRef<BiquadFilterNode[]>([]);
  const clarityFilterRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const micDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micAudioElementRef = useRef<ExtendedAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Untracked timeouts (highlight, etc.) cleared on unmount
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => {
    timeoutRefs.current.forEach(t => clearTimeout(t));
    timeoutRefs.current = [];
  }, []);

  // --- SHORTCUTS ---
  useEffect(() => {
    const shortcuts: GlobalShortcut[] = sounds
      .filter(s => s.shortcut)
      .map(s => ({ id: s.id, accelerator: s.shortcut! }));
    
    if (stopKeybind) {
      shortcuts.push({ id: 'STOP_ALL', accelerator: stopKeybind });
    }
    
    if (window.electronAPI) {
      window.electronAPI.registerShortcuts(shortcuts);
    }
  }, [sounds, stopKeybind]);

  // --- PLAYBACK TRACKING ---
  useEffect(() => {
    let animationFrameId: number;

    const trackProgress = () => {
      if (isDetailsOpen && detailsSound && playingIds.has(detailsSound.id)) {
        const pair = activeAudioMap.current.get(detailsSound.id);
        if (pair) {
          const monitor = pair.monitor;
          if (monitor.duration && Number.isFinite(monitor.duration)) {
             setPlaybackState({
               currentTime: monitor.currentTime,
               duration: monitor.duration
             });
          }
        }
      } else {
        setPlaybackState(prev => prev.currentTime !== 0 ? { currentTime: 0, duration: 0 } : prev);
      }
      animationFrameId = requestAnimationFrame(trackProgress);
    };

    if (isDetailsOpen) {
      trackProgress();
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isDetailsOpen, detailsSound, playingIds]);

  // --- HANDLERS ---
  const stopSound = useCallback((id: string) => {
    const pair = activeAudioMap.current.get(id);
    if (pair) {
      if (pair.stopListener) {
        pair.monitor.removeEventListener('timeupdate', pair.stopListener);
      }

      pair.monitor.pause();
      if (pair.injector) pair.injector.pause();
      
      pair.monitor.currentTime = 0;
      if (pair.injector) pair.injector.currentTime = 0;
      
      if (pair.visSource) { try { pair.visSource.disconnect(); } catch(e) {} }
      activeAudioMap.current.delete(id);
      setPlayingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }, []);

  const stopAll = useCallback(() => {
    activeAudioMap.current.forEach((pair) => {
      if (pair.stopListener) pair.monitor.removeEventListener('timeupdate', pair.stopListener);
      pair.monitor.pause();
      if (pair.injector) pair.injector.pause();
      if (pair.visSource) { try { pair.visSource.disconnect(); } catch(e) {} }
    });
    activeAudioMap.current.clear();
    setPlayingIds(new Set());
  }, []);

  const openDetails = useCallback((sound: SoundEffect) => { 
    setDetailsSound(sound); 
    setIsDetailsOpen(true); 
    setPlaybackState({ currentTime: 0, duration: 0 }); 
  }, []);

  const toggleSelectSound = useCallback((id: string) => {
    setSelectedSoundIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDeleteSelected = async () => {
    for (const id of selectedSoundIds) {
      const sound = sounds.find(s => s.id === id);
      stopSound(id);
      // Delete file from disk if we have an API for it
      if (window.electronAPI && sound && sound.path) {
          await window.electronAPI.deleteSoundFile(sound.path).catch(console.error);
      }
    }
    setSounds(prev => prev.filter(s => !selectedSoundIds.has(s.id)));
    setSelectedSoundIds(new Set());
    setIsSelectionMode(false);
  };

  const handleSearchResultSelect = (id: string) => {
    setHighlightedSoundId(id);
    const element = soundCardRefs.current.get(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const timeout = setTimeout(() => {
        setHighlightedSoundId(null);
    }, 2000);
    timeoutRefs.current.push(timeout);
  };

  // --- CORE PLAYBACK ---
  const playSound = useCallback(async (id: string, forceRestart = false) => {
    // Ensure AudioContext is running
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (id === 'STOP_ALL') {
      stopAll();
      return;
    }

    const sound = soundsRef.current.find((s) => s.id === id);
    if (!sound) return;

    // Use Refs to get the absolute latest state
    const currentDeafen = isDeafenedRef.current;
    const currentMicMute = isMicMutedRef.current;

    if (activeAudioMap.current.has(id)) {
      if (forceRestart) {
         const pair = activeAudioMap.current.get(id);
         if (pair) {
             const startTime = sound.trimStart || 0;
             pair.monitor.currentTime = startTime;
             if (pair.injector) pair.injector.currentTime = startTime;
             
             pair.monitor.muted = currentDeafen;
             if (pair.injector) pair.injector.muted = !(!currentMicMute && injectorDeviceId);

             pair.monitor.play().catch(console.error);
             if (pair.injector) pair.injector.play().catch(console.error);
         }
         return;
      } else {
         stopSound(id);
         return;
      }
    }

    let src = sound.url;
    if (sound.path) {
      src = `file://${sound.path}`; 
    }

    // Monitor: What I hear (Affected by Deafen)
    const monitorAudio = new Audio(src) as ExtendedAudioElement;
    monitorAudio.preload = 'auto';
    monitorAudio.currentTime = sound.trimStart || 0;
    
    // Initial State Check using REFS
    const baseVol = sound.volume * masterVolume;
    monitorAudio.volume = currentDeafen ? 0 : baseVol;
    monitorAudio.muted = currentDeafen; 
    
    // Injector: What others hear (Affected by Mic Mute)
    let injectorAudio: ExtendedAudioElement | null = null;
    const shouldInject = injectorDeviceId && injectorDeviceId !== '';
    
    if (shouldInject) {
      injectorAudio = new Audio(src) as ExtendedAudioElement;
      injectorAudio.preload = 'auto';
      
      const shouldPlayToInjector = !currentMicMute;
      injectorAudio.volume = shouldPlayToInjector ? baseVol : 0;
      injectorAudio.muted = !shouldPlayToInjector;

      injectorAudio.currentTime = sound.trimStart || 0;
      
      try {
        if (typeof injectorAudio.setSinkId === 'function') {
           await injectorAudio.setSinkId(injectorDeviceId);
        }
      } catch (err) {
        injectorAudio.volume = 0;
      }
    }

    let stopListener: (() => void) | undefined = undefined;
    if (sound.trimEnd) {
       stopListener = () => {
           if (monitorAudio.currentTime >= (sound.trimEnd!)) {
               stopSound(id);
           }
       };
       monitorAudio.addEventListener('timeupdate', stopListener);
    } else {
        monitorAudio.onended = () => stopSound(id);
    }

    try {
      if (monitorDeviceId && typeof monitorAudio.setSinkId === 'function') {
        await monitorAudio.setSinkId(monitorDeviceId);
      }
    } catch (err) {}

    const audioPair: DualAudio = { 
      monitor: monitorAudio, 
      injector: injectorAudio,
      originalVolume: sound.volume,
      stopListener
    };

    activeAudioMap.current.set(id, audioPair);

    try {
      const promises = [monitorAudio.play()];
      if (injectorAudio) {
        promises.push(injectorAudio.play());
      }
      await Promise.all(promises);
      // Guard: sound may have been stopped while awaiting play
      if (!activeAudioMap.current.has(id)) return;
      setPlayingIds((prev) => new Set(prev).add(id));
      
      // Final Safety Check
      monitorAudio.muted = isDeafenedRef.current;
      if (injectorAudio) injectorAudio.muted = !(!isMicMutedRef.current && injectorDeviceId);

    } catch (e) { 
      console.error("Playback failed", e); 
      stopSound(id);
    }
  }, [monitorDeviceId, injectorDeviceId, masterVolume, stopSound, stopAll]); 

  // --- SHORTCUT LISTENER ---
  useEffect(() => {
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onShortcutTriggered((id) => {
        playSound(id, false);
      });
      return cleanup;
    }
  }, [playSound]);

  // --- AUDIO INIT ---
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    // OPTIMIZATION: Use 'playback' latency hint for better quality (less dropouts/bass issues)
    // sampleRate 48000 is standard for Video/DVD quality.
    const ctx = new AudioContextClass({ latencyHint: 'playback', sampleRate: 48000 });
    audioContextRef.current = ctx;

    const resumeContext = () => {
      if (ctx.state === 'suspended') { ctx.resume(); }
    };
    window.addEventListener('click', resumeContext);

    return () => {
      window.removeEventListener('click', resumeContext);
      ctx.close();
      if (micAudioElementRef.current) {
        micAudioElementRef.current.pause();
        micAudioElementRef.current.srcObject = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
    };
  }, []);

  // --- MIC PASSTHROUGH ---
  useEffect(() => {
    let isActive = true;

    const teardownMicChain = () => {
      if (micSourceRef.current) { try { micSourceRef.current.disconnect(); } catch (e) {} micSourceRef.current = null; }
      if (micGainNodeRef.current) { try { micGainNodeRef.current.disconnect(); } catch (e) {} micGainNodeRef.current = null; }
      if (clarityFilterRef.current) { try { clarityFilterRef.current.disconnect(); } catch (e) {} clarityFilterRef.current = null; }
      if (compressorRef.current) { try { compressorRef.current.disconnect(); } catch (e) {} compressorRef.current = null; }
      if (micDestRef.current) { try { micDestRef.current.disconnect(); } catch (e) {} micDestRef.current = null; }
      if (micAudioElementRef.current) { micAudioElementRef.current.pause(); micAudioElementRef.current.srcObject = null; micAudioElementRef.current = null; }
      if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    };

    const setupMicPassthrough = async () => {
      // Always tear down the existing chain first, even when disabling (None selected)
      teardownMicChain();

      const ctx = audioContextRef.current;
      if (!ctx) return;
      if (!injectorDeviceId) return;
      if (ctx.state === 'suspended') await ctx.resume();

      try {
        const baseAudio = {
          // HARD DISABLE Windows Processing to keep raw quality
          echoCancellation: micEqSettings.echoCancellation, 
          noiseSuppression: micEqSettings.noiseSuppression,
          autoGainControl: false,
          channelCount: 2, // Force Stereo
          latency: 0.02
        };
        let stream = null;
        if (micInputDeviceId && micInputDeviceId !== 'default') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { ...baseAudio, deviceId: { exact: micInputDeviceId } } as any });
          } catch (e) {
            console.warn('Mic device not available, falling back to default input', e);
            stream = null;
          }
        }
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: { ...baseAudio } as any });
        }

        if (!isActive) { stream.getTracks().forEach(t => t.stop()); return; }
        micStreamRef.current = stream;

        const source = ctx.createMediaStreamSource(stream);
        micSourceRef.current = source;
        const gainNode = ctx.createGain();
        gainNode.gain.value = micEqSettings.micGain;
        micGainNodeRef.current = gainNode;

        // --- 10-BAND EQ FILTERS ---
        const eq10Gains = micEqSettings.eq10Bands || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const freqs = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        const eqNodes: BiquadFilterNode[] = [];
        
        freqs.forEach((freq, idx) => {
          const filter = ctx.createBiquadFilter();
          if (idx === 0) {
            filter.type = 'lowshelf';
          } else if (idx === 9) {
            filter.type = 'highshelf';
          } else {
            filter.type = 'peaking';
            filter.Q.value = 1.4;
          }
          filter.frequency.value = freq;
          filter.gain.value = eq10Gains[idx] || 0;
          eqNodes.push(filter);
        });
        eq10BandFiltersRef.current = eqNodes;

        const clarity = ctx.createBiquadFilter();
        clarity.type = 'highshelf'; 
        clarity.frequency.value = 3000;
        clarity.gain.value = micEqSettings.voiceClarity;
        clarityFilterRef.current = clarity;
        const compressor = ctx.createDynamicsCompressor();
        if (micEqSettings.compressor) {
            compressor.threshold.value = -24; compressor.knee.value = 30; compressor.ratio.value = 12;
            compressor.attack.value = 0.003; compressor.release.value = 0.25;
        } else {
            compressor.threshold.value = 0; compressor.ratio.value = 1;
        }
        compressorRef.current = compressor;
        
        const dest = ctx.createMediaStreamDestination();
        dest.channelCount = 2; // IMPORTANT: Ensure destination is stereo for high quality
        micDestRef.current = dest;

        // Connect Chain: source -> gainNode -> eqNodes[0..9] -> clarity -> compressor -> dest
        source.connect(gainNode);
        let prevNode: AudioNode = gainNode;
        eqNodes.forEach((node) => {
          prevNode.connect(node);
          prevNode = node;
        });
        prevNode.connect(clarity);
        clarity.connect(compressor);
        compressor.connect(dest);

        const outputAudio = new Audio() as ExtendedAudioElement;
        outputAudio.srcObject = dest.stream;
        
        // Initial State for Mic
        outputAudio.volume = isMicMutedRef.current ? 0 : micVolume;
        outputAudio.muted = isMicMutedRef.current;
        
        (outputAudio as any).disableRemotePlayback = true; 
        micAudioElementRef.current = outputAudio;

        try { await outputAudio.setSinkId(injectorDeviceId); } catch (e) {}
        
        outputAudio.play().catch(console.warn);

      } catch (err) { console.warn("Mic passthrough setup failed", err); }
    };

    setupMicPassthrough();
    return () => { isActive = false; teardownMicChain(); };
  }, [injectorDeviceId, micInputDeviceId, micEqSettings.noiseSuppression, micEqSettings.echoCancellation, micEqSettings.compressor]);

  // Real-time gain updates for Mic EQ
  useEffect(() => {
    const currentTime = audioContextRef.current?.currentTime || 0;
    if (micGainNodeRef.current) micGainNodeRef.current.gain.setTargetAtTime(micEqSettings.micGain, currentTime, 0.05);
    if (clarityFilterRef.current) clarityFilterRef.current.gain.setTargetAtTime(micEqSettings.voiceClarity, currentTime, 0.05);
    if (eq10BandFiltersRef.current && micEqSettings.eq10Bands) {
      const gains = micEqSettings.eq10Bands;
      eq10BandFiltersRef.current.forEach((filter, idx) => {
        if (filter && gains[idx] !== undefined) {
          filter.gain.setTargetAtTime(gains[idx], currentTime, 0.05);
        }
      });
    }
    if (compressorRef.current) {
         if (micEqSettings.compressor) {
            compressorRef.current.threshold.setTargetAtTime(-24, currentTime, 0.1);
            compressorRef.current.ratio.setTargetAtTime(12, currentTime, 0.1);
         } else {
            compressorRef.current.threshold.setTargetAtTime(0, currentTime, 0.1);
            compressorRef.current.ratio.setTargetAtTime(1, currentTime, 0.1);
         }
    }
  }, [micEqSettings]);

  // --- INSTANT REACTIVE UPDATES ---
  
  useEffect(() => {
      if (micAudioElementRef.current) {
          if (isMicMuted) {
              micAudioElementRef.current.muted = true;
              micAudioElementRef.current.volume = 0;
          } else {
              micAudioElementRef.current.muted = false;
              micAudioElementRef.current.volume = micVolume;
              
              if (micAudioElementRef.current.paused && audioContextRef.current?.state === 'running') {
                  micAudioElementRef.current.play().catch(console.warn);
              }
          }
      }
  }, [isMicMuted, micVolume]);

  useEffect(() => {
    activeAudioMap.current.forEach((audioPair) => {
      const baseVol = audioPair.originalVolume * masterVolume;
      
      audioPair.monitor.muted = isDeafened; 
      audioPair.monitor.volume = isDeafened ? 0 : baseVol;

      if (audioPair.injector) {
        const shouldInject = !isMicMuted && injectorDeviceId;
        audioPair.injector.muted = !shouldInject;
        audioPair.injector.volume = shouldInject ? baseVol : 0;
      }
    });
  }, [isMicMuted, isDeafened, masterVolume, injectorDeviceId]);

  // Downscale artwork data URL to max 256x256 to avoid blowing localStorage quota
  const getCappedArtwork = async (file: File): Promise<string | undefined> => {
    const art = await extractAlbumArt(file);
    if (!art) return undefined;
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Artwork load failed'));
        img.src = art;
      });
      const max = 256;
      let w = img.width;
      let h = img.height;
      if (w > max || h > max) {
        const scale = max / Math.max(w, h);
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (err) {
      console.warn("Could not downscale artwork", err);
      return undefined;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newSounds: SoundEffect[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const originalPath = (file as any).path;
        let finalPath = originalPath;
        let url = '';
        if (originalPath && window.electronAPI) {
           try {
             finalPath = await window.electronAPI.saveSoundFile(originalPath);
             url = `file://${finalPath}`;
           } catch (err) { url = typeof originalPath === 'string' ? `file://${originalPath}` : ''; }
        } else {
          url = await fileToBase64(file);
        }
        
        // Extract album art OR video frame (capped to 256px for persistence)
        const mediaArt = await getCappedArtwork(file);
        
        newSounds.push({
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: url,
          path: finalPath || undefined,
          color: 'red',
          volume: 1.0,
          image: mediaArt,
          isFavorite: false
        });
      }
      setSounds((prev) => [...prev, ...newSounds]);
    }
    // Reset so selecting the same file again re-fires onChange
    event.target.value = '';
  };

  const updateSoundVolume = (id: string, vol: number) => {
    setSounds(prev => prev.map(s => s.id === id ? { ...s, volume: vol } : s));
    const pair = activeAudioMap.current.get(id);
    if (pair) {
      pair.originalVolume = vol; 
      const baseVol = vol * masterVolume;
      
      pair.monitor.volume = isDeafened ? 0 : baseVol;
      if (pair.injector) {
         const shouldInject = !isMicMuted && injectorDeviceId;
         pair.injector.volume = shouldInject ? baseVol : 0;
      }
    }
    if (detailsSound && detailsSound.id === id) setDetailsSound(prev => prev ? { ...prev, volume: vol } : null);
  };

  const handleSeek = (id: string, time: number) => {
    const pair = activeAudioMap.current.get(id);
    if (pair && Number.isFinite(time)) {
        const duration = pair.monitor.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;
        pair.monitor.currentTime = time;
        if (pair.injector) pair.injector.currentTime = time;
        setPlaybackState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const handleDelete = async (id: string) => {
    stopSound(id);
    const sound = sounds.find(s => s.id === id);
    
    // Delete from file system
    if (window.electronAPI && sound && sound.path) {
        await window.electronAPI.deleteSoundFile(sound.path).catch(console.error);
    }

    setSounds(prev => prev.filter(s => s.id !== id));
    if (isDetailsOpen && detailsSound?.id === id) setIsDetailsOpen(false);
  };

  const toggleFavorite = (id: string) => {
    setSounds(prev => prev.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
    if (detailsSound && detailsSound.id === id) setDetailsSound(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
  };

  const openRename = (sound: SoundEffect) => { setEditingSound(sound); setIsRenameOpen(true); };
  const openHotkey = (sound: SoundEffect) => { setEditingSound(sound); setIsHotkeyOpen(true); };
  const saveName = (id: string, newName: string) => { setSounds(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s)); if (detailsSound && detailsSound.id === id) { setDetailsSound(prev => prev ? { ...prev, name: newName } : null); } };
  const saveHotkey = (id: string, hotkey: string | undefined) => { setSounds(prev => prev.map(s => s.id === id ? { ...s, shortcut: hotkey } : s)); if (detailsSound && detailsSound.id === id) { setDetailsSound(prev => prev ? { ...prev, shortcut: hotkey } : null); } };
  const saveTrim = (id: string, start: number, end: number) => { setSounds(prev => prev.map(s => s.id === id ? { ...s, trimStart: start, trimEnd: end } : s)); if (detailsSound && detailsSound.id === id) { setDetailsSound(prev => prev ? { ...prev, trimStart: start, trimEnd: end } : null); } };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-black via-zinc-950 to-black p-4 md:p-6 animate-fade-in relative">
      
      {/* --- COMPACT TOOLBAR --- */}
      <div className="flex items-center justify-between mb-6 z-20">
         
         {/* Left Group */}
         <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsSearchOpen(true)}
                className="p-3 bg-zinc-900 border border-white/5 rounded-xl hover:border-red-500 hover:text-white text-gray-400 transition-all active:scale-95 shadow-lg"
                title={t('searchPlaceholder')}
             >
                <Search size={20} />
             </button>

             <div className="h-8 w-px bg-white/10 mx-1"></div>

             {/* Core Controls */}
             <div className="flex bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/5 p-1 gap-1">
                <button 
                    onClick={stopAll}
                    onContextMenu={(e) => { e.preventDefault(); setIsStopHotkeyOpen(true); }}
                    className="p-2.5 hover:bg-red-600/10 hover:text-red-500 text-gray-400 rounded-lg transition-all"
                    title={t('stopAll')}
                >
                    <VolumeX size={20} />
                </button>
                <button 
                    onClick={() => setIsMicMuted(!isMicMuted)}
                    className={`p-2.5 rounded-lg transition-all ${isMicMuted ? 'bg-red-600 text-white' : 'hover:bg-white/10 text-gray-400'}`}
                    title={t('muteMic')}
                >
                    {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button 
                    onClick={() => setIsDeafened(!isDeafened)}
                    className={`p-2.5 rounded-lg transition-all ${isDeafened ? 'bg-red-600 text-white' : 'hover:bg-white/10 text-gray-400'}`}
                    title={t('deafen')}
                >
                    <Headphones size={20} />
                </button>
             </div>
         </div>

         {/* Right Group */}
         <div className="flex items-center gap-3">
             {isSelectionMode ? (
                  <div className="flex items-center gap-2 bg-red-900/20 px-2 py-1.5 rounded-xl border border-red-500/30 animate-slide-up">
                     <span className="text-xs font-bold text-red-400 px-2">{selectedSoundIds.size} Selected</span>
                     <button 
                       onClick={() => selectedSoundIds.size > 0 && setIsDeleteConfirmOpen(true)}
                       disabled={selectedSoundIds.size === 0}
                       className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all disabled:opacity-50"
                     >
                        <Trash2 size={18} />
                     </button>
                     <button 
                       onClick={() => { setIsSelectionMode(false); setSelectedSoundIds(new Set()); }}
                       className="p-2 hover:bg-white/10 text-gray-300 rounded-lg transition-all"
                     >
                        <X size={18} />
                     </button>
                  </div>
             ) : (
                <button 
                   onClick={() => setIsSelectionMode(true)}
                   className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
                   title="Select Mode"
                >
                    <MousePointer2 size={20} />
                </button>
             )}
             
             <label className="cursor-pointer group flex items-center gap-2 pl-3 pr-4 py-3 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-red-600 hover:to-pink-600 border border-white/5 text-white rounded-xl transition-all shadow-lg active:scale-95">
                  <Plus size={20} className="text-gray-400 group-hover:text-white" />
                  <span className="font-bold text-sm text-gray-300 group-hover:text-white hidden sm:inline">{t('upload')}</span>
                  {/* Updated input to accept video files */}
                  <input type="file" accept="audio/*,video/mp4,video/webm,video/ogg" multiple className="hidden" onChange={handleFileUpload} />
             </label>
         </div>

      </div>

      {/* --- GRID CONTENT --- */}
      <div 
        className="flex-1 overflow-y-auto pb-20 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800"
        style={{ contentVisibility: 'auto' }}
      >
        {sounds.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30 m-4"> 
             <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                <Upload size={32} className="text-gray-400" />
             </div>
             <p className="text-2xl font-bold text-white mb-2">{t('noSounds')}</p> 
             <p className="text-sm text-gray-500">{t('dragDrop')}</p> 
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {sounds.map((sound) => ( 
              <SoundButton 
                key={sound.id} 
                sound={sound} 
                isPlaying={playingIds.has(sound.id)} 
                isSelectionMode={isSelectionMode}
                isSelected={selectedSoundIds.has(sound.id)}
                isHighlighted={sound.id === highlightedSoundId}
                onPlay={(id) => playSound(id, false)}
                onStop={stopSound} 
                onOpenDetails={openDetails}
                onToggleSelect={toggleSelectSound}
                innerRef={(el) => {
                    if (el) soundCardRefs.current.set(sound.id, el);
                    else soundCardRefs.current.delete(sound.id);
                }}
              /> 
            ))}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      <SearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        sounds={sounds}
        onSelect={handleSearchResultSelect}
      />

      <SoundDetailsModal 
        sound={detailsSound} 
        isPlaying={detailsSound ? playingIds.has(detailsSound.id) : false} 
        isOpen={isDetailsOpen} 
        currentTime={playbackState.currentTime} 
        duration={playbackState.duration} 
        onClose={() => setIsDetailsOpen(false)} 
        onPlay={(id) => playSound(id, false)} 
        onStop={stopSound} 
        onSeek={handleSeek} 
        onDelete={handleDelete} 
        onEdit={openRename} 
        onHotkey={openHotkey} 
        onToggleFavorite={toggleFavorite} 
        onVolumeChange={updateSoundVolume} 
        onTrimSave={saveTrim}
        monitorDeviceId={monitorDeviceId} // Pass Monitor ID for Trim Preview
      />
      <RenameModal sound={editingSound} isOpen={isRenameOpen} onClose={() => setIsRenameOpen(false)} onSave={saveName} />
      <HotkeyModal sound={editingSound} isOpen={isHotkeyOpen} onClose={() => setIsHotkeyOpen(false)} onSave={saveHotkey} />
      
      <HotkeyModal 
        sound={{ id: 'STOP_ALL', shortcut: stopKeybind } as any}
        isOpen={isStopHotkeyOpen}
        onClose={() => setIsStopHotkeyOpen(false)}
        onSave={(_, hotkey) => onStopKeybindChange(hotkey)}
      />

      <ConfirmationModal 
        isOpen={isDeleteConfirmOpen} 
        onClose={() => setIsDeleteConfirmOpen(false)} 
        onConfirm={handleDeleteSelected}
        title={t('confirmTitle')}
        description={t('confirmBody').replace('{count}', String(selectedSoundIds.size))}
        confirmText={t('confirmDelete')}
        cancelText={t('cancel')}
        count={selectedSoundIds.size}
      />

      {/* Decorative Globs */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-red-600/5 rounded-full blur-[120px] pointer-events-none -z-0"></div>
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none -z-0"></div>
    </div>
  );
};

export default SoundPad;
