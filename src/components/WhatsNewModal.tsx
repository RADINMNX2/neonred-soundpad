import React from 'react';
import { X, PartyPopper, PlusCircle, CheckCircle2, MinusCircle } from 'lucide-react';
import { CHANGELOG } from '../data/changelog';
import { VERSION } from '../constants';
import { useLanguage } from '../context/LanguageContext';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { isRTL } = useLanguage();
  const currentRelease = CHANGELOG.find(c => c.version === VERSION) || CHANGELOG[0];

  const sections = [
    {
      key: 'added',
      label: 'Added',
      icon: PlusCircle,
      chip: 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border-emerald-500/30 text-emerald-300',
      iconColor: 'text-emerald-400',
      dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]',
      items: currentRelease.features.added,
    },
    {
      key: 'fixed',
      label: 'Fixed',
      icon: CheckCircle2,
      chip: 'bg-gradient-to-r from-blue-500/15 to-cyan-500/15 border-blue-500/30 text-blue-300',
      iconColor: 'text-blue-400',
      dot: 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.7)]',
      items: currentRelease.features.fixed,
    },
    {
      key: 'removed',
      label: 'Removed',
      icon: MinusCircle,
      chip: 'bg-gradient-to-r from-red-500/15 to-rose-500/15 border-red-500/30 text-red-300',
      iconColor: 'text-red-400',
      dot: 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.7)]',
      items: currentRelease.features.removed,
    },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-fade-in" onClick={onClose}></div>

      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-red-600/20 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-violet-600/20 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl shadow-red-950/40 animate-slide-up overflow-hidden select-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-red-500 via-violet-500 to-pink-500 z-20"></div>
        <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-transparent via-pink-500/50 to-transparent blur-md z-20"></div>

        <div className="absolute -top-10 right-1/4 text-[9rem] sm:text-[11rem] font-black font-mono text-zinc-900/50 -rotate-12 pointer-events-none select-none whitespace-nowrap">
          v{currentRelease.version}
        </div>

        <div className="relative shrink-0 overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/15 via-zinc-900 to-violet-600/15"></div>
          <div className="absolute -bottom-16 -left-10 w-52 h-52 bg-red-500/20 blur-[70px] rounded-full"></div>
          <div className="absolute -top-10 -right-10 w-52 h-52 bg-violet-500/20 blur-[70px] rounded-full"></div>

          <button
            onClick={onClose}
            className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 bg-black/30 hover:bg-black/60 hover:scale-110 text-white/80 hover:text-white rounded-full backdrop-blur-md transition-all z-30`}
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5 sm:gap-8 px-6 sm:px-10 pt-10 pb-8 text-center sm:text-left">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-red-500/50 animate-[ring-spin_14s_linear_infinite]"></div>
              <div className="absolute inset-2 rounded-full border border-white/10"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-red-600 via-pink-600 to-violet-600 flex items-center justify-center shadow-lg shadow-red-900/50">
                  <PartyPopper size={26} className="text-white" />
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-red-600/20 to-violet-600/20 border border-white/10 font-mono text-xs text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-violet-300 font-bold tracking-wider">
                Version {currentRelease.version}
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-red-200 to-violet-300 mt-3">
                WHAT'S NEW
              </h1>
              <p className="font-mono text-[11px] sm:text-xs text-zinc-500 tracking-widest uppercase mt-2">
                Released {currentRelease.date}
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8">
          <div className="space-y-8">
            {sections.map(section => (
              section.items && section.items.length > 0 && (
                <div key={section.key}>
                  <h3 className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-bold uppercase tracking-wider text-sm mb-4 ${section.chip}`}>
                    <section.icon size={15} className={section.iconColor} />
                    {section.label}
                  </h3>
                  <ul className="space-y-3">
                    {section.items.map((item, idx) => (
                      <li
                        key={idx}
                        className={`flex gap-3 items-start text-gray-300 text-sm leading-relaxed bg-zinc-900/50 p-3.5 rounded-xl border border-white/5 hover:bg-zinc-900/80 hover:border-white/15 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-950/20 transition-all duration-200 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${section.dot}`}></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        </div>

        <div className="relative shrink-0 p-5 sm:p-6 border-t border-white/5 bg-zinc-900/40 flex flex-col items-center gap-2">
          <button
            onClick={onClose}
            className="px-10 py-3 bg-gradient-to-r from-red-600 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-red-900/40 hover:shadow-red-900/60 hover:brightness-110 transition-all active:scale-95"
          >
            Awesome!
          </button>
          <p className="text-[11px] text-zinc-500 font-persian">Enjoy the update</p>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;