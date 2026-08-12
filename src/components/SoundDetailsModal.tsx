
import React, { useState } from 'react';
import { X, Play, Pause, Volume2, Pencil, Keyboard, Trash2, Star, Zap, Scissors } from 'lucide-react';
import { SoundEffect } from '../types';
import { useLanguage } from '../context/LanguageContext';
import ConfirmationModal from './ConfirmationModal';
import TrimModal from './TrimModal';

interface SoundDetailsModalProps {
  sound: SoundEffect | null;
  isPlaying: boolean;
  isOpen: boolean;
  currentTime: number;
  duration: number;
  onClose: () => void;
  onPlay: (id: string) => void;
  onStop: (id: string) => void;
  onSeek: (id: string, time: number) => void;
  onDelete: (id: string) => void;
  onEdit: (sound: SoundEffect) => void;
  onHotkey: (sound: SoundEffect) => void;
  onToggleFavorite: (id: string) => void;
  onVolumeChange: (id: string, vol: number) => void;
  onTrimSave: (id: string, start: number, end: number) => void;
  monitorDeviceId: string; // Add monitor device ID prop
}

const SoundDetailsModal: React.FC<SoundDetailsModalProps> = ({
  sound,
  isPlaying,
  isOpen,
  currentTime,
  duration,
  onClose,
  onPlay,
  onStop,
  onSeek,
  onDelete,
  onEdit,
  onHotkey,
  onToggleFavorite,
  onVolumeChange,
  onTrimSave,
  monitorDeviceId
}) => {
  const { t, isRTL } = useLanguage();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isTrimModalOpen, setIsTrimModalOpen] = useState(false);

  if (!isOpen || !sound) return null;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleDelete = () => {
      onDelete(sound.id);
      setIsDeleteConfirmOpen(false);
      onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity animate-fade-in" onClick={onClose}></div>
        
        <div className="relative bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl shadow-red-900/50 animate-slide-up overflow-hidden group">
          
          {/* Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-600/20 blur-[80px] pointer-events-none"></div>

          {/* --- Header Image Section --- */}
          <div className="relative h-48 w-full bg-zinc-900/50 flex items-center justify-center overflow-hidden">
              {/* Background Image Blurred */}
              {sound.image ? (
                  <div 
                    className="absolute inset-0 bg-cover bg-center blur-md opacity-50 scale-110"
                    style={{ backgroundImage: `url(${sound.image})` }}
                  ></div>
              ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black opacity-50"></div>
              )}
              
              {/* Close Button */}
              <button 
                  onClick={onClose} 
                  className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 rounded-full bg-black/20 hover:bg-black/60 text-white backdrop-blur-md transition-all z-20`}
              >
                  <X size={20} />
              </button>

              {/* Central Avatar */}
              <div className={`relative z-10 w-32 h-32 rounded-2xl shadow-2xl overflow-hidden border-4 border-zinc-900/80 ${isPlaying ? 'animate-pulse-slow shadow-red-500/50' : ''}`}>
                  {sound.image ? (
                      <img src={sound.image} alt={sound.name} className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                          <Zap size={40} className="text-zinc-600" />
                      </div>
                  )}
                  {/* Play Overlay on Avatar */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => isPlaying ? onStop(sound.id) : onPlay(sound.id)}>
                      {isPlaying ? <Pause size={32} className="fill-white text-white" /> : <Play size={32} className="fill-white text-white" />}
                  </div>
              </div>
          </div>

          {/* --- Content Section --- */}
          <div className="p-6 relative z-10">
              
              {/* Title & Star */}
              <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                      <h2 className="text-2xl font-bold text-white leading-tight font-persian truncate">{sound.name}</h2>
                      <div className="flex items-center gap-2 mt-2">
                          {sound.shortcut ? (
                              <span className="px-2 py-1 bg-white/10 rounded-md text-xs font-mono text-red-400 border border-red-500/20 flex items-center gap-1">
                                  <Keyboard size={10} />
                                  {sound.shortcut}
                              </span>
                          ) : (
                              <span className="text-xs text-gray-500 font-persian">{t('setHotkey')}...</span>
                          )}
                          {(sound.trimStart || sound.trimEnd) && (
                              <span className="px-2 py-1 bg-pink-500/10 rounded-md text-xs font-mono text-pink-400 border border-pink-500/20 flex items-center gap-1">
                                  <Scissors size={10} />
                                  Trimmed
                              </span>
                          )}
                      </div>
                  </div>
                  <button 
                    onClick={() => onToggleFavorite(sound.id)}
                    className={`p-3 rounded-xl border transition-all shrink-0 ml-4 ${sound.isFavorite ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' : 'bg-zinc-900 border-white/5 text-gray-600 hover:text-white'}`}
                  >
                      <Star size={20} className={sound.isFavorite ? 'fill-current' : ''} />
                  </button>
              </div>

              {/* --- SEEK BAR (TIME CONTROL) --- */}
              <div className="mb-6 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                {/* Time Labels (RTL aware layout, but numbers are LTR) */}
                <div className="flex justify-between text-xs text-gray-400 font-mono mb-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
                
                {/* Seek Slider Container - Forced LTR for correct timeline direction */}
                <div className="relative h-2 bg-zinc-800 rounded-full w-full" dir="ltr">
                    {/* Progress Fill */}
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-pink-600 rounded-full pointer-events-none z-10"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                    
                    {/* Range Input */}
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => onSeek(sound.id, parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      disabled={!isPlaying && currentTime === 0}
                    />
                    
                    {/* Thumb Indicator (Visual only) */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] pointer-events-none z-10 transition-transform"
                      style={{ left: `${progressPercent}%` }}
                    ></div>
                </div>
              </div>

              {/* Volume Control */}
              <div className="bg-zinc-900/50 rounded-2xl p-4 border border-white/5 mb-6">
                  <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-gray-400">
                          <Volume2 size={16} />
                          <span className="text-xs font-bold tracking-wider">VOLUME</span>
                      </div>
                      <span className="text-xs font-mono text-red-400">{(sound.volume * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={sound.volume}
                    onChange={(e) => onVolumeChange(sound.id, parseFloat(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
              </div>

              {/* Action Grid */}
              <div className="grid grid-cols-4 gap-2">
                  <button 
                      onClick={() => onEdit(sound)}
                      className="flex flex-col items-center justify-center gap-1 p-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/5 hover:border-white/20 transition-all group/btn"
                  >
                      <Pencil size={18} className="text-gray-400 group-hover/btn:text-white" />
                      <span className="text-[9px] text-gray-500 font-medium font-persian">{t('renameTitle')}</span>
                  </button>

                  <button 
                      onClick={() => onHotkey(sound)}
                      className="flex flex-col items-center justify-center gap-1 p-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/5 hover:border-white/20 transition-all group/btn"
                  >
                      <Keyboard size={18} className="text-gray-400 group-hover/btn:text-white" />
                      <span className="text-[9px] text-gray-500 font-medium font-persian">{t('setHotkey')}</span>
                  </button>

                  <button 
                      onClick={() => setIsTrimModalOpen(true)}
                      className="flex flex-col items-center justify-center gap-1 p-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/5 hover:border-pink-500/50 transition-all group/btn"
                  >
                      <Scissors size={18} className="text-gray-400 group-hover/btn:text-pink-500" />
                      <span className="text-[9px] text-gray-500 font-medium font-persian group-hover/btn:text-pink-500">{t('trimTitle')}</span>
                  </button>

                  <button 
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="flex flex-col items-center justify-center gap-1 p-3 bg-red-950/20 hover:bg-red-900/40 rounded-xl border border-red-900/30 hover:border-red-500/50 transition-all group/btn"
                  >
                      <Trash2 size={18} className="text-red-500/70 group-hover/btn:text-red-500" />
                      <span className="text-[9px] text-red-500/70 font-medium">DELETE</span>
                  </button>
              </div>

          </div>

          {/* Bottom Progress/Deco */}
          <div className={`h-1 bg-gradient-to-r from-red-600 to-pink-600 transition-all duration-300 ${isPlaying ? 'w-full' : 'w-0'}`}></div>
        </div>
      </div>

      <ConfirmationModal 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t('confirmTitle')}
        description={t('confirmSingleBody')}
        confirmText={t('confirmDelete')}
        cancelText={t('cancel')}
      />

      <TrimModal 
        sound={sound}
        isOpen={isTrimModalOpen}
        onClose={() => setIsTrimModalOpen(false)}
        onSave={onTrimSave}
        monitorDeviceId={monitorDeviceId}
      />
    </>
  );
};

export default SoundDetailsModal;
