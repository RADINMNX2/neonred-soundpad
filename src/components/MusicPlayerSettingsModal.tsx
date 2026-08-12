
import React, { useState, useRef, useEffect } from 'react';
import { X, Eye, Palette, Zap, Waves, LayoutGrid, Maximize2, Hash, Check, ChevronDown, Music, Settings, Activity } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { VisualizerConfig, CrossfadeConfig } from '../types';
import RealTimeVisualizer from './RealTimeVisualizer';

interface MusicPlayerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visConfig: VisualizerConfig;
  onVisUpdate: (config: VisualizerConfig) => void;
  crossfadeConfig: CrossfadeConfig;
  onCrossfadeUpdate: (config: CrossfadeConfig) => void;
}

type Tab = 'visualizer' | 'audio';

// --- CONSTANTS ---
const PRESET_COLORS = ['#ef4444', '#ec4899', '#d946ef', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#eab308', '#f97316', '#ffffff'];

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

const CustomSlider = ({ label, value, min, max, step, onChange, icon: Icon, unit = '' }: any) => (
  <div className="space-y-3 group">
      <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2 text-zinc-400 group-hover:text-zinc-200 transition-colors">
              <Icon size={14} className="text-pink-500" />
              <span className="text-xs font-bold">{label}</span>
          </div>
          <span className="text-xs font-mono font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded min-w-[3rem] text-center">{value}{unit}</span>
      </div>
      <div className="relative h-2 w-full">
          <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="absolute w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-pink-500 outline-none hover:bg-zinc-700 transition-colors z-10" />
          <div className="absolute top-[2px] left-0 h-1.5 bg-pink-600 rounded-full pointer-events-none" style={{ width: `${((value - min) / (max - min)) * 100}%` }}></div>
      </div>
  </div>
);

const NeonColorPicker = ({ color, onChange }: { color: string, onChange: (c: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color);
  const [hue, setHue] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setHexInput(color); }, [color]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSpectrumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseInt(e.target.value);
    setHue(newHue);
    const newColor = hslToHex(newHue, 100, 50);
    onChange(newColor);
    setHexInput(newColor);
  };

  return (
    <div className="relative" ref={containerRef}>
       <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-2 bg-black/40 border border-white/10 rounded-xl hover:border-pink-500/50 hover:bg-black/60 transition-all group">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg shadow-lg border border-white/10 transition-transform group-hover:scale-105" style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}40` }}></div>
             <div className="flex flex-col items-start"><span className="text-xs font-bold text-gray-300 group-hover:text-white uppercase tracking-wider">{color}</span><span className="text-[9px] text-gray-500">Manual Color</span></div>
          </div>
          <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
       </button>
       {isOpen && (
         <div className="absolute top-full left-0 right-0 mt-3 p-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/80 z-50 animate-slide-up origin-top">
            <div className="flex items-center gap-2 mb-4 bg-black/50 p-2 rounded-xl border border-white/5 focus-within:border-pink-500/50 transition-colors">
                <Hash size={16} className="text-gray-500 ml-1" />
                <input type="text" value={hexInput} onChange={(e) => { setHexInput(e.target.value); if (/^#[0-9A-F]{6}$/i.test(e.target.value)) onChange(e.target.value); }} maxLength={7} className="bg-transparent border-none outline-none text-white text-sm font-mono w-full uppercase placeholder-gray-700" placeholder="#FFFFFF" />
                <div className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: color }}></div>
            </div>
            <div className="mb-6"><div className="relative h-4 w-full rounded-full ring-1 ring-white/10"><div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}></div><input type="range" min="0" max="360" value={hue} onChange={handleSpectrumChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" /><div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] border-2 border-white pointer-events-none transition-transform duration-75" style={{ left: `calc(${(hue / 360) * 100}% - 10px)` }}></div></div></div>
            <div className="grid grid-cols-5 gap-2">{PRESET_COLORS.map((c) => (<button key={c} onClick={() => { onChange(c); setHexInput(c); }} className={`w-8 h-8 rounded-full border border-white/10 transition-all hover:scale-110 relative group/color ${color.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : ''}`} style={{ backgroundColor: c }}>{color.toLowerCase() === c.toLowerCase() && (<Check size={12} className="text-black/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold" />)}</button>))}</div>
         </div>
       )}
    </div>
  );
};

const MusicPlayerSettingsModal: React.FC<MusicPlayerSettingsModalProps> = ({ isOpen, onClose, visConfig, onVisUpdate, crossfadeConfig, onCrossfadeUpdate }) => {
  const { isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('visualizer');

  if (!isOpen) return null;

  const handleVisChange = (key: keyof VisualizerConfig, value: any) => onVisUpdate({ ...visConfig, [key]: value });
  const handleCrossfadeChange = (key: keyof CrossfadeConfig, value: any) => onCrossfadeUpdate({ ...crossfadeConfig, [key]: value });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl animate-fade-in" onClick={onClose}></div>

      <div className="relative w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl shadow-black/80 animate-slide-up flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Navigation Header */}
        <div className="p-4 bg-zinc-900/80 border-b border-white/5 flex justify-center items-center gap-4 z-20 backdrop-blur-md">
            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                <button 
                    onClick={() => setActiveTab('visualizer')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'visualizer' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <Activity size={16} /> Visualizer
                </button>
                <button 
                    onClick={() => setActiveTab('audio')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'audio' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <Music size={16} /> Audio
                </button>
            </div>
            <button onClick={onClose} className="absolute right-6 top-6 p-2 bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-xl transition-all"><X size={20} /></button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative">
            
            {/* --- VISUALIZER TAB --- */}
            {activeTab === 'visualizer' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in">
                    <div className="space-y-8">
                        {/* Master Switch */}
                        <div className="flex items-center justify-between bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${visConfig.isEnabled ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-600'}`}>
                                    <Eye size={24} className={visConfig.isEnabled ? 'animate-pulse' : ''} />
                                </div>
                                <div><h3 className="font-bold text-white text-lg">Visualizer Engine</h3><p className="text-sm text-zinc-500">Realtime frequency analysis</p></div>
                            </div>
                            <button onClick={() => handleVisChange('isEnabled', !visConfig.isEnabled)} className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${visConfig.isEnabled ? 'bg-pink-600' : 'bg-zinc-800'}`}>
                                <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${visConfig.isEnabled ? (isRTL ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className={`space-y-6 transition-opacity duration-300 ${visConfig.isEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                            <div className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-6 space-y-6">
                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Geometry</h4>
                                <CustomSlider label="Height Scale" icon={Maximize2} min={0.5} max={2.0} step={0.1} value={visConfig.height} onChange={(v: number) => handleVisChange('height', v)} unit="x" />
                                <CustomSlider label="Bar Count" icon={LayoutGrid} min={20} max={100} step={2} value={visConfig.barCount} onChange={(v: number) => handleVisChange('barCount', v)} />
                                <CustomSlider label="Bar Spacing" icon={LayoutGrid} min={0} max={8} step={1} value={visConfig.barGap} onChange={(v: number) => handleVisChange('barGap', v)} unit="px" />
                            </div>
                            <div className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-6 space-y-6">
                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Style</h4>
                                <CustomSlider label="Sensitivity" icon={Waves} min={0.5} max={3.0} step={0.1} value={visConfig.sensitivity} onChange={(v: number) => handleVisChange('sensitivity', v)} unit="x" />
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-zinc-400 px-1"><Palette size={14} className="text-pink-500" /><span className="text-xs font-bold">Color Mode</span></div>
                                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                                        <button onClick={() => handleVisChange('colorMode', 'auto')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${visConfig.colorMode === 'auto' ? 'bg-pink-600 text-white' : 'text-zinc-500'}`}>Adaptive</button>
                                        <button onClick={() => handleVisChange('colorMode', 'manual')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${visConfig.colorMode === 'manual' ? 'bg-pink-600 text-white' : 'text-zinc-500'}`}>Fixed</button>
                                    </div>
                                    {visConfig.colorMode === 'manual' && <NeonColorPicker color={visConfig.manualColor} onChange={(c) => handleVisChange('manualColor', c)} />}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-black border border-white/10 rounded-[2.5rem] overflow-hidden relative h-[400px] shadow-inner flex flex-col">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.1)_0%,transparent_70%)]"></div>
                        <div className="flex-1 flex items-center justify-center p-8 relative z-10">
                            <RealTimeVisualizer analyser={null} isPlaying={true} color={visConfig.colorMode === 'manual' ? visConfig.manualColor : '#ec4899'} simulate={true} config={visConfig} />
                        </div>
                        <div className="p-4 bg-zinc-900/50 text-center text-xs text-zinc-500 font-mono border-t border-white/5">LIVE PREVIEW SIMULATION</div>
                    </div>
                </div>
            )}

            {/* --- AUDIO TAB --- */}
            {activeTab === 'audio' && (
                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                    
                    {/* Remix Songs (Crossfade) */}
                    <div className="bg-zinc-900/30 border border-blue-500/20 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700"></div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${crossfadeConfig.isEnabled ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10' : 'bg-zinc-800 text-zinc-600'}`}>
                                    <Zap size={28} className={crossfadeConfig.isEnabled ? 'fill-blue-500/20' : ''} />
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-2xl tracking-tight">Remix Songs</h3>
                                    <p className="text-sm text-gray-400 mt-1">Seamlessly fade between tracks</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleCrossfadeChange('isEnabled', !crossfadeConfig.isEnabled)}
                                className={`w-16 h-9 rounded-full p-1.5 transition-all duration-500 ${crossfadeConfig.isEnabled ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-zinc-800'}`}
                            >
                                <div className={`w-6 h-6 rounded-full bg-white shadow-xl transform transition-transform duration-500 ${crossfadeConfig.isEnabled ? (isRTL ? '-translate-x-7' : 'translate-x-7') : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className={`space-y-6 transition-all duration-500 ${crossfadeConfig.isEnabled ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-2 pointer-events-none'}`}>
                            <div className="h-px w-full bg-white/5"></div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm font-bold text-gray-300">
                                    <span>Fade Duration</span>
                                    <span className="text-blue-400 font-mono bg-blue-500/10 px-3 py-1 rounded-lg">{crossfadeConfig.duration}s</span>
                                </div>
                                
                                <div className="relative h-12 w-full flex items-center">
                                    <div className="absolute w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-500" 
                                            style={{ width: `${((crossfadeConfig.duration - 1) / 4) * 100}%` }}
                                        ></div>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="5" 
                                        step="0.5" 
                                        value={crossfadeConfig.duration} 
                                        onChange={(e) => handleCrossfadeChange('duration', parseFloat(e.target.value))}
                                        className="absolute w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div 
                                        className="absolute w-6 h-6 bg-white rounded-full shadow-lg shadow-black/50 border-2 border-blue-500 pointer-events-none transition-all duration-75"
                                        style={{ left: `calc(${((crossfadeConfig.duration - 1) / 4) * 100}% - 12px)` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-zinc-600 font-mono font-bold">
                                    <span>1s (FAST)</span>
                                    <span>5s (SMOOTH)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-zinc-900/20 rounded-3xl border border-white/5 text-center">
                        <p className="text-xs text-zinc-500 leading-relaxed italic">
                            "Remix Songs" creates a professional radio-style transition. <br/>
                            The next song will start fading in while the current one fades out.
                        </p>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default MusicPlayerSettingsModal;
