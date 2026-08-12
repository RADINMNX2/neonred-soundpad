import React from 'react';
import { Globe, Check } from 'lucide-react';
import { Language } from '../utils/translations';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onSelect: (lang: Language) => void;
}

const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({ isOpen, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with heavy blur */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl transition-opacity animate-fade-in"></div>
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative w-full max-w-2xl transform transition-all animate-slide-up">
        
        {/* Header Text */}
        <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-zinc-900/50 rounded-2xl border border-white/5 shadow-2xl mb-4">
                <Globe size={40} className="text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 tracking-tight">
                Select Language
            </h1>
            <p className="text-xl text-gray-400 font-persian">
                لطفا زبان برنامه را انتخاب کنید
            </p>
        </div>

        {/* Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* English Card */}
            <button 
                onClick={() => onSelect('en')}
                className="group relative h-48 bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/10 hover:border-red-500/50 rounded-3xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-900/20 flex flex-col items-center justify-center gap-4 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/0 via-red-600/0 to-red-600/5 group-hover:via-red-600/10 transition-all duration-500"></div>
                
                <span className="text-5xl font-black text-white group-hover:scale-110 transition-transform duration-300 font-sans tracking-tighter">
                    English
                </span>
                <span className="text-sm text-gray-500 font-medium tracking-widest uppercase group-hover:text-red-400 transition-colors">
                    International
                </span>
                
                {/* Hover Check Icon */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    <div className="bg-red-500 rounded-full p-1">
                        <Check size={16} className="text-white" />
                    </div>
                </div>
            </button>

            {/* Persian Card */}
            <button 
                onClick={() => onSelect('fa')}
                className="group relative h-48 bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/10 hover:border-blue-500/50 rounded-3xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-900/20 flex flex-col items-center justify-center gap-4 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-bl from-blue-600/0 via-blue-600/0 to-blue-600/5 group-hover:via-blue-600/10 transition-all duration-500"></div>
                
                <span className="text-5xl font-black text-white group-hover:scale-110 transition-transform duration-300 font-persian">
                    فارسی
                </span>
                <span className="text-sm text-gray-500 font-medium font-persian group-hover:text-blue-400 transition-colors">
                    پارسی / Iran
                </span>

                {/* Hover Check Icon */}
                <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    <div className="bg-blue-500 rounded-full p-1">
                        <Check size={16} className="text-white" />
                    </div>
                </div>
            </button>

        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
            <p className="text-xs text-gray-600 font-mono">
                YOU CAN CHANGE THIS LATER IN SETTINGS
            </p>
        </div>

      </div>
    </div>
  );
};

export default LanguageSelectorModal;