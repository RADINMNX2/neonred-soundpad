
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Music, X, CornerDownLeft } from 'lucide-react';
import { SoundEffect } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sounds: SoundEffect[];
  onSelect: (soundId: string) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, sounds, onSelect }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter sounds
  const filteredSounds = useMemo(() => sounds.filter(s => 
    s.name.toLowerCase().includes(query.toLowerCase())
  ), [sounds, query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard Navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredSounds.length === 0) return;
      setSelectedIndex(prev => Math.min(prev + 1, filteredSounds.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSounds[selectedIndex]) {
        onSelect(filteredSounds[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filteredSounds, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
        const activeItem = listRef.current.children[selectedIndex] as HTMLElement;
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Modal Window */}
      <div className="relative w-full max-w-2xl bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-xl animate-slide-up overflow-hidden flex flex-col max-h-[60vh]">
        
        {/* Search Input Header */}
        <div className="relative flex items-center p-4 border-b border-white/5 bg-zinc-800/20">
            <Search className="text-gray-400 ml-2" size={24} />
            <input 
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="flex-1 bg-transparent border-none outline-none text-xl text-white px-4 placeholder-gray-500 h-12"
            />
            <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex px-2 py-1 bg-white/5 rounded text-xs text-gray-500 font-mono border border-white/5">ESC</span>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-700">
            {filteredSounds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Music size={48} className="opacity-20 mb-4" />
                    <p>No sounds found for "{query}"</p>
                </div>
            ) : (
                filteredSounds.map((sound, index) => (
                    <div
                        key={sound.id}
                        onClick={() => { onSelect(sound.id); onClose(); }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`
                            flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 group
                            ${index === selectedIndex ? 'bg-red-600 text-white' : 'hover:bg-white/5 text-gray-300'}
                        `}
                    >
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-lg bg-black/40 bg-cover bg-center shrink-0 border ${index === selectedIndex ? 'border-white/20' : 'border-white/5'}`}
                             style={sound.image ? { backgroundImage: `url(${sound.image})` } : {}}>
                            {!sound.image && <div className="flex items-center justify-center h-full"><Music size={20} className="opacity-50"/></div>}
                        </div>

                        {/* Text Info */}
                        <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-lg truncate ${index === selectedIndex ? 'text-white' : 'text-gray-200'}`}>
                                {sound.name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs opacity-70">
                                {sound.shortcut && (
                                    <span className={`px-1.5 py-0.5 rounded ${index === selectedIndex ? 'bg-black/20' : 'bg-white/10'}`}>
                                        {sound.shortcut}
                                    </span>
                                )}
                                <span>{(sound.volume * 100).toFixed(0)}% Vol</span>
                            </div>
                        </div>

                        {/* Enter Icon hint */}
                        {index === selectedIndex && (
                            <CornerDownLeft size={20} className="mr-2 opacity-50" />
                        )}
                    </div>
                ))
            )}
        </div>
        
        {/* Footer Info */}
        <div className="p-2 bg-black/20 border-t border-white/5 flex justify-between px-4 text-[10px] text-gray-500 font-mono uppercase tracking-wider">
            <span>{filteredSounds.length} Results</span>
            <span>Use Arrows to Navigate</span>
        </div>

      </div>
    </div>
  );
};

export default SearchModal;
