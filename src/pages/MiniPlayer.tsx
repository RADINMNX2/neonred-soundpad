
import React, { useEffect, useState, useRef } from 'react';
import { Maximize2, X, Play, Pause, SkipForward, SkipBack, Music, FileText } from 'lucide-react';
import { MiniPlayerState } from '../types';
import RealTimeVisualizer from '../components/RealTimeVisualizer';
import LyricsOverlay from '../components/LyricsOverlay';
import { getDominantColor } from '../utils/audioHelpers';

const MiniPlayer: React.FC = () => {
  const [musicState, setMusicState] = useState<MiniPlayerState>({ track: null, isPlaying: false, currentTime: 0, duration: 0 });
  const [dragTime, setDragTime] = useState(0);
  const [adaptiveColor, setAdaptiveColor] = useState<string>('#ef4444');
  
  // Store visualizer data from main window in a ref to avoid 60fps re-renders
  const visDataRef = useRef<Uint8Array | null>(null);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsEverOpen, setLyricsEverOpen] = useState(false);
  
  // Use ref for dragging state to avoid effect re-runs
  const isDraggingRef = useRef(false);
  const dragTimeRef = useRef(0);

  useEffect(() => {
    // Transparent background setup
    document.body.style.backgroundColor = 'transparent';
    const root = document.getElementById('root');
    if (root) root.style.backgroundColor = 'transparent';
    
    if (window.electronAPI) {
        const cleanupMusic = window.electronAPI.onMusicStateChange((state) => {
            // Only update time from state if NOT dragging
            if (!isDraggingRef.current) {
                setMusicState(state);
            } else {
                // If dragging, update everything BUT time
                setMusicState(prev => ({ 
                    ...state, 
                    currentTime: prev.currentTime 
                }));
            }
        });

        // Listen for visualizer data sync
        const cleanupVis = window.electronAPI.onVisualizerData((data) => {
            visDataRef.current = data;
        });

        return () => {
            cleanupMusic();
            cleanupVis();
        };
    }
  }, []);

  // Commit a drag seek; also released outside the input (window mouseup/touchend)
  const commitSeek = (val: number) => {
      isDraggingRef.current = false;
      if (window.electronAPI) {
          window.electronAPI.seekMusic(val);
      }
  };

  useEffect(() => {
      const onGlobalRelease = () => {
          if (isDraggingRef.current) {
              commitSeek(dragTimeRef.current);
          }
      };
      window.addEventListener('mouseup', onGlobalRelease);
      window.addEventListener('touchend', onGlobalRelease);
      return () => {
          window.removeEventListener('mouseup', onGlobalRelease);
          window.removeEventListener('touchend', onGlobalRelease);
      };
  }, []);

  // Extract color when track changes
  useEffect(() => {
    if (musicState.track?.cover) {
      getDominantColor(musicState.track.cover).then(color => setAdaptiveColor(color));
    } else {
      setAdaptiveColor('#ef4444');
    }
  }, [musicState.track?.id]);

  const handleExpand = () => window.electronAPI?.showMainApp();
  const handleClose = () => window.electronAPI?.hideToTray();
  const handlePlayPause = () => window.electronAPI?.sendMusicControl(musicState.isPlaying ? 'pause' : 'play');
  const handleNext = () => window.electronAPI?.sendMusicControl('next');
  const handlePrev = () => window.electronAPI?.sendMusicControl('prev');

  const handleSeekStart = () => {
      isDraggingRef.current = true;
      setDragTime(musicState.currentTime);
      dragTimeRef.current = musicState.currentTime;
  };

  const toggleLyrics = () => {
      setLyricsOpen(prev => {
          const next = !prev;
          if (next) setLyricsEverOpen(true);
          return next;
      });
  };

  const handleLyricsSeek = (time: number) => {
      window.electronAPI?.seekMusic(time);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setDragTime(val);
      dragTimeRef.current = val;
      // Update UI immediately while dragging
      setMusicState(prev => ({ ...prev, currentTime: val }));
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement>) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      dragTimeRef.current = val;
      commitSeek(val);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const { track, isPlaying, duration } = musicState;
  const displayTime = isDraggingRef.current ? dragTime : musicState.currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <div className="h-screen w-screen flex items-center justify-center p-2 bg-transparent overflow-hidden select-none">
        {/* Main Card */}
        <div className="relative w-full h-full bg-zinc-950/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden group">
            
            {/* Dynamic Background Glow */}
            <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 opacity-30 blur-[60px] pointer-events-none transition-colors duration-700"
                style={{ backgroundColor: adaptiveColor }}
            ></div>

            {/* Custom Title Bar (Draggable) */}
            <div className="relative z-30 h-10 flex items-center justify-between px-4 w-full shrink-0" style={{ WebkitAppRegion: 'drag' } as any}>
                <div className="flex items-center gap-2 opacity-70">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: adaptiveColor }}></div>
                    <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">NeonRed</span>
                </div>
                <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <button onClick={handleExpand} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Expand">
                        <Maximize2 size={14} />
                    </button>
                    <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white/10 rounded-full transition-all" title="Close">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col px-4 pb-4 overflow-hidden">
                
                {/* Artwork Container (Square with Visualizer) */}
                <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10 mb-3 bg-zinc-900 group/art">
                    {track?.cover ? (
                        <>
                            <img src={track.cover} alt="Art" className="w-full h-full object-cover transition-transform duration-700 group-hover/art:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                            <Music size={48} className="text-zinc-700" />
                        </div>
                    )}

                    {/* Lyrics Toggle Button */}
                    {track?.lyrics && (
                        <button 
                            onClick={toggleLyrics}
                            className={`absolute top-2 left-2 z-40 p-1.5 rounded-full backdrop-blur-md border border-white/10 transition-all ${lyricsOpen ? 'bg-red-500/80 text-white' : 'bg-black/40 text-white/70 hover:text-white hover:bg-black/60'}`}
                            title="Lyrics"
                        >
                            <FileText size={14} />
                        </button>
                    )}

                    {/* Lyrics Overlay */}
                    {lyricsEverOpen && track?.lyrics && (
                        <>
                            {track.cover && <img src={track.cover} alt="" aria-hidden className={`absolute inset-0 z-20 w-full h-full object-cover blur-2xl brightness-[.5] saturate-150 scale-110 pointer-events-none transition-opacity duration-500 ${lyricsOpen ? 'opacity-100' : 'opacity-0'}`} />}
                            <div className={`absolute inset-0 z-20 bg-black/45 backdrop-blur-md pointer-events-none transition-opacity duration-300 ${lyricsOpen ? 'opacity-100' : 'opacity-0'}`}></div>
                            <div className={`absolute inset-0 transition-opacity duration-300 ${lyricsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                <LyricsOverlay
                                    lyricsRaw={track.lyrics}
                                    currentTime={musicState.currentTime}
                                    duration={musicState.duration}
                                    isPlaying={isPlaying}
                                    onSeek={handleLyricsSeek}
                                    compact
                                />
                            </div>
                        </>
                    )}

                    {/* Visualizer Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 flex items-end justify-center px-4 pb-0 opacity-90 pointer-events-none mix-blend-screen">
                        <RealTimeVisualizer 
                            analyser={null} 
                            isPlaying={isPlaying} 
                            color={adaptiveColor} 
                            externalDataRef={visDataRef} // Use synced data from main window via ref (no 60fps re-renders)
                            config={{
                                isEnabled: true,
                                height: 0.8,
                                sensitivity: 1.2,
                                barCount: 20, 
                                barGap: 2,
                                colorMode: 'manual',
                                manualColor: adaptiveColor
                            }}
                        />
                    </div>
                </div>

                {/* Meta Data */}
                <div className="flex flex-col mb-3 px-1">
                    <h3 className="text-white font-black text-lg truncate drop-shadow-md leading-tight">{track?.title || "No Track"}</h3>
                    <p className="text-gray-400 text-xs font-medium truncate tracking-wide">{track?.artist || "NeonRed Audio"}</p>
                </div>

                {/* Progress Bar */}
                <div className="w-full flex flex-col gap-1 mb-3 group/seek">
                    <div className="relative h-1.5 bg-white/10 rounded-full w-full">
                        <div 
                            className="absolute top-0 left-0 h-full rounded-full pointer-events-none z-10 transition-all duration-100"
                            style={{ width: `${progressPercent}%`, backgroundColor: adaptiveColor, boxShadow: `0 0 10px ${adaptiveColor}80` }}
                        ></div>
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={displayTime}
                            onMouseDown={handleSeekStart}
                            onChange={handleSeek}
                            onMouseUp={handleSeekEnd}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            disabled={!track}
                        />
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] pointer-events-none z-10 transition-transform scale-0 group-hover/seek:scale-100"
                            style={{ left: `${progressPercent}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-gray-500 px-0.5">
                        <span>{formatTime(displayTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between px-2">
                    <button onClick={handlePrev} className="text-gray-400 hover:text-white transition-all hover:scale-110 active:scale-95 p-2">
                        <SkipBack size={24} className="fill-current" />
                    </button>
                    
                    <button 
                        onClick={handlePlayPause}
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 group"
                        style={{ backgroundColor: adaptiveColor, boxShadow: `0 0 20px ${adaptiveColor}40` }}
                    >
                        {isPlaying ? (
                            <Pause size={28} className="fill-white text-white" />
                        ) : (
                            <Play size={28} className="fill-white text-white ml-1" />
                        )}
                    </button>

                    <button onClick={handleNext} className="text-gray-400 hover:text-white transition-all hover:scale-110 active:scale-95 p-2">
                        <SkipForward size={24} className="fill-current" />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default MiniPlayer;
