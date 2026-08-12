
import React from 'react';
import { X, Mic, Zap, Waves, Radio } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { MicEqSettings } from '../types';

interface AdvancedAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MicEqSettings;
  onUpdate: (settings: MicEqSettings) => void;
}

const AdvancedAudioModal: React.FC<AdvancedAudioModalProps> = ({ isOpen, onClose, settings, onUpdate }) => {
  const { t, isRTL } = useLanguage();

  if (!isOpen) return null;

  const toggleSetting = (key: keyof MicEqSettings) => {
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  const ToggleCard = ({ 
    active, 
    onClick, 
    title, 
    desc, 
    icon: Icon,
    colorClass,
    glowClass 
  }: { 
    active: boolean; 
    onClick: () => void; 
    title: string; 
    desc: string; 
    icon: any;
    colorClass: string;
    glowClass: string;
  }) => (
    <button
      onClick={onClick}
      className={`
        relative w-full p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 group overflow-hidden
        ${active 
          ? `bg-black border-${colorClass} shadow-[0_0_20px_rgba(0,0,0,0.5)]` 
          : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800'
        }
      `}
    >
      {/* Background Glow */}
      <div className={`absolute inset-0 opacity-0 transition-opacity duration-500 ${active ? 'opacity-20 ' + glowClass : ''}`}></div>

      {/* Icon Box */}
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all
        ${active ? `bg-${colorClass} text-white shadow-lg` : 'bg-white/5 text-gray-500'}
      `}>
         <Icon size={24} />
      </div>

      {/* Text */}
      <div className={`flex flex-col text-${isRTL ? 'right' : 'left'}`}>
        <span className={`font-bold text-lg ${active ? 'text-white' : 'text-gray-400'}`}>{title}</span>
        <span className="text-xs text-gray-500 font-persian">{desc}</span>
      </div>

      {/* Switch Indicator */}
      <div className={`
        absolute ${isRTL ? 'left-4' : 'right-4'} w-12 h-6 rounded-full p-1 transition-colors
        ${active ? `bg-${colorClass}` : 'bg-zinc-700'}
      `}>
        <div className={`
          w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300
          ${active ? (isRTL ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'}
        `}></div>
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity animate-fade-in" onClick={onClose}></div>
      
      <div className="relative bg-zinc-950 border border-orange-500/20 rounded-3xl w-full max-w-lg shadow-2xl shadow-orange-900/40 animate-slide-up overflow-hidden">
        
        {/* Header Decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/20 blur-[60px] rounded-full pointer-events-none"></div>

        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                  <Mic size={24} />
               </div>
               <div>
                  <h2 className="text-2xl font-bold text-white font-persian">{t('advAudioTitle')}</h2>
                  <p className="text-sm text-gray-400 font-persian">{t('advAudioDesc')}</p>
               </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
             {/* Noise Suppression */}
             <ToggleCard 
               active={settings.noiseSuppression}
               onClick={() => toggleSetting('noiseSuppression')}
               title={t('noiseSuppression')}
               desc={t('noiseDesc')}
               icon={Zap}
               colorClass="orange-500"
               glowClass="bg-orange-500"
             />

             {/* Echo Cancellation */}
             <ToggleCard 
               active={settings.echoCancellation}
               onClick={() => toggleSetting('echoCancellation')}
               title={t('echoCancellation')}
               desc={t('echoDesc')}
               icon={Waves}
               colorClass="blue-500"
               glowClass="bg-blue-500"
             />

             {/* Compressor */}
             <ToggleCard 
               active={settings.compressor}
               onClick={() => toggleSetting('compressor')}
               title={t('compressor')}
               desc={t('compressorDesc')}
               icon={Radio}
               colorClass="purple-500"
               glowClass="bg-purple-500"
             />
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-orange-500/70 font-mono tracking-widest">PRO AUDIO ENGINE</span>
              <button onClick={onClose} className="px-6 py-2 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
                 Done
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAudioModal;
