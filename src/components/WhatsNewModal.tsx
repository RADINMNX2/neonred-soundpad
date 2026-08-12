
import React from 'react';
import { X, Gift, CheckCircle2, PlusCircle, MinusCircle, PartyPopper } from 'lucide-react';
import { CHANGELOG } from '../data/changelog';
import { VERSION } from '../constants';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Find current version details, fallback to first entry
  const currentRelease = CHANGELOG.find(c => c.version === VERSION) || CHANGELOG[0];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-fade-in" onClick={onClose}></div>

      <div className="relative w-full max-w-2xl bg-zinc-950 border border-purple-500/20 rounded-3xl shadow-2xl shadow-purple-900/30 overflow-hidden flex flex-col max-h-[85vh] animate-slide-up">
        
        {/* Header Graphic */}
        <div className="relative h-40 bg-zinc-900 overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/30 blur-[60px] rounded-full"></div>
            
            <div className="absolute inset-0 flex items-center justify-center flex-col z-10">
                <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/30 mb-3 shadow-lg backdrop-blur-sm">
                    <PartyPopper size={32} className="text-purple-400" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">WHAT'S NEW</h1>
                <p className="text-purple-300 font-mono mt-1">Version {currentRelease.version}</p>
            </div>

            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors z-20">
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
            
            {/* Added Section */}
            {currentRelease.features.added && currentRelease.features.added.length > 0 && (
                <div className="mb-8">
                    <h3 className="flex items-center gap-2 text-green-400 font-bold mb-4 uppercase tracking-wider text-sm">
                        <PlusCircle size={16} /> Added
                    </h3>
                    <ul className="space-y-3">
                        {currentRelease.features.added.map((item, idx) => (
                            <li key={idx} className="flex gap-3 text-gray-300 text-sm leading-relaxed bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 shrink-0"></div>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Fixed Section */}
            {currentRelease.features.fixed && currentRelease.features.fixed.length > 0 && (
                <div className="mb-8">
                    <h3 className="flex items-center gap-2 text-blue-400 font-bold mb-4 uppercase tracking-wider text-sm">
                        <CheckCircle2 size={16} /> Fixed
                    </h3>
                    <ul className="space-y-3">
                        {currentRelease.features.fixed.map((item, idx) => (
                            <li key={idx} className="flex gap-3 text-gray-300 text-sm leading-relaxed bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></div>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

             {/* Removed Section */}
             {currentRelease.features.removed && currentRelease.features.removed.length > 0 && (
                <div className="mb-8">
                    <h3 className="flex items-center gap-2 text-red-400 font-bold mb-4 uppercase tracking-wider text-sm">
                        <MinusCircle size={16} /> Removed
                    </h3>
                    <ul className="space-y-3">
                        {currentRelease.features.removed.map((item, idx) => (
                            <li key={idx} className="flex gap-3 text-gray-300 text-sm leading-relaxed bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 shrink-0"></div>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-zinc-900/30 flex justify-center">
            <button 
                onClick={onClose}
                className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg active:scale-95"
            >
                Awesome!
            </button>
        </div>

      </div>
    </div>
  );
};

export default WhatsNewModal;
