import React from 'react';
import { Globe, Check, Sparkles, Settings } from 'lucide-react';
import { Language } from '../utils/translations';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onSelect: (lang: Language) => void;
}

const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({ isOpen, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-fade-in"></div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[12%] -left-28 w-[30rem] h-[30rem] bg-red-600/15 rounded-full blur-[130px] animate-pulse-slow"></div>
        <div className="absolute bottom-[8%] -right-28 w-[26rem] h-[26rem] bg-blue-600/10 rounded-full blur-[130px] animate-pulse-slow" style={{ animationDelay: '1.2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22rem] h-[22rem] bg-rose-500/5 rounded-full blur-[110px]"></div>
      </div>

      <div className="relative w-full max-w-2xl animate-slide-up">
        <div className="relative overflow-hidden rounded-3xl bg-zinc-950/60 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/60">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-500/80 via-rose-400/80 to-pink-500/80"></div>
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-44 bg-red-500/15 rounded-full blur-[90px] pointer-events-none"></div>
          <div className="absolute -bottom-32 -right-20 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative px-6 sm:px-10 pt-9 sm:pt-10 pb-8 sm:pb-9">
            <div className="text-center mb-9 space-y-3">
              <div className="relative inline-flex mb-1">
                <span className="absolute inset-0 rounded-full bg-red-500/25 blur-xl animate-pulse-slow"></span>
                <span className="relative rounded-full p-px bg-gradient-to-br from-red-500 via-rose-400 to-pink-500 shadow-lg shadow-red-900/50">
                  <span className="flex items-center justify-center w-14 h-14 rounded-full bg-zinc-950/80 border border-white/5">
                    <Globe size={26} className="text-white drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  </span>
                </span>
                <span className="absolute -top-0.5 -end-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 ring-2 ring-zinc-950"></span>
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500">
                Select Language
              </h1>
              <p className="text-base sm:text-lg text-gray-400 font-persian">
                لطفا زبان برنامه را انتخاب کنید
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="group relative h-44 sm:h-52 rounded-3xl p-px bg-gradient-to-br from-white/15 via-white/5 to-white/15">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500 via-rose-400/40 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <button
                  onClick={() => onSelect('en')}
                  className="relative h-full w-full rounded-[calc(1.5rem-1px)] bg-zinc-950/60 backdrop-blur-xl overflow-hidden flex flex-col items-center justify-center gap-2.5 transition-[transform,box-shadow,opacity] duration-300 ease-out hover:scale-[1.03] hover:shadow-2xl hover:shadow-red-500/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-red-600/10 transition-opacity duration-500 group-hover:from-red-600/10 group-hover:to-red-600/20 pointer-events-none"></div>

                  <span className="absolute top-4 end-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                    <span className="text-lg leading-none">🇺🇸</span>
                  </span>

                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter font-sans">
                    English
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.3em] uppercase text-zinc-500 transition-colors duration-300 group-hover:text-red-400">
                    International
                  </span>

                  <div className="flex items-center justify-center gap-4 mt-1">
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <span className="h-1 w-1 rounded-full bg-red-400/60"></span>
                      Global standard UI
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <span className="h-1 w-1 rounded-full bg-red-400/60"></span>
                      Full keyboard support
                    </span>
                  </div>

                  <span className="absolute bottom-4 end-4 opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                    <span className="flex items-center justify-center p-1.5 rounded-full bg-gradient-to-br from-red-500 to-rose-600 ring-2 ring-white/20 shadow-lg shadow-red-900/40">
                      <Check size={14} className="text-white" />
                    </span>
                  </span>
                </button>
              </div>

              <div className="group relative h-44 sm:h-52 rounded-3xl p-px bg-gradient-to-br from-white/15 via-white/5 to-white/15">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-sky-400/40 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <button
                  onClick={() => onSelect('fa')}
                  className="relative h-full w-full rounded-[calc(1.5rem-1px)] bg-zinc-950/60 backdrop-blur-xl overflow-hidden flex flex-col items-center justify-center gap-2.5 transition-[transform,box-shadow,opacity] duration-300 ease-out hover:scale-[1.03] hover:shadow-2xl hover:shadow-blue-500/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  <div className="absolute inset-0 bg-gradient-to-bl from-blue-600/5 via-transparent to-blue-600/10 transition-opacity duration-500 group-hover:from-blue-600/10 group-hover:to-blue-600/20 pointer-events-none"></div>

                  <span className="absolute top-4 end-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                    <span className="text-lg leading-none">🇮🇷</span>
                  </span>

                  <span className="absolute top-4 start-4 inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 backdrop-blur-md">
                    <Sparkles size={10} className="text-blue-300" />
                    <span className="text-[10px] font-semibold text-blue-300 font-persian">پیشنهادی</span>
                  </span>

                  <span className="text-4xl sm:text-5xl font-black text-white font-persian">
                    فارسی
                  </span>
                  <span className="text-sm font-medium text-zinc-500 font-persian transition-colors duration-300 group-hover:text-blue-400">
                    پارسی / Iran
                  </span>

                  <div className="flex items-center justify-center gap-4 mt-1">
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500 font-persian">
                      <span className="h-1 w-1 rounded-full bg-blue-400/60"></span>
                      رابط کاملاً فارسی
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500 font-persian">
                      <span className="h-1 w-1 rounded-full bg-blue-400/60"></span>
                      پشتیبانی کامل RTL
                    </span>
                  </div>

                  <span className="absolute bottom-4 end-4 opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                    <span className="flex items-center justify-center p-1.5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 ring-2 ring-white/20 shadow-lg shadow-blue-900/40">
                      <Check size={14} className="text-white" />
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  <Settings size={10} className="text-zinc-500" />
                  <span className="font-mono text-[9px] font-semibold tracking-[0.15em] text-zinc-500">SETTINGS</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
              </div>
              <p className="mt-4 text-center font-mono text-[10px] tracking-[0.2em] text-zinc-600">
                YOU CAN CHANGE THIS LATER IN SETTINGS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectorModal;