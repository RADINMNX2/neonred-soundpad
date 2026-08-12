
import React from 'react';
import { Palette, Check, Moon, Sun } from 'lucide-react';
import { Theme } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  onSelect: (theme: Theme) => void;
}

const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ isOpen, onClose, currentTheme, onSelect }) => {
  const { isRTL } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in" 
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl animate-slide-up overflow-hidden">
        
        {/* Header */}
        <div className="p-8 pb-4 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-xl mb-4">
                <Palette size={32} className="text-primary" />
            </div>
            <h2 className="text-3xl font-black text-text-main mb-2">Select Theme</h2>
            <p className="text-text-muted font-persian">ظاهر برنامه را انتخاب کنید</p>
        </div>

        {/* Themes Grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Neon Red (Default) */}
            <button 
                onClick={() => { onSelect('default'); onClose(); }}
                className={`group relative h-48 rounded-3xl p-6 transition-all duration-300 hover:scale-105 border overflow-hidden flex flex-col justify-end
                ${currentTheme === 'default' ? 'ring-4 ring-red-500 border-red-500' : 'border-white/10 hover:border-red-500/50'}
                `}
                style={{ background: '#050505' }}
            >
                {/* Preview Elements */}
                <div className="absolute inset-0 bg-gradient-to-tr from-red-900/20 to-transparent"></div>
                <div className="absolute top-4 right-4 p-2 bg-zinc-900 rounded-lg border border-red-500/30">
                    <Moon size={20} className="text-red-500" />
                </div>
                
                <div className="relative z-10 text-left">
                    <span className="block text-2xl font-black text-white group-hover:text-red-500 transition-colors">Neon Red</span>
                    <span className="text-xs text-gray-500 uppercase tracking-widest">Dark Mode</span>
                </div>

                {currentTheme === 'default' && (
                    <div className="absolute bottom-4 right-4 bg-red-500 rounded-full p-1.5 shadow-lg shadow-red-500/50">
                        <Check size={16} className="text-white" />
                    </div>
                )}
            </button>

            {/* Frost (White) */}
            <button 
                onClick={() => { onSelect('frost'); onClose(); }}
                className={`group relative h-48 rounded-3xl p-6 transition-all duration-300 hover:scale-105 border overflow-hidden flex flex-col justify-end
                ${currentTheme === 'frost' ? 'ring-4 ring-sky-500 border-sky-500' : 'border-gray-200 hover:border-sky-500/50'}
                `}
                style={{ background: '#f0f4f8' }}
            >
                {/* Preview Elements */}
                <div className="absolute inset-0 bg-gradient-to-tr from-sky-200/50 to-transparent"></div>
                <div className="absolute top-4 right-4 p-2 bg-white rounded-lg border border-sky-200 shadow-sm">
                    <Sun size={20} className="text-sky-500" />
                </div>
                
                <div className="relative z-10 text-left">
                    <span className="block text-2xl font-black text-slate-800 group-hover:text-sky-500 transition-colors">Frost</span>
                    <span className="text-xs text-slate-500 uppercase tracking-widest">Light Mode</span>
                </div>

                {currentTheme === 'frost' && (
                    <div className="absolute bottom-4 right-4 bg-sky-500 rounded-full p-1.5 shadow-lg shadow-sky-500/50">
                        <Check size={16} className="text-white" />
                    </div>
                )}
            </button>

        </div>

      </div>
    </div>
  );
};

export default ThemeSelectorModal;
