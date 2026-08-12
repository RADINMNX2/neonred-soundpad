
import React from 'react';
import { Grid, Settings, Activity } from 'lucide-react';
import { Page } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage }) => {
  const { t } = useLanguage();

  const navItemClass = (page: Page) => `
    relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500 group cursor-pointer
    ${currentPage === page 
      ? 'text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
      : 'text-gray-500 hover:text-white hover:bg-white/5'
    }
  `;

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-6">
      
      {/* --- Main Glass Dock --- */}
      <div className="
        flex flex-col items-center gap-4 p-3
        bg-black/40 backdrop-blur-2xl 
        border border-white/10 
        rounded-3xl shadow-2xl shadow-black/80
        transition-all duration-300 hover:border-white/20 hover:bg-black/50
      ">
        
        {/* SoundPad Tab */}
        <button 
          onClick={() => setPage(Page.PAD)}
          className={navItemClass(Page.PAD)}
          title={t('soundPad')}
        >
          {/* Active Background Morph */}
          <div className={`absolute inset-0 bg-gradient-to-br from-red-600 to-pink-600 rounded-2xl transition-all duration-500 ${currentPage === Page.PAD ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}></div>
          
          {/* Icon */}
          <div className="relative z-10">
             <Grid 
               size={22} 
               className={`transition-all duration-300 ${currentPage === Page.PAD ? 'rotate-0' : 'group-hover:rotate-90'}`}
             />
          </div>
        </button>

        {/* Divider */}
        <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* Settings Tab */}
        <button 
          onClick={() => setPage(Page.SETTINGS)}
          className={navItemClass(Page.SETTINGS)}
          title={t('settings')}
        >
          {/* Active Background Morph */}
          <div className={`absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl transition-all duration-500 ${currentPage === Page.SETTINGS ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}></div>

          {/* Icon */}
          <div className="relative z-10">
            <Settings 
              size={22} 
              className={`transition-all duration-500 ${currentPage === Page.SETTINGS ? 'rotate-180' : 'group-hover:rotate-90'}`} 
            />
          </div>
        </button>

      </div>

      {/* --- Status Indicator (Separate Floating Pill) --- */}
      <div 
        className="
          p-3 rounded-full 
          bg-black/40 backdrop-blur-md 
          border border-white/5 
          hover:border-emerald-500/50 
          transition-all duration-300 group cursor-help
        " 
        title={t('systemReady')}
      >
         <div className="relative">
            <Activity size={20} className="text-emerald-500 opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-emerald-500/40 blur-[8px] animate-pulse rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
         </div>
      </div>

    </div>
  );
};

export default Sidebar;
