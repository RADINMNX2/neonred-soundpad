import React, { memo } from 'react';
import { GripVertical, MoreVertical, Trash2, Music, Check, Play } from 'lucide-react';
import { MusicTrack } from '../types';
import { useLanguage } from '../context/LanguageContext';

export const EqualizerBars: React.FC<{ paused?: boolean }> = ({ paused }) => (
  <div className={`h-3 flex items-end gap-[2px] ${paused ? 'opacity-40' : ''}`}>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className={`w-[3px] h-full rounded-full bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.8)] eq-bar ${paused ? 'eq-bar-paused' : ''}`}
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </div>
);

interface PlaylistRowProps {
  track: MusicTrack;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  reorderEnabled: boolean;
  moreOpen: boolean;
  dropPos: 'top' | 'bottom' | null;
  staggerDelay: number;
  formatTime: (s: number) => string;
  onPlay: (track: MusicTrack) => void;
  onDelete: (id: string) => void;
  onDetails: (track: MusicTrack) => void;
  onMoreToggle: (id: string | null) => void;
  onToggleSelect: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragOverRow: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDropRow: (index: number) => void;
  onDragEnd: () => void;
}

const PlaylistRow: React.FC<PlaylistRowProps> = memo(function PlaylistRow({
  track, index, isCurrent, isPlaying, isSelected, selectionMode, reorderEnabled,
  moreOpen, dropPos, staggerDelay, formatTime,
  onPlay, onDelete, onDetails, onMoreToggle, onToggleSelect,
  onDragStart, onDragOverRow, onDropRow, onDragEnd
}) {
  const { t } = useLanguage();
  const dropCls = dropPos === 'top' ? 'drop-indicator-top' : dropPos === 'bottom' ? 'drop-indicator-bottom' : '';

  return (
    <div
      data-track-id={track.id}
      draggable={reorderEnabled}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOverRow(e, index)}
      onDrop={(e) => { e.preventDefault(); onDropRow(index); }}
      onDragEnd={onDragEnd}
      onClick={() => (selectionMode ? onToggleSelect(track.id) : onPlay(track))}
      onContextMenu={(e) => { e.preventDefault(); onDetails(track); }}
      style={{ animationDelay: `${staggerDelay}ms` }}
      className={`track-enter group relative flex items-center gap-3 h-16 px-3 rounded-2xl cursor-pointer border transition-[transform,opacity] duration-200 active:scale-[0.99]
        ${dropCls}
        ${isSelected ? 'border-red-500/50 bg-red-900/20'
          : isCurrent ? 'border-pink-500/30'
          : 'border-transparent'}`}
    >
      <div className="absolute inset-0 rounded-2xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none" />
      {isCurrent && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-600/10 to-transparent pointer-events-none" />
      )}
      {isCurrent && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none animate-glow-breathe bg-[radial-gradient(circle_at_30%_50%,rgba(236,72,153,0.12),transparent_70%)]" />
      )}

      {reorderEnabled && (
        <div className="w-3 shrink-0 flex items-center justify-center text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab">
          <GripVertical size={14} />
        </div>
      )}

      <div className="w-6 text-center text-xs font-mono text-gray-500 flex justify-center items-center z-10 shrink-0">
        {selectionMode ? (
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-transform ${isSelected ? 'bg-red-500 border-red-500' : 'border-zinc-600 bg-black/40'}`}>
            {isSelected && <Check size={12} className="text-white" />}
          </div>
        ) : isCurrent ? (
          <EqualizerBars paused={!isPlaying} />
        ) : (
          <span className="group-hover:text-white transition-colors">{index + 1}</span>
        )}
      </div>

      <div className={`relative w-12 h-12 rounded-xl overflow-hidden shadow-lg border border-white/10 shrink-0 z-10 transition-all duration-300 ${isCurrent && isPlaying ? 'ring-2 ring-pink-500/60 shadow-[0_0_18px_rgba(236,72,153,0.35)]' : ''}`}>
        {track.cover ? (
          <img src={track.cover} alt="Art" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <Music size={18} className="text-zinc-600" />
          </div>
        )}
        {isCurrent && isPlaying && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <EqualizerBars />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 z-10">
        <h4 className={`font-bold truncate text-sm mb-0.5 ${isCurrent ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-400' : 'text-gray-200 group-hover:text-white transition-colors'}`}>
          {track.title}
        </h4>
        <p className="text-xs text-gray-500 truncate font-medium group-hover:text-gray-400 transition-colors">
          {track.artist}
          {track.album ? ` · ${track.album}` : ''}
        </p>
      </div>

      <span className="text-xs font-mono text-gray-500 shrink-0 hidden sm:inline" dir="ltr">{formatTime(track.duration)}</span>

      <div className="flex items-center gap-1 pr-1 z-10 shrink-0">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); onMoreToggle(moreOpen ? null : track.id); }}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 translate-x-2 rtl:-translate-x-2 group-hover:translate-x-0 group-hover:rtl:translate-x-0"
            title="More"
          >
            <MoreVertical size={16} />
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); onMoreToggle(null); }} />
              <div className="absolute z-40 end-0 bottom-10 w-40 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/80 animate-slide-up overflow-hidden">
                <button onClick={(e) => { e.stopPropagation(); onMoreToggle(null); onPlay(track); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-gray-200 hover:bg-white/10 transition-colors">
                  <Play size={13} className="text-pink-500" /> {t('playNow')}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onMoreToggle(null); onDetails(track); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-gray-200 hover:bg-white/10 transition-colors">
                  <Music size={13} className="text-pink-500" /> {t('trackDetails')}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onMoreToggle(null); onDelete(track.id); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 size={13} /> {t('removeTrack')}
                </button>
              </div>
            </>
          )}
        </div>

        {!selectionMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(track.id); }}
            className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 translate-x-2 rtl:-translate-x-2 group-hover:translate-x-0 group-hover:rtl:translate-x-0"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-3 h-[2px] rounded-full bg-gradient-to-r from-transparent via-pink-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
});

export default PlaylistRow;