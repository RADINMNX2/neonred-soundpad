import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface MicSettingModalProps {
  title: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  icon: React.ElementType;
  colorClass: string; // e.g., 'text-cyan-500'
  gradientClass: string; // e.g., 'from-cyan-600 to-blue-600'
  isOpen: boolean;
  onClose: () => void;
  onSave: (val: number) => void;
}

const MicSettingModal: React.FC<MicSettingModalProps> = ({ 
  title, 
  description, 
  value, 
  min, 
  max, 
  step, 
  unit = '',
  icon: Icon,
  colorClass,
  gradientClass,
  isOpen, 
  onClose, 
  onSave 
}) => {
  const { isRTL } = useLanguage();
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    if (isOpen) {
      setCurrentValue(value);
    }
  }, [isOpen, value]);

  const handleSave = () => {
    onSave(currentValue);
    onClose();
  };

  if (!isOpen) return null;

  // Safety check to prevent division by zero
  const range = max - min;
  const percentage = range === 0 ? 0 : ((currentValue - min) / range) * 100;

  // Determine gradient direction based on RTL
  const gradientDirection = isRTL ? 'to left' : 'to right';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up overflow-hidden">
        {/* Top Accent */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientClass}`}></div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className={`p-2 bg-white/5 rounded-lg ${colorClass}`}>
                <Icon size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white font-persian">{title}</h2>
                <p className="text-xs text-gray-500 font-persian">{description}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Visual Display */}
        <div className="mb-8 flex flex-col items-center justify-center py-6 bg-black/40 rounded-xl border border-white/5 relative group">
           <div className="text-4xl font-bold text-white mb-2 font-mono">
             {typeof currentValue === 'number' ? currentValue.toFixed(1) : '0.0'}{unit}
           </div>
           
           {/* Slider Container */}
           <div className={`w-full px-8 mt-4 relative ${colorClass}`}>
             <input 
               type="range"
               min={min}
               max={max}
               step={step}
               value={currentValue}
               onChange={(e) => setCurrentValue(parseFloat(e.target.value))}
               className={`
                 w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer z-10 relative focus:outline-none
                 [&::-webkit-slider-thumb]:appearance-none
                 [&::-webkit-slider-thumb]:w-5
                 [&::-webkit-slider-thumb]:h-5
                 [&::-webkit-slider-thumb]:rounded-full
                 [&::-webkit-slider-thumb]:bg-white
                 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.5)]
                 [&::-webkit-slider-thumb]:mt-[-6px]
                 [&::-webkit-slider-thumb]:transition-transform
                 [&::-webkit-slider-thumb]:hover:scale-110
                 [&::-webkit-slider-runnable-track]:h-2
                 [&::-webkit-slider-runnable-track]:rounded-lg
               `}
               style={{
                 backgroundImage: `linear-gradient(${gradientDirection}, currentColor 0%, currentColor ${percentage}%, transparent ${percentage}%, transparent 100%)`
               }}
             />
           </div>
           
           <div className={`flex justify-between w-full px-8 mt-2 text-xs text-gray-500 font-mono ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <span>{min}</span>
              <span>{max}</span>
           </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium font-persian"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSave}
            className={`px-6 py-2 bg-gradient-to-r ${gradientClass} text-white rounded-xl font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-all font-persian`}
          >
            <Check size={16} />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default MicSettingModal;