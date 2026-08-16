import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Pencil } from 'lucide-react';
import { SoundEffect } from '../types';

interface RenameModalProps {
  sound: SoundEffect | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, newName: string) => void;
}

const RenameModal: React.FC<RenameModalProps> = ({ sound, isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const focusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && sound) {
      setName(sound.name);
      // Focus input after animation
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = window.setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [isOpen, sound]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sound && name.trim()) {
      onSave(sound.id, name.trim());
      onClose();
    }
  };

  if (!isOpen || !sound) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-zinc-900 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-red-900/40 animate-slide-up overflow-hidden">
        {/* Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-pink-600 to-red-600"></div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                <Pencil size={20} />
             </div>
             <h2 className="text-xl font-bold text-white">Rename Sound</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">Sound Name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:bg-white/5 transition-all text-lg"
              placeholder="Enter sound name..."
              maxLength={30}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-red-900/30 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameModal;