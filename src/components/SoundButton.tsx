
import React, { memo } from 'react';
import { Play, Pause, Check, MoreVertical, Music } from 'lucide-react';
import { SoundEffect } from '../types';

interface SoundButtonProps {
  sound: SoundEffect;
  isPlaying: boolean;
  isSelectionMode: boolean;
  isSelected: boolean;
  isHighlighted?: boolean; // New prop for search highlight
  onPlay: (id: string) => void;
  onStop: (id: string) => void;
  onOpenDetails: (sound: SoundEffect) => void;
  onToggleSelect: (id: string) => void;
  innerRef?: React.Ref<HTMLDivElement>; // To allow scrolling to this element
}

const SoundButton: React.FC<SoundButtonProps> = memo(({ 
  sound, 
  isPlaying, 
  isSelectionMode,
  isSelected,
  isHighlighted,
  onPlay, 
  onStop,
  onOpenDetails,
  onToggleSelect,
  innerRef
}) => {
  const handleInteraction = (e: React.MouseEvent) => {
    // Right click
    if (e.type === 'contextmenu') {
      e.preventDefault();
      if (isSelectionMode) {
        onToggleSelect(sound.id);
      } else {
        onOpenDetails(sound);
      }
      return;
    }

    // Left Click
    if (isSelectionMode) {
      onToggleSelect(sound.id);
    } else {
      // Logic: Click card to Play/Stop. Click "More" button for details.
      isPlaying ? onStop(sound.id) : onPlay(sound.id);
    }
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDetails(sound);
  };

  return (
    <div 
      ref={innerRef}
      onClick={handleInteraction}
      onContextMenu={handleInteraction}
      className={`
      relative group h-36 rounded-3xl overflow-hidden cursor-pointer transition-all duration-200 select-none
      border flex flex-col justify-between
      ${isSelected 
        ? 'bg-red-900/40 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
        : isPlaying 
            ? 'bg-zinc-900 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
            : 'bg-zinc-900/40 border-white/5 hover:border-red-500/50 hover:bg-zinc-800/60'
      }
      ${isHighlighted ? 'ring-4 ring-white shadow-[0_0_50px_rgba(255,255,255,0.5)] z-10' : ''}
      ${isSelectionMode && !isSelected ? 'opacity-60 grayscale' : 'opacity-100'}
      `}
      style={{
        contentVisibility: 'auto',
        contain: 'layout paint style', 
        willChange: 'transform, box-shadow'
      }}
    >
      {/* --- Background Image & Gradient --- */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {sound.image ? (
          <div 
            className={`absolute inset-0 bg-cover bg-center transition-all duration-700 
              ${isPlaying 
                ? 'scale-110 opacity-60 blur-0'  // Playing: Zoomed, Clear
                : 'scale-100 opacity-30 blur-sm group-hover:scale-110 group-hover:opacity-40 group-hover:blur-0' // Idle: Blurred -> Hover: Clear
              }`}
            style={{ backgroundImage: `url(${sound.image})` }}
          ></div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
             <Music size={64} />
          </div>
        )}
        {/* Modern Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
        {isPlaying && <div className="absolute inset-0 bg-red-500/5 mix-blend-overlay animate-pulse-slow"></div>}
      </div>

      {/* --- Selection Indicator --- */}
      {isSelectionMode && (
         <div className={`absolute top-3 left-3 z-30 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-red-500 border-red-500' : 'bg-black/40 border-gray-400'}`}>
             {isSelected && <Check size={14} className="text-white" />}
         </div>
      )}

      {/* --- Top Row: Status / Menu --- */}
      <div className="relative z-20 flex justify-between items-start p-4">
          {/* Status Indicator (Equalizer) */}
          <div className="flex gap-1 h-4 items-end">
            {isPlaying ? (
              <>
                <div className="w-1 bg-red-500 rounded-full animate-[wave_1s_ease-in-out_infinite]"></div>
                <div className="w-1 bg-red-500 rounded-full animate-[wave_1.2s_ease-in-out_infinite_0.1s]"></div>
                <div className="w-1 bg-red-500 rounded-full animate-[wave_0.8s_ease-in-out_infinite_0.2s]"></div>
              </>
            ) : sound.isFavorite ? (
               <div className="w-2 h-2 bg-yellow-500 rounded-full shadow-[0_0_10px_orange]"></div>
            ) : null}
          </div>

          {/* More Options Button */}
          {!isSelectionMode && (
            <button 
              onClick={handleDetailsClick}
              className="p-1.5 rounded-full bg-black/20 hover:bg-white/20 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm"
            >
              <MoreVertical size={16} />
            </button>
          )}
      </div>

      {/* --- Bottom Row: Info & Play --- */}
      <div className="relative z-20 p-4 pt-0 flex items-end justify-between gap-3">
        <div className="flex-1 min-w-0">
           <h3 className={`font-bold text-sm leading-tight truncate transition-colors font-persian ${isPlaying ? 'text-red-400' : 'text-gray-100 group-hover:text-white'}`}>
             {sound.name}
           </h3>
           <div className="flex items-center gap-2 mt-1">
             {sound.shortcut && (
               <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                 {sound.shortcut}
               </span>
             )}
           </div>
        </div>

        {/* Floating Play Button */}
        <div className={`
           w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300
           ${isPlaying 
             ? 'bg-red-600 text-white scale-100' 
             : 'bg-white text-black scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100'
           }
        `}>
           {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-0.5" />}
        </div>
      </div>
      
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.sound.id === nextProps.sound.id &&
    prevProps.sound.name === nextProps.sound.name &&
    prevProps.sound.image === nextProps.sound.image &&
    prevProps.sound.isFavorite === nextProps.sound.isFavorite &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isSelectionMode === nextProps.isSelectionMode &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHighlighted === nextProps.isHighlighted
  );
});

export default SoundButton;
