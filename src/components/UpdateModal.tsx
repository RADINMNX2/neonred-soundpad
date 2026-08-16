
import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X, Check, ArrowRight, Zap } from 'lucide-react';
import { UpdateInfo, UpdateProgress } from '../types';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void; // Triggered if user says "No"
  updateInfo: UpdateInfo | null;
  progress: UpdateProgress | null;
  isDownloaded: boolean;
  onDownload: () => void;
  onInstall: () => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ 
  isOpen, 
  onClose, 
  updateInfo, 
  progress, 
  isDownloaded,
  onDownload, 
  onInstall 
}) => {
  if (!isOpen || !updateInfo) return null;

  const isDownloading = progress !== null && progress.percent < 100 && !isDownloaded;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-fade-in"></div>

      {/* Modal Window */}
      <div className="relative w-full max-w-md bg-zinc-950 border border-green-500/30 rounded-3xl shadow-[0_0_50px_rgba(34,197,94,0.2)] animate-slide-up overflow-hidden">
        
        {/* Neon Green Accent Top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/10 blur-[60px] rounded-full pointer-events-none"></div>

        <div className="p-8 text-center relative z-10">
           
           {/* Icon */}
           <div className="mx-auto w-20 h-20 bg-zinc-900 rounded-full border border-green-500/30 flex items-center justify-center mb-6 shadow-lg shadow-green-900/40 relative">
              {isDownloaded ? (
                 <Check size={40} className="text-green-500 animate-pulse" />
              ) : isDownloading ? (
                 <RefreshCw size={36} className="text-green-500 animate-spin" />
              ) : (
                 <Download size={36} className="text-green-500" />
              )}
              {/* Ping Effect */}
              {!isDownloaded && !isDownloading && (
                  <div className="absolute inset-0 border-2 border-green-500/50 rounded-full animate-ping"></div>
              )}
           </div>

           <h2 className="text-2xl font-black text-white mb-2 font-persian">
               {isDownloaded ? "UPDATE READY!" : isDownloading ? "DOWNLOADING..." : "UPDATE AVAILABLE"}
           </h2>
           
           <div className="inline-block px-3 py-1 bg-green-500/10 rounded-lg border border-green-500/20 text-green-400 font-mono text-sm font-bold mb-6">
               v{updateInfo.version}
           </div>

           {!isDownloading && !isDownloaded && (
             <p className="text-gray-400 text-sm mb-8 font-persian leading-relaxed">
               A new version of NeonRed Soundpad is available. Would you like to download and install it now?
             </p>
           )}

           {/* Progress Bar */}
           {isDownloading && progress && (
               <div className="mb-8">
                   <div className="flex justify-between text-xs text-green-400 font-mono mb-2">
<span>{Math.round(progress.percent)}%</span>
                        <span>{(progress.transferred / 1024 / 1024).toFixed(1)} MB / {progress.total > 0 ? `${(progress.total / 1024 / 1024).toFixed(1)} MB` : '... MB'}</span>
                   </div>
                   <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                       <div 
                         className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300 relative"
                         style={{ width: `${progress.percent}%` }}
                       >
                           <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                       </div>
                   </div>
               </div>
           )}

           {/* Actions */}
           <div className="flex gap-3 justify-center">
              {isDownloaded ? (
                 <button 
                   onClick={onInstall}
                   className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-green-900/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                 >
                     <Zap size={20} className="fill-white" />
                     RESTART & INSTALL
                 </button>
              ) : isDownloading ? (
                 <div className="w-full py-4 bg-zinc-900 text-gray-500 font-bold rounded-2xl border border-white/5 cursor-not-allowed">
                     PLEASE WAIT...
                 </div>
              ) : (
                 <>
                    <button 
                      onClick={onClose}
                      className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-400 font-bold rounded-xl border border-white/5 transition-colors"
                    >
                      LATER
                    </button>
                    <button 
                      onClick={onDownload}
                      className="flex-[2] py-3 bg-white text-black hover:bg-gray-200 font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      YES, UPDATE
                      <ArrowRight size={18} />
                    </button>
                 </>
              )}
           </div>

        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
