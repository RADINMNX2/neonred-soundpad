import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Grid, Settings, Activity, Download, Zap, Music } from 'lucide-react';
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
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => window.electronAPI?.onWindowStateChange(setIsMaximized) ?? undefined, []);

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

  const tabBase = "relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50";

  return (
    <div 
      className="h-16 bg-black/90 backdrop-blur-xl border-b border-white/10 flex justify-between items-center select-none sticky top-0 z-[100] w-full px-6 shadow-2xl shadow-black/50"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      
      {/* --- LEFT: Brand, Status & Update --- */}
      <div className="w-1/3 h-full flex items-center gap-3">
        {/* Brand Mark */}
        <div className="hidden sm:flex w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.4)]">
          <Zap size={16} className="text-white" />
        </div>

        {/* System Status Chip */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
          </span>
          <Activity size={12} className="text-emerald-300" />
          <span className="text-[10px] tracking-widest text-emerald-300/90 font-medium">SYSTEM ONLINE</span>
        </div>

        {/* Update Available Icon */}
        {showUpdateIcon && (
           <button 
             onClick={onUpdateClick}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border text-[10px] transition-colors cursor-pointer
               ${isUpdateReady 
                 ? 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10 animate-pulse hover:bg-emerald-500/15' 
                 : 'text-emerald-300/80 border-emerald-400/20 hover:bg-emerald-500/10'
               }`}
             style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
             title={isUpdateReady ? "Restart to Install" : "Update Available"}
           >
              {isUpdateReady ? (
                 <Zap size={12} className="text-emerald-400 fill-emerald-400" />
              ) : (
                 <Download size={12} className="text-emerald-300" />
              )}
              <span className="font-bold">
                {isUpdateReady ? 'READY' : 'UPDATE'}
              </span>
           </button>
        )}
      </div>

      {/* --- CENTER: Navigation Tabs --- */}
      <div 
        className="flex items-center justify-center gap-1 bg-zinc-950/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]" 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => setPage(Page.PAD)}
          className={`${tabBase} ${currentPage === Page.PAD ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {currentPage === Page.PAD && (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 rounded-xl shadow-inner shadow-[0_0_16px_rgba(239,68,68,0.25)] tab-active"></div>
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Grid size={18} className={`transition-transform duration-200 ${currentPage === Page.PAD ? "text-red-500 scale-110" : "group-hover:text-red-400 group-hover:rotate-12"}`} />
            <span className="text-sm font-bold tracking-wide">{t('soundPad')}</span>
          </span>
        </button>

        <button
          onClick={() => setPage(Page.MUSIC)}
          className={`${tabBase} ${currentPage === Page.MUSIC ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {currentPage === Page.MUSIC && (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 rounded-xl shadow-inner shadow-[0_0_16px_rgba(236,72,153,0.25)] tab-active"></div>
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Music size={18} className={`transition-transform duration-200 ${currentPage === Page.MUSIC ? "text-pink-500 scale-110" : "group-hover:text-pink-400 group-hover:-rotate-12"}`} />
            <span className="text-sm font-bold tracking-wide">{t('musicPlayer')}</span>
          </span>
        </button>

        <button
          onClick={() => setPage(Page.SETTINGS)}
          className={`${tabBase} ${currentPage === Page.SETTINGS ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
           {currentPage === Page.SETTINGS && (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 rounded-xl shadow-inner shadow-[0_0_16px_rgba(59,130,246,0.25)] tab-active"></div>
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Settings size={18} className={`transition-transform duration-200 ${currentPage === Page.SETTINGS ? "text-blue-500 rotate-180" : "group-hover:text-blue-400 group-hover:rotate-90"}`} />
            <span className="text-sm font-bold tracking-wide">{t('settings')}</span>
          </span>
        </button>
      </div>

      {/* --- RIGHT: Window Controls --- */}
      <div className="flex h-full items-center justify-end w-1/3">
        <div 
            className="flex items-center gap-1.5 pl-4"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
            {/* Minimize: Rotate Left & Yellow Glow */}
            <button 
              onClick={handleMinimize}
              className="group flex items-center justify-center w-10 h-10 rounded-xl text-zinc-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 hover:bg-yellow-500/10 hover:text-yellow-400 hover:-rotate-12 active:scale-90"
              title="Minimize"
            >
               <Minus size={16} className="transition-colors" />
            </button>

            {/* Maximize/Restore: Reflects Actual Window State */}
            <button 
              onClick={handleMaximize}
              className="group flex items-center justify-center w-10 h-10 rounded-xl text-zinc-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 hover:rotate-12 active:scale-90"
              title={isMaximized ? "Restore" : "Maximize"}
            >
               {isMaximized ? <Copy size={16} className="transition-colors" /> : <Square size={16} className="transition-colors" />}
            </button>

            {/* Close: Red Fill & Neon Shadow */}
            <button 
              onClick={handleClose}
              className="group flex items-center justify-center w-10 h-10 rounded-xl text-zinc-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 hover:bg-red-600 hover:text-white hover:rotate-90 hover:scale-110 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] active:scale-75"
              title="Close"
            >
               <X size={20} className="transition-colors" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;