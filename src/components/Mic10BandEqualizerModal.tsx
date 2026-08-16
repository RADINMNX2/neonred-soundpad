import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, RotateCcw, Sparkles, Mic2, Radio, Zap, ShieldAlert, Volume2, SlidersHorizontal, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Mic10BandEqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gains: number[]; // 10 gain values (-12 to +12 dB)
  onChange: (newGains: number[]) => void;
}

export const FREQUENCIES = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const FREQ_LABELS = ['31Hz', '63Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];

export const PRESETS = [
  {
    id: 'clarity',
    icon: Sparkles,
    nameKey: 'presetVocalClarity',
    color: 'from-red-500 to-amber-500',
    gains: [-6, -4, -2, -3, 1, 3, 5, 4, 2, 1]
  },
  {
    id: 'radio',
    icon: Radio,
    nameKey: 'presetRadioBroadcast',
    color: 'from-purple-500 to-pink-500',
    gains: [-4, 2, 4, 2, -1, 1, 3, 5, 3, 2]
  },
  {
    id: 'deesser',
    icon: ShieldAlert,
    nameKey: 'presetDeEsser',
    color: 'from-blue-500 to-cyan-500',
    gains: [-2, 0, 1, 0, 0, 1, 0, -5, -6, -3]
  },
  {
    id: 'deep',
    icon: Mic2,
    nameKey: 'presetDeepVoice',
    color: 'from-emerald-500 to-teal-500',
    gains: [2, 5, 6, 3, 0, -1, 1, 2, 1, 0]
  },
  {
    id: 'gamer',
    icon: Zap,
    nameKey: 'presetDiscordGamer',
    color: 'from-orange-500 to-red-500',
    gains: [-8, -5, -2, -1, 2, 4, 4, 3, 2, 0]
  },
  {
    id: 'flat',
    icon: SlidersHorizontal,
    nameKey: 'presetFlat',
    color: 'from-zinc-500 to-zinc-400',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  }
];

const Mic10BandEqualizerModal: React.FC<Mic10BandEqualizerModalProps> = ({
  isOpen,
  onClose,
  gains,
  onChange
}) => {
  const { t, isRTL } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Ensure gains array has length 10
  const fallbackGains = useMemo(() => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], []);
  const currentGains = gains && gains.length === 10 ? gains : fallbackGains;

  const handleGainChange = (index: number, val: number) => {
    const updated = [...currentGains];
    updated[index] = val;
    setActivePreset(null);
    onChange(updated);
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.id);
    onChange([...preset.gains]);
  };

  const handleReset = () => {
    setActivePreset('flat');
    onChange([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  };

  // Draw response curve on HTML5 Canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Draw Grid Lines (-12dB, -6dB, 0dB, +6dB, +12dB)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const levels = [-12, -6, 0, 6, 12];
    levels.forEach(level => {
      const y = height / 2 - (level / 12) * (height * 0.4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      if (level === 0) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)'; // Red center line
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      }
    });

    // Map 10 points to X & Y coords
    const points = currentGains.map((g, i) => {
      const x = (i / (currentGains.length - 1)) * (width - 60) + 30;
      const y = height / 2 - (g / 12) * (height * 0.4);
      return { x, y };
    });

    // Draw Curve smooth Bezier
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

    // Stroke line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Fill gradient under curve
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.lineTo(points[0].x, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 0;
    ctx.fill();

    // Draw Nodes
    points.forEach((p, idx) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = currentGains[idx] !== 0 ? '#ef4444' : '#a1a1aa';
      ctx.shadowColor = 'rgba(239, 68, 68, 1)';
      ctx.shadowBlur = 8;
      ctx.fill();
    });

  }, [isOpen, currentGains]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose} 
      />

      {/* Main Container */}
      <div className="relative bg-zinc-950 border border-red-500/20 rounded-3xl w-full max-w-5xl shadow-2xl shadow-red-950/50 animate-slide-up overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Glowing Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-white/10 bg-zinc-900/60 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 shadow-inner">
              <Mic2 size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-persian flex items-center gap-2">
                {t('micEq10BandTitle')}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono border border-red-500/30">
                  DSP PRO 10-BAND
                </span>
              </h2>
              <p className="text-xs text-zinc-400">{t('micEq10BandDesc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition-all active:scale-95 shadow-md"
              title={t('resetEq')}
            >
              <RotateCcw size={14} />
              {t('resetEq')}
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Presets Bar */}
        <div className="px-6 py-3 bg-zinc-900/40 border-b border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono mr-2 flex items-center gap-1">
            <Sparkles size={13} className="text-amber-400" />
            {t('presets')}:
          </span>
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`
                  flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 border
                  ${isSelected 
                    ? `bg-gradient-to-r ${preset.color} text-white border-transparent shadow-lg shadow-red-950/50 ring-2 ring-red-500/40` 
                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-white/10 hover:border-white/20'
                  }
                `}
              >
                <Icon size={14} />
                {t(preset.nameKey as any) || preset.nameKey}
              </button>
            );
          })}
        </div>

        {/* Response Curve Display */}
        <div className="relative px-6 pt-4 pb-2 bg-black/40 border-b border-white/5">
          <canvas 
            ref={canvasRef} 
            className="w-full h-28 rounded-2xl bg-zinc-950/80 border border-white/5 shadow-inner"
          />
        </div>

        {/* 10-Band Sliders Area */}
        <div className="p-6 bg-black/30 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center gap-2 min-h-[220px]">
            {currentGains.map((gain, idx) => (
              <div key={idx} className="flex flex-col items-center h-full flex-1 group">
                
                {/* dB Readout */}
                <div className="h-7 mb-2 flex items-center justify-center">
                  <span className={`text-[11px] font-mono font-bold transition-all px-1.5 py-0.5 rounded-md ${
                    gain > 0 
                      ? 'text-red-400 bg-red-500/10 border border-red-500/20' 
                      : gain < 0 
                      ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20' 
                      : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}>
                    {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}dB
                  </span>
                </div>

                {/* Slider Container */}
                <div className="relative flex-1 w-full flex justify-center items-center py-2">
                  {/* Background Track Line */}
                  <div className="absolute h-full w-1 bg-zinc-800/80 rounded-full group-hover:bg-zinc-700 transition-colors" />

                  {/* Active Fill Line */}
                  <div 
                    className="absolute w-1 rounded-full bg-gradient-to-t from-red-600 to-amber-400 transition-all pointer-events-none"
                    style={{
                      bottom: '50%',
                      height: gain >= 0 ? `${(gain / 12) * 50}%` : '0%',
                    }}
                  />
                  <div 
                    className="absolute w-1 rounded-full bg-gradient-to-b from-cyan-500 to-blue-600 transition-all pointer-events-none"
                    style={{
                      top: '50%',
                      height: gain < 0 ? `${(Math.abs(gain) / 12) * 50}%` : '0%',
                    }}
                  />

                  {/* Vertical Range Slider */}
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={gain}
                    onDoubleClick={() => handleGainChange(idx, 0)}
                    onChange={(e) => handleGainChange(idx, parseFloat(e.target.value))}
                    className="
                      absolute -rotate-90 
                      w-40 h-3 bg-transparent appearance-none cursor-pointer 
                      focus:outline-none z-10
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-gradient-to-r
                      [&::-webkit-slider-thumb]:from-red-500
                      [&::-webkit-slider-thumb]:to-amber-500
                      [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(239,68,68,0.8)]
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-white
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-webkit-slider-thumb]:hover:scale-125
                      [&::-webkit-slider-thumb]:active:scale-130
                    "
                    title={`Double click to reset ${FREQ_LABELS[idx]}`}
                  />
                </div>

                {/* Frequency Label */}
                <div className="mt-3 text-center">
                  <span className="text-[11px] font-mono font-bold text-zinc-400 group-hover:text-white transition-colors block">
                    {FREQ_LABELS[idx]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-zinc-900/60 border-t border-white/10 flex justify-between items-center">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Real-time Mic Audio DSP Processing Active</span>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-red-950/40 active:scale-95 transition-all text-sm"
          >
            <Check size={18} />
            {t('save')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Mic10BandEqualizerModal;
