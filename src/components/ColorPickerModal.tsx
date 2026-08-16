
import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Pipette } from 'lucide-react';
import { isValidHexColor } from '../utils/colorUtils';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  onSelect: (color: string) => void;
  title?: string;
}

const NEON_PRESETS = [
  '#ef4444', // Red
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#eab308', // Yellow
  '#f97316', // Orange
];

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({ isOpen, onClose, currentColor, onSelect, title = "Color Architect" }) => {
  const [hex, setHex] = useState(currentColor);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [brightness, setBrightness] = useState(50);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Convert Hex to HSB on open
  useEffect(() => {
    if (isOpen) {
      setHex(currentColor);
      // Simplified conversion logic or just reset based on hex if needed.
      // For simplicity, we just sync hex. Calculating HSB from Hex accurately is complex for initialization 
      // without a library, but we can infer Hue if we assume strong colors.
    }
  }, [isOpen, currentColor]);

  // Update Hex when HSB changes
  useEffect(() => {
    // This is a simple visual sync. In a real app we would use tinycolor2 or colord.
    // Here we mainly rely on the canvas interaction to drive the 'hex' value.
  }, [hue, saturation, brightness]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    updateColorFromCanvas(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      updateColorFromCanvas(e);
    }
  };

  const handleCanvasMouseUp = () => {
    isDragging.current = false;
  };

  const updateColorFromCanvas = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height);
    
    const s = Math.round((x / rect.width) * 100);
    const b = Math.round(100 - (y / rect.height) * 100);
    
    setSaturation(s);
    setBrightness(b);
    
    // Calculate RGB from HSB manually
    const c = hsbToHex(hue, s, b);
    setHex(c);
  };

  // Helper: HSB to Hex
  const hsbToHex = (h: number, s: number, b: number) => {
    s /= 100;
    b /= 100;
    const k = (n: number) => (n + h / 60) % 6;
    const f = (n: number) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    const toHex = (n: number) => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const h = parseInt(e.target.value);
    setHue(h);
    const c = hsbToHex(h, saturation, brightness);
    setHex(c);
  };

  if (!isOpen) return null;

  const validHex = isValidHexColor(hex) ? hex : currentColor;

  const handleApply = () => {
    if (!isValidHexColor(hex)) return;
    onSelect(hex);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onMouseUp={handleCanvasMouseUp}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}></div>
      
      <div className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl animate-slide-up overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Pipette size={18} className="text-primary" />
            {title}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Color Canvas (Sat/Bright) */}
          <div 
             ref={canvasRef}
             onMouseDown={handleCanvasMouseDown}
             onMouseMove={handleCanvasMouseMove}
             className="w-full h-48 rounded-2xl cursor-crosshair relative shadow-inner overflow-hidden"
             style={{
                backgroundColor: `hsl(${hue}, 100%, 50%)`,
                backgroundImage: `
                   linear-gradient(to top, #000, transparent), 
                   linear-gradient(to right, #fff, transparent)
                `
             }}
          >
<div 
                className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ 
                   left: `${saturation}%`, 
                   top: `${100 - brightness}%`,
                   backgroundColor: validHex
                }}
              ></div>
          </div>

          {/* Hue Slider */}
          <div className="space-y-2">
             <div className="flex justify-between px-1">
                <span className="text-[10px] font-black text-zinc-500 uppercase">Hue Spectrum</span>
             </div>
             <input 
                type="range" 
                min="0" max="360" 
                value={hue} 
                onChange={handleHueChange}
                className="w-full h-4 rounded-full appearance-none cursor-pointer border border-white/10 shadow-inner"
                style={{
                    background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                }}
             />
          </div>

          {/* Hex Input & Preview */}
          <div className="flex gap-4 items-center">
             <div className="flex-1 bg-zinc-900 rounded-xl px-4 py-3 flex items-center border border-white/5">
                <span className="text-zinc-500 mr-2">#</span>
                <input 
                   type="text" 
                   value={hex.replace('#', '')} 
                   onChange={(e) => setHex(`#${e.target.value}`)}
                   className="bg-transparent border-none outline-none text-white font-mono uppercase w-full"
                   maxLength={6}
                />
             </div>
<div 
                className="w-12 h-12 rounded-xl border border-white/10 shadow-lg"
                style={{ backgroundColor: validHex }}
              ></div>
          </div>

          {/* Presets */}
          <div className="space-y-3">
             <span className="text-[10px] font-black text-zinc-500 uppercase px-1">Quick Presets</span>
             <div className="grid grid-cols-8 gap-2">
                {NEON_PRESETS.map(color => (
                    <button
                        key={color}
                        onClick={() => { setHex(color); setHue(0); /* Resetting Hue is simplified here */ }}
                        className={`group relative h-8 rounded-lg transition-all ${hex.toLowerCase() === color.toLowerCase() ? 'scale-110 ring-2 ring-white' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                        style={{ backgroundColor: color }}
                    >
                    </button>
                ))}
             </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5 flex gap-3">
            <button 
                onClick={onClose}
                className="flex-1 py-3 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
            >
                CANCEL
            </button>
            <button 
                onClick={handleApply}
                className="flex-[2] py-3 bg-white text-black font-black rounded-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-xl"
            >
                APPLY COLOR
            </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPickerModal;
