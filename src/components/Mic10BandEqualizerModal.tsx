import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, RotateCcw, Sparkles, Mic2, Radio, Zap, ShieldAlert, SlidersHorizontal, Check, Activity, Minus, Plus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Mic10BandEqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gains: number[];
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
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstPresetRef = useRef<HTMLButtonElement | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const initialGainsRef = useRef<number[]>(gains);

  const fallbackGains = useMemo(() => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], []);
  const currentGains = gains && gains.length === 10 ? gains : fallbackGains;

  const isDirty = useMemo(() => currentGains.some((g, i) => Math.abs(g - (initialGainsRef.current[i] ?? 0)) > 1e-9), [currentGains]);

  useEffect(() => {
    if (!isOpen) return;
    initialGainsRef.current = gains && gains.length === 10 ? gains : fallbackGains;
    const match = PRESETS.find(p => JSON.stringify(p.gains) === JSON.stringify(currentGains));
    setActivePreset(match ? match.id : null);
    setDragIndex(null);
    setFocusedIndex(null);
    setClosing(false);
    const focusTimer = window.setTimeout(() => firstPresetRef.current?.focus({ preventScroll: true }), 350);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isDirty]);

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => onClose(), 180);
  }, [closing, onClose]);

  const handleCancel = () => {
    onChange([...initialGainsRef.current]);
    setActivePreset(null);
    handleClose();
  };

  const handleSave = () => {
    handleClose();
  };

  const stats = useMemo(() => {
    const list = currentGains.length === 10 ? currentGains : fallbackGains;
    const peak = list.reduce((m, g) => (Math.abs(g) > Math.abs(m) ? g : m), 0);
    const avg = list.reduce((s, g) => s + g, 0) / list.length;
    const lowAvg = list.slice(0, 4).reduce((s, g) => s + g, 0) / 4;
    const highAvg = list.slice(5).reduce((s, g) => s + g, 0) / 5;
    const tilt = highAvg - lowAvg;
    return { peak, avg, character: tilt > 2.5 ? 'Bright' : tilt < -2.5 ? 'Deep' : 'Neutral' };
  }, [currentGains, fallbackGains]);

  const statChips = [
    {
      label: 'PEAK',
      value: `${stats.peak > 0 ? '+' : ''}${stats.peak.toFixed(1)}dB`,
      cls: stats.peak > 0 ? 'text-red-400' : stats.peak < 0 ? 'text-cyan-400' : 'text-zinc-300'
    },
    {
      label: 'AVG',
      value: `${stats.avg > 0 ? '+' : ''}${stats.avg.toFixed(1)}dB`,
      cls: stats.avg > 0 ? 'text-red-400' : stats.avg < 0 ? 'text-cyan-400' : 'text-zinc-300'
    },
    {
      label: 'CHAR',
      value: stats.character.toUpperCase(),
      cls: stats.character === 'Bright' ? 'text-amber-400' : stats.character === 'Deep' ? 'text-blue-400' : 'text-zinc-300'
    }
  ];

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

  const gradientRef = useRef<{ width: number; stroke: CanvasGradient | null; fill: CanvasGradient | null }>({ width: 0, stroke: null, fill: null });

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width <= 0 || height <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, width, height);

      ctx.font = '10px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const levels = [-12, -6, 0, 6, 12];
      levels.forEach(level => {
        const y = height / 2 - (level / 12) * (height * 0.4);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        if (level === 0) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        ctx.fillStyle = level === 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(255, 255, 255, 0.3)';
        ctx.fillText(`${level > 0 ? '+' : ''}${level}`, 6, y + 2);
      });

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      for (let i = 0; i < FREQUENCIES.length; i++) {
        const x = (i / (FREQUENCIES.length - 1)) * (width - 60) + 30;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      const points = currentGains.map((g, i) => {
        const x = (i / (currentGains.length - 1)) * (width - 60) + 30;
        const y = height / 2 - (g / 12) * (height * 0.4);
        return { x, y };
      });

      const tracePath = () => {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      };

      ctx.lineCap = 'round';
      tracePath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 9;
      ctx.stroke();

      if (gradientRef.current.width !== width) {
        const strokeGrad = ctx.createLinearGradient(0, 0, width, 0);
        strokeGrad.addColorStop(0, '#f87171');
        strokeGrad.addColorStop(0.5, '#ef4444');
        strokeGrad.addColorStop(1, '#fbbf24');
        const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
        fillGrad.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        fillGrad.addColorStop(0.55, 'rgba(251, 191, 36, 0.08)');
        fillGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        gradientRef.current = { width, stroke: strokeGrad, fill: fillGrad };
      }

      tracePath();
      ctx.strokeStyle = gradientRef.current.stroke || '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(239, 68, 68, 0.85)';
      ctx.shadowBlur = 14;
      ctx.stroke();

      ctx.lineTo(points[points.length - 1].x, height);
      ctx.lineTo(points[0].x, height);
      ctx.closePath();
      ctx.fillStyle = gradientRef.current.fill || 'rgba(239, 68, 68, 0.3)';
      ctx.shadowBlur = 0;
      ctx.fill();

      points.forEach((p, idx) => {
        const active = currentGains[idx] !== 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = active ? 'rgba(239, 68, 68, 0.22)' : 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        if (dragIndex === idx || focusedIndex === idx) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#f87171' : '#a1a1aa';
        ctx.shadowColor = active ? 'rgba(239, 68, 68, 1)' : 'transparent';
        ctx.shadowBlur = active ? 10 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      raf = 0;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, currentGains, dragIndex, focusedIndex]);

  const handleCanvasDoubleClick = () => {
    handleReset();
  };

  if (!isOpen) return null;

  const handleFocusTrapKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>('button, input[type="range"]');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 select-none">
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={handleClose}
      />

      <div className="pointer-events-none absolute top-[10%] right-[6%] w-72 h-72 rounded-full bg-red-600/15 blur-[100px] animate-pulse-slow" />
      <div className="pointer-events-none absolute bottom-[8%] left-[5%] w-72 h-72 rounded-full bg-amber-500/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '1.2s' }} />

      <div
        ref={panelRef}
        onKeyDown={handleFocusTrapKey}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mic-eq-title"
        className={`relative bg-zinc-950 border border-red-500/20 rounded-3xl w-full max-w-4xl shadow-2xl shadow-red-950/50 animate-slide-up overflow-hidden flex flex-col max-h-[90vh] will-change-transform ${closing ? 'animate-modal-out' : ''}`}
      >

        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 z-10" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-400/50 to-transparent blur-sm z-10" />

        <div className="relative px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10 bg-zinc-900/60 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute -inset-1.5 rounded-2xl bg-red-500/20 blur-lg animate-pulse-slow" />
              <div className="absolute inset-0 rounded-2xl border border-dashed border-red-500/40 animate-[ring-spin_12s_linear_infinite]" />
              <div className="relative p-2.5 bg-gradient-to-br from-red-600/25 to-amber-500/10 border border-red-500/40 rounded-2xl text-red-400 shadow-inner shadow-red-950/60">
                <Mic2 size={24} />
              </div>
            </div>
            <div className="min-w-0">
              <h2 id="mic-eq-title" className="text-lg sm:text-xl font-bold text-white font-persian flex items-center gap-2 flex-wrap">
                {t('micEq10BandTitle')}
                <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 font-mono border border-red-500/30 tracking-widest animate-pulse-slow whitespace-nowrap">
                  DSP PRO 10-BAND
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate">{t('micEq10BandDesc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReset}
              title={t('resetEq')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition-all duration-200 active:scale-95 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">{t('resetEq')}</span>
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 bg-zinc-900/40 border-b border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5 shrink-0">
            <Sparkles size={13} className="text-amber-400" />
            {t('presets')}
          </span>
          <div className="h-4 w-px bg-white/10 shrink-0" />
          <div className="flex items-center gap-2">
            {PRESETS.map((preset, pIdx) => {
              const Icon = preset.icon;
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  ref={pIdx === 0 ? firstPresetRef : undefined}
                  onClick={() => handleApplyPreset(preset)}
                  className={`
                    relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 border hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60
                    ${isSelected
                      ? `bg-gradient-to-r ${preset.color} text-white border-transparent shadow-lg shadow-red-950/50 ring-2 ring-red-500/40`
                      : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10 hover:border-white/25 backdrop-blur-sm'
                    }
                  `}
                >
                  <Icon size={14} className={`transition-transform duration-200 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`} />
                  {t(preset.nameKey as any) || preset.nameKey}
                  {isSelected && (
                    <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/25">
                      <Check size={9} strokeWidth={4} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative px-4 sm:px-6 pt-3 sm:pt-4 pb-3 bg-black/40 border-b border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-widest flex items-center gap-1.5">
              <Activity size={12} className="text-red-500" />
              {t('micEqResponseCurve')}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 tracking-widest">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              {t('micEqLive')}
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl">
            <canvas
              ref={canvasRef}
              onDoubleClick={handleCanvasDoubleClick}
              title={t('resetEq')}
              className="w-full h-28 rounded-2xl bg-zinc-950/80 border border-white/5 shadow-inner cursor-pointer"
            />
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-red-500/10 to-transparent animate-[eq-scan_5s_ease-in-out_infinite]" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
            <div className="flex items-center gap-1.5">
              {statChips.map((chip) => (
                <div key={chip.label} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/80 border border-white/10 font-mono">
                  <span className="text-[10px] tracking-widest text-zinc-400">{chip.label}</span>
                  <span className={`text-[10px] font-bold ${chip.cls}`}>{chip.value}</span>
                </div>
              ))}
            </div>
            <span className="text-[10px] font-mono text-zinc-400 tracking-wider hidden sm:inline-flex items-center gap-2" dir="ltr">
              <span>{t('micEqAxisDown')}</span>
              <span>{t('micEqAxisUp')}</span>
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-black/30 flex-1 overflow-y-auto">
          <div dir="ltr" className="flex justify-between items-stretch gap-1 sm:gap-2 h-64 md:h-72">
            {currentGains.map((gain, idx) => {
              const pct = ((gain + 12) / 24) * 100;
              const isDragging = dragIndex === idx;
              const isFocused = focusedIndex === idx;
              return (
                <div key={idx} className="flex flex-col items-center h-full flex-1 group min-w-0 animate-[eq-column-in_0.4s_ease-out_both]" style={{ animationDelay: `${idx * 30}ms` }}>

                  <div className="h-7 mb-2 flex items-center justify-center">
                    <span className={`text-[11px] font-mono font-bold transition-colors duration-150 px-1.5 py-0.5 rounded-md ${
                      gain > 0
                        ? 'text-red-400 bg-red-500/10 border border-red-500/20'
                        : gain < 0
                        ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                        : 'text-zinc-400 group-hover:text-zinc-200'
                    } ${isDragging || isFocused ? 'scale-110 shadow-[0_0_10px_rgba(239,68,68,0.35)]' : ''}`}>
                      {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}dB
                    </span>
                  </div>

                  <div className="relative flex-1 w-full flex justify-center items-center py-4 min-h-0">
                    <div className="absolute h-full w-[1.5px] bg-zinc-800/90 rounded-full group-hover:bg-zinc-700 transition-colors" />
                    <div
                      className="absolute w-3 h-[2px] bg-zinc-600/80 rounded-full group-hover:bg-red-500/50 transition-colors"
                      style={{ top: 'calc(50% - 1px)' }}
                    />
                    <div
                      className="absolute w-[1.5px] rounded-full bg-gradient-to-t from-red-600 to-amber-400 shadow-[0_0_6px_rgba(239,68,68,0.7)] group-hover:shadow-[0_0_10px_rgba(239,68,68,0.9)] transition-colors pointer-events-none"
                      style={{ bottom: '50%', height: gain >= 0 ? `${(gain / 12) * 50}%` : '0%' }}
                    />
                    <div
                      className="absolute w-[1.5px] rounded-full bg-gradient-to-b from-cyan-500 to-blue-600 shadow-[0_0_6px_rgba(34,211,238,0.6)] group-hover:shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-colors pointer-events-none"
                      style={{ top: '50%', height: gain < 0 ? `${(Math.abs(gain) / 12) * 50}%` : '0%' }}
                    />

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-40 pointer-events-none z-20">
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold text-white bg-gradient-to-r from-red-600 to-amber-600 border border-white/30 shadow-[0_0_12px_rgba(239,68,68,0.6)] whitespace-nowrap transition-all duration-150 ${isDragging ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                        style={{ bottom: `calc(${Math.min(pct, 84)}% + 12px)` }}
                      >
                        {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}dB
                      </div>
                    </div>

                    <input
                      type="range"
                      dir="ltr"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={gain}
                      aria-label={`${FREQ_LABELS[idx]} gain`}
                      aria-valuetext={`${gain.toFixed(1)} decibels`}
                      onDoubleClick={() => handleGainChange(idx, 0)}
                      onChange={(e) => handleGainChange(idx, parseFloat(e.target.value))}
                      onPointerDown={() => setDragIndex(idx)}
                      onPointerUp={() => setDragIndex(null)}
                      onPointerCancel={() => setDragIndex(null)}
                      onFocus={() => setFocusedIndex(idx)}
                      onBlur={() => { setDragIndex(null); setFocusedIndex(null); }}
                      className={`
                        absolute -rotate-90
                        w-40 h-3 bg-transparent appearance-none cursor-pointer
                        focus:outline-none z-10 ${isFocused ? 'slider-focused' : ''}
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-gradient-to-br
                        [&::-webkit-slider-thumb]:from-red-500
                        [&::-webkit-slider-thumb]:to-amber-500
                        [&::-webkit-slider-thumb]:border-2
                        [&::-webkit-slider-thumb]:border-white
                        [&::-webkit-slider-thumb]:shadow-[0_0_14px_rgba(239,68,68,0.9)]
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-125
                        [&::-webkit-slider-thumb]:active:scale-150
                        [&::-moz-range-thumb]:w-4
                        [&::-moz-range-thumb]:h-4
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:border-2
                        [&::-moz-range-thumb]:border-white
                        [&::-moz-range-thumb]:bg-gradient-to-br
                        [&::-moz-range-thumb]:from-red-500
                        [&::-moz-range-thumb]:to-amber-500
                        [&::-moz-range-thumb]:shadow-[0_0_14px_rgba(239,68,68,0.9)]
                      `}
                      title={`Double click to reset ${FREQ_LABELS[idx]}`}
                    />
                  </div>

                  <div className="mt-2 flex items-center gap-0.5">
                    <button
                      onClick={() => handleGainChange(idx, Math.max(-12, gain - 0.5))}
                      className="w-5 h-5 rounded-md bg-zinc-800/70 hover:bg-red-500/20 border border-white/10 text-zinc-400 hover:text-red-300 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 active:scale-90 transition-all duration-150"
                      aria-label={`Decrease ${FREQ_LABELS[idx]}`}
                    >
                      <Minus size={11} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => handleGainChange(idx, 0)}
                      className="flex flex-col items-center gap-0.5 cursor-pointer px-1.5 py-0.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                      title={`Reset ${FREQ_LABELS[idx]}`}
                    >
                      <span className="text-[10px] sm:text-[11px] font-mono font-bold text-zinc-400 group-hover:text-white hover:text-red-400 transition-colors">
                        {FREQ_LABELS[idx]}
                      </span>
                      <span className="h-[2px] w-4 rounded-full bg-red-500/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button
                      onClick={() => handleGainChange(idx, Math.min(12, gain + 0.5))}
                      className="w-5 h-5 rounded-md bg-zinc-800/70 hover:bg-red-500/20 border border-white/10 text-zinc-400 hover:text-red-300 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 active:scale-90 transition-all duration-150"
                      aria-label={`Increase ${FREQ_LABELS[idx]}`}
                    >
                      <Plus size={11} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-zinc-900/60 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex w-2 h-2 shrink-0">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] sm:text-xs text-zinc-400 truncate">{t('micEqDspActive')}</span>
            {isDirty && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px] font-mono font-bold text-amber-400 tracking-widest animate-pulse-slow shrink-0">
                {t('micEqUnsaved')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 text-zinc-300 hover:text-white font-bold rounded-xl transition-all duration-200 active:scale-95 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
            >
              <X size={16} />
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 text-white font-bold rounded-xl transition-all duration-200 active:scale-95 text-sm shadow-lg shadow-red-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 ${isDirty ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500' : 'bg-zinc-800 text-zinc-500 shadow-none opacity-60 pointer-events-none'}`}
            >
              <Check size={18} />
              {t('save')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Mic10BandEqualizerModal;