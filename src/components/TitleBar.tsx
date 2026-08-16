
import React from 'react';
import { Minus, Square, X, Grid, Settings, Activity, Download, Zap, Music } from 'lucide-react';
import { Page } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TitleBarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  showUpdateIcon?: boolean;
  isUpdateReady?: boolean;
  onUpdateClick?: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ currentPage, setPage, showUpdateIcon, isUpdateReady, onUpdateClick }) => {
  const { t } = useLanguage();

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimize();
  };

  const handleMaximize = () => {
    if (window.electronAPI) window.electronAPI.maximize();
  };

  const handleClose = () => {
    if (window.electronAPI) {
        window.electronAPI.close();
    }
  };

  return (
    <div 
      className="h-16 bg-black/90 backdrop-blur-xl border-b border-white/5 flex justify-between items-center select-none sticky top-0 z-[100] w-full px-6 shadow-2xl shadow-black/50"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      
      {/* --- LEFT: Spacer & Status --- */}
      <div className="w-1/3 h-full flex items-center gap-3">
         <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-zinc-900/50 rounded-full border border-white/5 border-l-emerald-500/50 opacity-60 hover:opacity-100 transition-all duration-300 hover:border-emerald-500/30">
           <Activity size={14} className="text-emerald-500 animate-pulse" />
           <span className="text-[10px] font-mono text-emerald-500/80 tracking-wider font-bold">SYSTEM ONLINE</span>
        </div>

        {/* Update Available Icon */}
        {showUpdateIcon && (
           <button 
             onClick={onUpdateClick}
             className={`flex items-center gap-2 px-3 py-1 rounded-full border animate-pulse cursor-pointer transition-colors
               ${isUpdateReady 
                 ? 'bg-emerald-900/40 border-emerald-500/50 hover:bg-emerald-900/60' 
                 : 'bg-green-900/20 border-green-500/50 hover:bg-green-900/40'
               }`}
             style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
             title={isUpdateReady ? "Restart to Install" : "Update Available"}
           >
              {isUpdateReady ? (
                 <Zap size={14} className="text-emerald-400 fill-emerald-400" />
              ) : (
                 <Download size={14} className="text-green-500" />
              )}
              <span className={`text-[10px] font-bold ${isUpdateReady ? 'text-emerald-400' : 'text-green-400'}`}>
                {isUpdateReady ? 'READY' : 'UPDATE'}
              </span>
           </button>
        )}
      </div>

      {/* --- CENTER: Navigation Tabs --- */}
      <div 
        className="flex items-center justify-center gap-3 bg-zinc-950/80 p-2 rounded-2xl border border-white/5 backdrop-blur-md shadow-2xl" 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => setPage(Page.PAD)}
          className={`
            relative px-6 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 overflow-hidden group
            ${currentPage === Page.PAD ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
          `}
        >
          {currentPage === Page.PAD && (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 rounded-xl shadow-inner tab-active"></div>
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Grid size={18} className={`transition-all duration-300 ${currentPage === Page.PAD ? "text-red-500 scale-110" : "group-hover:text-red-400 group-hover:rotate-12"}`} />
            <span className="text-sm font-bold tracking-wide">{t('soundPad')}</span>
          </span>
        </button>

        <button
          onClick={() => setPage(Page.MUSIC)}
          className={`
            relative px-6 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 overflow-hidden group
            ${currentPage === Page.MUSIC ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
          `}
        >
          {currentPage === Page.MUSIC && (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 rounded-xl shadow-inner tab-active"></div>
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Music size={18} className={`transition-all duration-300 ${currentPage === Page.MUSIC ? "text-pink-500 scale-110" : "group-hover:text-pink-400 group-hover:-rotate-12"}`} />
            <span className="text-sm font-bold tracking-wide">{t('musicPlayer')}</span>
          </span>
        </button>

        <button
          onClick={() => setPage(Page.SETTINGS)}
          className={`
            relative px-6 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 overflow-hidden group
            ${currentPage === Page.SETTINGS ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
          `}
        >
           {currentPage === Page.SETTINGS && (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 rounded-xl shadow-inner tab-active"></div>
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Settings size={18} className={`transition-all duration-300 ${currentPage === Page.SETTINGS ? "text-blue-500 rotate-180" : "group-hover:text-blue-400 group-hover:rotate-90"}`} />
            <span className="text-sm font-bold tracking-wide">{t('settings')}</span>
          </span>
        </button>
      </div>

      {/* --- RIGHT: Window Controls --- */}
      <div className="flex h-full items-center justify-end w-1/3">
        <div 
            className="flex items-center gap-3 pl-4"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
            {/* Minimize: Rotate Left & Yellow Glow */}
            <button 
              onClick={handleMinimize}
              className="group relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ease-out hover:bg-yellow-500/10 hover:scale-110 hover:-rotate-12 active:scale-90 active:rotate-0"
              title="Minimize"
            >
               <Minus size={18} className="text-gray-400 group-hover:text-yellow-400 transition-colors" />
            </button>

            {/* Maximize: Rotate Right & Green Glow */}
            <button 
              onClick={handleMaximize}
              className="group relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ease-out hover:bg-emerald-500/10 hover:scale-110 hover:rotate-12 active:scale-90 active:rotate-0"
              title="Maximize"
            >
               <Square size={16} className="text-gray-400 group-hover:text-emerald-400 transition-colors" />
            </button>

            {/* Close: Full Spin, Red Fill & Neon Shadow */}
            <button 
              onClick={handleClose}
              className="group relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-500 ease-cubic hover:bg-red-600 hover:rotate-90 hover:scale-110 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] active:scale-75 active:rotate-180"
              title="Close"
            >
               <X size={20} className="text-gray-400 group-hover:text-white transition-colors" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
