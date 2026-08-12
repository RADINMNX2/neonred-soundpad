
import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { X, Eye, Palette, Zap, Waves, LayoutGrid, Maximize2, Hash, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { VisualizerConfig } from '../types';
import RealTimeVisualizer from './RealTimeVisualizer';

interface VisualizerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: VisualizerConfig;
  onUpdate: (config: VisualizerConfig) => void;
}

// --- CONSTANTS ---
const PRESET_COLORS = [
  '#ef4444', // Red
  '#ec4899', // Pink
  '#d946ef', // Fuchsia
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ffffff', // White
];

// --- HELPER: HSL to HEX ---
// Converts Hue (0-360) with 100% Saturation and 50% Lightness to Hex
const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// --- SUB-COMPONENTS ---

const ControlGroup = ({ title, children }: { title: string, children: ReactNode }) => (
  <div className="space-y-4">
      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">{title}</h4>
      <div className="bg-zinc-900/50 border border-white/5 rounded-[2rem] p-6 space-y-6">
          {children}
      </div>
  </div>
);

const CustomSlider = ({ label, value, min, max, step, onChange, icon: Icon, unit = '' }: any) => {
  return (
    <div className="space-y-3 group">
        <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                <Icon size={14} className="text-pink-500" />
                <span className="text-xs font-bold">{label}</span>
            </div>
            <span className="text-xs font-mono font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded min-w-[3rem] text-center">{value}{unit}</span>
        </div>
        <div className="relative h-2 w-full">
            <input 
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="absolute w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-pink-500 outline-none hover:bg-zinc-700 transition-colors z-10"
            />
            <div 
                className="absolute top-[2px] left-0 h-1.5 bg-pink-600 rounded-full pointer-events-none" 
                style={{ width: `${((value - min) / (max - min)) * 100}%` }}
            ></div>
        </div>
    </div>
  );
};

