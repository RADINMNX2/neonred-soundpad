
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Copy, Music, Disc, User, Check, Mic2 } from 'lucide-react';
import { MusicTrack } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface MusicDetailsModalProps {
  track: MusicTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, newTitle: string) => void;
}

const MusicDetailsModal: React.FC<MusicDetailsModalProps> = ({ track, isOpen, onClose, onSave }) => {
  const { t } = useLanguage();
  const [editedTitle, setEditedTitle] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (track) {
      setEditedTitle(track.title);
    }
  }, [track]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = () => {
    if (track && editedTitle.trim()) {
      onSave(track.id, editedTitle.trim());
      onClose();
    }
  };

  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={onClose}></div>

      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl shadow-pink-900/30 overflow-hidden animate-slide-up flex flex-col">
        
        {/* Header / Art Section */}
        <div className="relative h-64 w-full bg-zinc-900 overflow-hidden group">
            {/* Blurry Background */}
            <div 
                className="absolute inset-0 bg-cover bg-center blur-xl opacity-60 scale-110"
                style={track.cover ? { backgroundImage: `url(${track.cover})` } : {}}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>

            {/* Main Art */}
            <div className="absolute inset-0 flex items-center justify-center pt-6">
                <div className="relative w-40 h-40 rounded-2xl shadow-2xl border-4 border-white/10 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                    {track.cover ? (
                        <img src={track.cover} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                            <Music size={48} className="text-zinc-600" />
                        </div>
                    )}
                </div>
            </div>

            {/* Close Button */}
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-colors border border-white/10 z-20">
                <X size={20} />
            </button>
        </div>

        {/* Info Section */}
        <div className="p-8 relative -mt-6 bg-zinc-950 rounded-t-[2rem] z-10 border-t border-white/5 space-y-6">
            
            {/* Title (Editable) */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-pink-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Music size={12} /> Track Title
                </label>
                <div className="relative group">
                    <input 
                        type="text" 
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="w-full bg-transparent text-2xl font-black text-white border-b border-white/10 focus:border-pink-500 outline-none pb-2 transition-colors placeholder-zinc-700"
                    />
                    <div className="absolute right-0 bottom-2 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-xs">
                        Click to Edit
                    </div>
                </div>
            </div>

            {/* Artist & Album */}
            <div className="grid grid-cols-1 gap-4">
                
                {/* Artist Row */}
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                            <User size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Artist</span>
                            <span className="text-white font-medium truncate">{track.artist}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => handleCopy(track.artist, 'artist')}
                        className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors relative"
                        title="Copy Artist"
                    >
                        {copiedField === 'artist' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                </div>

                {/* Album Row */}
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                            <Disc size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Album</span>
                            <span className="text-white font-medium truncate">{track.album || 'Unknown Album'}</span>
                        </div>
                    </div>
                     <button 
                        onClick={() => handleCopy(track.album || '', 'album')}
                        disabled={!track.album}
                        className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors relative disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Copy Album"
                    >
                        {copiedField === 'album' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
                <button 
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-bold text-sm transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-pink-900/20 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Save size={18} />
                    Save Changes
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default MusicDetailsModal;
