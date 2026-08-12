
import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Scissors, Play, Pause, RotateCcw } from 'lucide-react';
import { SoundEffect, ExtendedAudioElement } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TrimModalProps {
  sound: SoundEffect | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, start: number, end: number) => void;
  monitorDeviceId: string; // Add monitor device ID prop
}

const TrimModal: React.FC<TrimModalProps> = ({ sound, isOpen, onClose, onSave, monitorDeviceId }) => {
  const { t, isRTL } = useLanguage();
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const audioRef = useRef<ExtendedAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    if (isOpen && sound) {
      setStart(sound.trimStart || 0);
      setEnd(sound.trimEnd || 0);
      setDuration(0);
      setCurrentTime(sound.trimStart || 0);

      // Create temp audio for preview
      const audio = new Audio(sound.url) as ExtendedAudioElement;
      audioRef.current = audio;
      
      // Route to Monitor Device (No Injection)
      if (monitorDeviceId && typeof audio.setSinkId === 'function') {
        audio.setSinkId(monitorDeviceId).catch(err => console.warn("Failed to set sinkId in TrimModal", err));
      }
      
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        if (!sound.trimEnd || sound.trimEnd > audio.duration) {
          setEnd(audio.duration);
        } else {
            setEnd(sound.trimEnd);
        }
      };

      audio.onended = () => {
        setIsPlaying(false);
        // Reset to start
        audio.currentTime = start; 
      };

      return () => {
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [isOpen, sound, monitorDeviceId]); // Re-run if sound or monitor changes

  // Update loop/stop logic dynamically when start/end changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Ensure strict boundary enforcement
    audio.ontimeupdate = () => {
         setCurrentTime(audio.currentTime);
         
         // If we go past the end, loop back to start (Standard Trim Behavior)
         // or Stop (if strictly requested "play from there to there"). 
         // Looping is usually better for Previewing a cut.
         if (audio.currentTime >= end) {
             audio.currentTime = start;
             // Optional: Uncomment next line to STOP instead of LOOP
             // audio.pause(); setIsPlaying(false);
         }
    };

    // If current time is outside bounds while dragging, reset it
    if (currentTime < start || currentTime > end) {
        audio.currentTime = start;
        setCurrentTime(start);
    }
  }, [start, end]);

  const togglePreview = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = start;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSave = () => {
    if (sound) {
      // Pause before saving/closing
      if (audioRef.current) audioRef.current.pause();
      onSave(sound.id, start, end);
      onClose();
    }
  };

  const handleClose = () => {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      onClose();
  }

  const handleReset = () => {
      setStart(0);
      setEnd(duration);
      if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const formatTime = (time: number) => {
      const m = Math.floor(time / 60);
      const s = Math.floor(time % 60);
      const ms = Math.floor((time % 1) * 10);
      return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  if (!isOpen || !sound) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={handleClose}></div>
      
      <div className="relative bg-zinc-900 border border-pink-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl shadow-pink-900/40 animate-slide-up overflow-hidden">
        {/* Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-600 via-red-600 to-pink-600"></div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500">
                <Scissors size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white font-persian">{t('trimTitle')}</h2>
                <p className="text-xs text-gray-500 font-persian">{t('trimDesc')}</p>
             </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Visual Timeline */}
        <div className="bg-black/40 rounded-xl p-6 border border-white/5 mb-6 relative select-none">
            <div className="flex justify-between text-xs text-gray-500 mb-2 font-mono">
                <span>{formatTime(start)}</span>
                <span className={`transition-colors ${isPlaying ? 'text-green-500' : ''}`}>{formatTime(currentTime)}</span>
                <span>{formatTime(end)}</span>
            </div>

            <div className="relative h-12 w-full mt-2">
                {/* Background Track */}
                <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    {/* Active Range */}
                    <div 
                        className="absolute top-0 h-full bg-pink-600/50"
                        style={{
                            left: `${duration > 0 ? (start / duration) * 100 : 0}%`,
                            right: `${duration > 0 ? 100 - (end / duration) * 100 : 0}%`
                        }}
                    ></div>
                </div>

                {/* Range Inputs (Overlaid) */}
                <input 
                    type="range"
                    min="0"
                    max={duration}
                    step="0.01"
                    value={start}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val < end - 0.1) setStart(val);
                    }}
                    className="absolute top-1/2 -translate-y-1/2 w-full h-2 appearance-none bg-transparent pointer-events-none z-20 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:cursor-col-resize"
                />
                 <input 
                    type="range"
                    min="0"
                    max={duration}
                    step="0.01"
                    value={end}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val > start + 0.1) setEnd(val);
                    }}
                    className="absolute top-1/2 -translate-y-1/2 w-full h-2 appearance-none bg-transparent pointer-events-none z-20
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:cursor-col-resize"
                />

                {/* Playhead */}
                <div 
                    className="absolute top-0 h-full w-0.5 bg-white z-10 pointer-events-none transition-all duration-75"
                    style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                ></div>
            </div>
            
            <div className="flex justify-center mt-4 gap-4">
                 <button 
                    onClick={togglePreview}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-xs font-bold transition-all"
                 >
                     {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                     {isPlaying ? 'Pause' : t('preview')}
                 </button>
                 <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white text-xs font-bold transition-all"
                 >
                     <RotateCcw size={14} />
                     Reset
                 </button>
            </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button 
            type="button" 
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium font-persian"
          >
            {t('cancel')}
          </button>
          <button 
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-all font-persian"
          >
            <Check size={16} />
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrimModal;