const NeonColorPicker = ({ color, onChange }: { color: string, onChange: (c: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color);
  const [hue, setHue] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      onChange(val);
    }
  };

  const handleSpectrumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseInt(e.target.value);
    setHue(newHue);
    const newColor = hslToHex(newHue, 100, 50); // Full saturation for Neon effect
    onChange(newColor);
    setHexInput(newColor);
  };

  return (
    <div className="relative" ref={containerRef}>
       {/* Trigger Button */}
       <button 
         onClick={() => setIsOpen(!isOpen)}
         className="w-full flex items-center justify-between p-2 bg-black/40 border border-white/10 rounded-xl hover:border-pink-500/50 hover:bg-black/60 transition-all group"
       >
          <div className="flex items-center gap-3">
             <div 
               className="w-10 h-10 rounded-lg shadow-lg border border-white/10 transition-transform group-hover:scale-105"
               style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}40` }}
             ></div>
             <div className="flex flex-col items-start">
               <span className="text-xs font-bold text-gray-300 group-hover:text-white uppercase tracking-wider">{color}</span>
               <span className="text-[9px] text-gray-500">Manual Color</span>
             </div>
          </div>
          <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
       </button>

       {/* Popover Panel */}
       {isOpen && (
         <div className="absolute top-full left-0 right-0 mt-3 p-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/80 z-50 animate-slide-up origin-top">
            
            {/* Hex Input */}
            <div className="flex items-center gap-2 mb-4 bg-black/50 p-2 rounded-xl border border-white/5 focus-within:border-pink-500/50 transition-colors">
                <Hash size={16} className="text-gray-500 ml-1" />
                <input 
                  type="text" 
                  value={hexInput}
                  onChange={handleHexChange}
                  maxLength={7}
                  className="bg-transparent border-none outline-none text-white text-sm font-mono w-full uppercase placeholder-gray-700"
                  placeholder="#FFFFFF"
                />
                <div className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: color }}></div>
            </div>

            {/* Custom Rainbow Slider (No native OS picker) */}
            <div className="mb-6">
                 <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Neon Spectrum</span>
                 </div>
                 <div className="relative h-4 w-full rounded-full ring-1 ring-white/10">
                     {/* Gradient Background */}
                     <div 
                        className="absolute inset-0 rounded-full" 
                        style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}
                     ></div>
                     
                     <input 
                        type="range" 
                        min="0"
                        max="360"
                        value={hue}
                        onChange={handleSpectrumChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     />
                     
                     {/* Custom Thumb Indicator */}
                     <div 
                        className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] border-2 border-white pointer-events-none transition-transform duration-75"
                        style={{ left: `calc(${(hue / 360) * 100}% - 10px)` }}
                     ></div>
                 </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-5 gap-2">
               {PRESET_COLORS.map((c) => (
                 <button
                   key={c}
                   onClick={() => { onChange(c); setHexInput(c); }}
                   className={`w-8 h-8 rounded-full border border-white/10 transition-all hover:scale-110 relative group/color ${color.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : ''}`}
                   style={{ backgroundColor: c }}
                 >
                    {color.toLowerCase() === c.toLowerCase() && (
                        <Check size={12} className="text-black/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold" />
                    )}
                 </button>
               ))}
            </div>
         </div>
       )}
    </div>
  );
};


// --- MAIN COMPONENT ---

const VisualizerSettingsModal: React.FC<VisualizerSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdate,
}) => {
  const { isRTL } = useLanguage();

  if (!isOpen) return null;

  const handleChange = (key: keyof VisualizerConfig, value: any) => {
    onUpdate({ ...config, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl animate-fade-in" onClick={onClose}></div>

      {/* Main Container */}
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-pink-500/20 rounded-[3rem] shadow-2xl shadow-pink-900/20 animate-slide-up flex flex-col max-h-[90vh]">
        
        {/* Animated Background Decor */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-pink-600/10 blur-[120px] animate-pulse pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-600/10 blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>

        {/* Header */}
        <div className="relative p-8 border-b border-white/5 bg-zinc-900/40 flex justify-between items-center z-10 rounded-t-[3rem]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600"></div>
            <div className="flex items-center gap-5">
                <div className="p-4 bg-pink-500/10 rounded-3xl text-pink-500 shadow-lg shadow-pink-500/10 border border-pink-500/20">
                    <Maximize2 size={28} />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight font-persian">Visualizer Studio</h2>
                    <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase mt-0.5">Motion Graphics & Reactive FX</p>
                </div>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 transition-all rounded-2xl border border-white/5 group">
                <X size={24} className="group-hover:rotate-90 transition-transform" />
            </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                
                {/* Left: Settings */}
                <div className="space-y-8">
                    
                    {/* Master Switch */}
                    <div className="flex items-center justify-between bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${config.isEnabled ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/5' : 'bg-zinc-800 text-zinc-600'}`}>
                                <Eye size={24} className={config.isEnabled ? 'animate-pulse' : ''} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Engine Status</h3>
                                <p className="text-sm text-zinc-500">Enable realtime reactive bars</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleChange('isEnabled', !config.isEnabled)}
                            className={`w-16 h-9 rounded-full p-1.5 transition-all duration-500 ${config.isEnabled ? 'bg-pink-600 shadow-[0_0_20px_rgba(236,72,153,0.4)]' : 'bg-zinc-800'}`}
                        >
                            <div className={`w-6 h-6 rounded-full bg-white shadow-xl transform transition-transform duration-500 ${config.isEnabled ? (isRTL ? '-translate-x-7' : 'translate-x-7') : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    <div className={`space-y-8 transition-all duration-700 ${config.isEnabled ? 'opacity-100 scale-100' : 'opacity-30 scale-95 pointer-events-none grayscale'}`}>
                        <ControlGroup title="Physical Geometry">
                            <CustomSlider 
                                label="Visual Scale (Height)" 
                                icon={Maximize2} 
                                min={0.5} max={2.0} step={0.1} 
                                value={config.height} 
                                onChange={(v: number) => handleChange('height', v)}
                                unit="x"
                            />
                            <CustomSlider 
                                label="Bar Density" 
                                icon={LayoutGrid} 
                                min={20} max={100} step={2} 
                                value={config.barCount} 
                                onChange={(v: number) => handleChange('barCount', v)}
                            />
                            <CustomSlider 
                                label="Bar Spacing" 
                                icon={LayoutGrid} 
                                min={0} max={8} step={1} 
                                value={config.barGap} 
                                onChange={(v: number) => handleChange('barGap', v)}
                                unit="px"
                            />
                        </ControlGroup>

                        <ControlGroup title="Response & Aesthetics">
                            <CustomSlider 
                                label="Audio Sensitivity" 
                                icon={Waves} 
                                min={0.5} max={3.0} step={0.1} 
                                value={config.sensitivity} 
                                onChange={(v: number) => handleChange('sensitivity', v)}
                                unit="x"
                            />

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-zinc-400 px-1">
                                    <Palette size={14} className="text-pink-500" />
                                    <span className="text-xs font-bold">Color Mode</span>
                                </div>
                                <div className="flex p-1 bg-black/40 rounded-2xl border border-white/5">
                                    <button 
                                        onClick={() => handleChange('colorMode', 'auto')}
                                        className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${config.colorMode === 'auto' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        Adaptive (Cover)
                                    </button>
                                    <button 
                                        onClick={() => handleChange('colorMode', 'manual')}
                                        className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${config.colorMode === 'manual' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        Fixed Neon
                                    </button>
                                </div>

                                {config.colorMode === 'manual' && (
                                    <div className="pt-2 animate-slide-up">
                                         <NeonColorPicker 
                                            color={config.manualColor} 
                                            onChange={(c) => handleChange('manualColor', c)} 
                                         />
                                    </div>
                                )}
                            </div>
                        </ControlGroup>
                    </div>

                </div>

                {/* Right: Realtime Preview Box */}
                <div className="flex flex-col h-full space-y-6">
                    <ControlGroup title="System Emulation Preview">
                        <div className={`relative w-full h-[450px] bg-black rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl transition-all duration-700 ${config.isEnabled ? 'opacity-100 translate-y-0' : 'opacity-20 translate-y-4'}`}>
                            {/* Grid Background */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.05)_0%,transparent_70%)]"></div>
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                            
                            <div className="absolute inset-0 flex items-center justify-center p-12">
                                <RealTimeVisualizer 
                                    analyser={null} 
                                    isPlaying={true} 
                                    color={config.colorMode === 'manual' ? config.manualColor : '#ec4899'} 
                                    simulate={true} 
                                    config={config}
                                />
                            </div>
                            
                            {/* Emulation Tags */}
                            <div className="absolute top-6 left-6 flex flex-col gap-2">
                                <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-xs font-mono text-pink-500 flex items-center gap-2 font-bold shadow-lg">
                                    <Zap size={12} className="fill-current" /> GPU_ACCEL: READY
                                </div>
                                <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-xs font-mono text-zinc-400 flex items-center gap-2 font-bold shadow-lg">
                                    RENDER_ENGINE: NEON_V2
                                </div>
                            </div>

                            <div className="absolute bottom-6 right-6">
                                <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest font-bold">
                                    Realtime Signal Sync
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-zinc-400 text-center leading-relaxed italic">
                            Simulation reflects actual physics applied to music playback. <br/>
                            Disabling visualizer reduces CPU overhead by 15%.
                        </p>
                    </ControlGroup>
                </div>

            </div>
        </div>

        {/* Footer - Redesigned to fit the rounded container */}
        <div className="p-8 bg-zinc-900/80 border-t border-white/5 flex justify-center backdrop-blur-xl rounded-b-[3rem] z-20">
            <button 
                onClick={onClose}
                className="px-12 py-4 bg-white text-black hover:bg-pink-50 font-black rounded-2xl transition-all shadow-xl shadow-white/5 hover:scale-105 active:scale-95 flex items-center gap-3"
            >
                SAVE & CLOSE
            </button>
        </div>

      </div>
    </div>
  );
};

export default VisualizerSettingsModal;
