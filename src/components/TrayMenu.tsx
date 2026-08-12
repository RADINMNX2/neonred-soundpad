
import React, { useEffect } from 'react';
import { Power, Maximize, ChevronRight } from 'lucide-react';

const TrayMenu: React.FC = () => {
  
  useEffect(() => {
    // Enable transparency for rounded corners
    document.body.style.backgroundColor = 'transparent';
    const root = document.getElementById('root');
    if (root) root.style.backgroundColor = 'transparent';
    
    return () => {
        document.body.style.backgroundColor = '#000000';
        if (root) root.style.backgroundColor = '';
    };
  }, []);

  const handleOpen = () => window.electronAPI?.showMainApp();
  const handleQuit = () => window.electronAPI?.quitApp();

  return (
    <div className="h-screen w-screen flex flex-col p-2 select-none overflow-hidden bg-transparent">
      <div className="flex-1 bg-zinc-950/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative group justify-center">
        
        {/* Neon Glow at the top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80 shadow-[0_0_15px_#ef4444]"></div>
        
        {/* Ambient background glow */}
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-600/10 rounded-full blur-[50px] pointer-events-none"></div>

        <div className="p-3 flex flex-col gap-2 relative z-10">
            <button 
              onClick={handleOpen}
              className="group/btn relative w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-200 outline-none"
            >
               <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-zinc-800 text-gray-400 group-hover/btn:bg-blue-600/20 group-hover/btn:text-blue-400 transition-colors">
                       <Maximize size={18} />
                   </div>
                   <span className="text-sm font-bold text-gray-300 group-hover/btn:text-white transition-colors tracking-wide">Dashboard</span>
               </div>
               <ChevronRight size={14} className="text-gray-600 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
            </button>

            <button 
              onClick={handleQuit}
              className="group/btn relative w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-950/30 border border-transparent hover:border-red-500/20 transition-all duration-200 outline-none"
            >
               <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-zinc-800 text-gray-400 group-hover/btn:bg-red-600 group-hover/btn:text-white transition-colors shadow-lg group-hover/btn:shadow-red-900/50">
                       <Power size={18} />
                   </div>
                   <span className="text-sm font-bold text-gray-300 group-hover/btn:text-red-200 transition-colors tracking-wide">Exit App</span>
               </div>
            </button>
        </div>
      </div>
    </div>
  );
};

export default TrayMenu;
