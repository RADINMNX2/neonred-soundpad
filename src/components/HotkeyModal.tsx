
import React, { useState, useEffect } from 'react';
import { X, Check, Keyboard, AlertCircle } from 'lucide-react';
import { SoundEffect } from '../types';
import { mapKeyToElectronAccelerator } from '../utils/audioHelpers';

interface HotkeyModalProps {
  sound: SoundEffect | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, hotkey: string | undefined) => void;
}

const HotkeyModal: React.FC<HotkeyModalProps> = ({ sound, isOpen, onClose, onSave }) => {
  const [currentHotkey, setCurrentHotkey] = useState<string>('Press any key...');
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (isOpen && sound) {
      setCurrentHotkey(sound.shortcut || 'Press any key...');
      setIsValid(!!sound.shortcut);
    }
  }, [isOpen, sound]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore repeated keydown events (holding key)
      if (e.repeat) return;

      // Clear functionality
      if (e.key === 'Backspace' || e.key === 'Delete') {
          setCurrentHotkey('None');
          setIsValid(true);
          return;
      }
      
      // Allow closing via Escape if purely pressing Escape with no modifiers,
      // BUT if we want to allow binding Escape, we should check context.
      // Usually Escape cancels the modal.
      if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
          return; 
      }

      const modifiers: string[] = [];
      if (e.ctrlKey) modifiers.push('CommandOrControl');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.altKey) modifiers.push('Alt');
      if (e.metaKey) modifiers.push('CommandOrControl'); // Treat Meta as Ctrl/Cmd

      // Map the main key
      const key = mapKeyToElectronAccelerator(e);
      
      // Logic:
      // 1. If we have modifiers but no main key yet, show modifiers + ...
      // 2. If we have a main key, show full combo.
      // 3. If we have just a main key (no modifiers), it's also valid for Global Shortcuts (e.g. F13, MediaNext, or just 'K').

      if (!key) {
        // Only modifiers pressed so far
        if (modifiers.length > 0) {
            setCurrentHotkey(modifiers.join('+') + ' + ...');
            setIsValid(false);
        }
        return;
      }

      // Check for duplicate modifiers (e.g. pressing CtrlLeft when Control is already in array logic)
      // The array construction above handles uniqueness per event state.
      
      const finalCombo = [...new Set([...modifiers, key])].join('+');
      
      setCurrentHotkey(finalCombo);
      setIsValid(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSave = () => {
    if (sound) {
      // If user selected "None" or didn't change default text, save as undefined
      const hotkeyToSave = (currentHotkey === 'None' || currentHotkey === 'Press any key...' || !isValid) 
        ? undefined 
        : currentHotkey;
        
      onSave(sound.id, hotkeyToSave);
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
                <Keyboard size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Global Hotkey</h2>
                <p className="text-xs text-gray-500">Works even when app is minimized</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center justify-center py-8 bg-black/40 rounded-xl border-2 border-dashed border-white/10 relative group">
           {/* Visual Glow */}
           <div className={`absolute inset-0 bg-red-500/5 transition-opacity ${isValid ? 'opacity-100' : 'opacity-0'}`}></div>

           <span className={`text-2xl font-mono font-bold transition-all text-center px-4 ${isValid ? 'text-red-500' : 'text-gray-500'}`}>
              {currentHotkey}
           </span>
           
           <p className="mt-4 text-xs text-gray-500 flex items-center gap-1">
             <AlertCircle size={12} />
             <span>Press <b>Backspace</b> to clear</span>
           </p>
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
            type="button"
            onClick={handleSave}
            disabled={!isValid && currentHotkey !== 'None'}
            className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-red-900/30 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={16} />
            Set Hotkey
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotkeyModal;
