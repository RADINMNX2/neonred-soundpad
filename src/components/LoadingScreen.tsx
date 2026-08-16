import React, { useEffect, useMemo, useState } from 'react';
import { Activity } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const BARS = [0.55, 0.85, 1, 0.85, 0.55];
const BAR_DELAYS = [0, 120, 240, 120, 0];

const PHRASES = [
  { at: 0, text: 'INITIALIZING AUDIO ENGINE' },
  { at: 20, text: 'CALIBRATING EQ' },
  { at: 40, text: 'LOADING SAMPLE BANK' },
  { at: 60, text: 'WARMING UP TUBES' },
  { at: 80, text: 'ARMING PADS' },
  { at: 100, text: 'READY' },
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 100 : prev + 1));
    }, 30);
    return () => clearInterval(interval);
  }, [isComplete]);

  useEffect(() => {
    if (progress >= 100) setIsComplete(true);
  }, [progress]);

  useEffect(() => {
    if (!isComplete) return;
    const fadeTimer = window.setTimeout(() => setIsFading(true), 800);
    const completeTimer = window.setTimeout(onComplete, 1600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [isComplete, onComplete]);

  const phrase = useMemo(() => {
    let current = PHRASES[0];
    for (const p of PHRASES) {
      if (progress >= p.at) current = p;
    }
    return current;
  }, [progress]);

  const particles = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        left: 8 + ((i * 13 + 5) % 84),
        delay: i * 0.4,
        duration: 3 + (i % 3),
        cyan: i % 3 === 1,
      })),
    []
  );

  return (
    <>
      <div className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-all duration-1000 ${isFading ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08),transparent_65%)]"></div>

        {particles.map((p, i) => (
          <span
            key={i}
            className={`absolute w-1 h-1 rounded-full ${p.cyan ? 'bg-cyan-400/40' : 'bg-red-500/40'}`}
            style={{
              left: `${p.left}%`,
              bottom: '20%',
              animation: `particle-rise ${p.duration}s ease-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}

        <div className="relative z-10 flex flex-col items-center gap-10">
          <div className="flex items-center justify-center gap-16">
            <div className="hidden sm:block relative w-28 h-28 animate-[ring-spin_14s_linear_infinite]">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-zinc-800"></div>
              {Array.from({ length: 8 }, (_, i) => {
                const active = progress > (i + 1) * 12.5;
                return (
                  <span
                    key={i}
                    className={`absolute left-1/2 top-1/2 w-px h-3 ${active ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-zinc-700'}`}
                    style={{ transform: `rotate(${i * 45}deg) translateY(-44px)` }}
                  />
                );
              })}
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity size={22} className={`text-red-500/70 animate-pulse transition-opacity ${progress > 20 ? 'opacity-100' : 'opacity-40'}`} />
              </div>
            </div>

            <div className="flex items-end justify-center gap-2 h-24">
              {BARS.map((h, i) => {
                const locked = progress > (i + 1) * 20;
                return (
                  <div key={i} className="w-1.5 h-full flex items-end">
                    <div
                      className={`w-full rounded-full origin-bottom ${locked ? 'bg-red-400 shadow-[0_0_16px_#ef4444]' : 'bg-red-500/70 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-[audio-bounce_1.1s_ease-in-out_infinite]'}`}
                      style={{ height: `${h * 100}%`, animationDelay: locked ? undefined : `${BAR_DELAYS[i]}ms` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:block relative w-32 h-32">
              <div
                className="absolute inset-0 rounded-full border border-zinc-800 bg-[radial-gradient(circle,rgba(239,68,68,0.12),transparent_70%)]"
                style={{ opacity: 0.4 + (progress / 100) * 0.6 }}
              ></div>
              <div className="absolute inset-0 rounded-full animate-[halo-breathe_2.4s_ease-in-out_infinite]">
                <div className="absolute inset-3 rounded-full border border-dashed border-zinc-700/70 animate-[halo-spin-slow_22s_linear_infinite]"></div>
              </div>
              <div className="absolute inset-9 rounded-full border border-zinc-800/80"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_20px_#ef4444]"></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <span className="text-6xl font-black text-white font-mono tabular-nums tracking-tighter" style={{ textShadow: `0 0 ${10 + progress * 0.6}px #ef4444` }}>
              {progress}%
            </span>

            <p key={phrase.text} className="text-xs font-mono text-red-400 tracking-[0.35em] uppercase animate-[phrase-in_0.5s_ease-out_both]">
              {phrase.text}
              <span className="ml-1 text-cyan-400 animate-[cursor-blink_0.9s_steps(1)_infinite]">▍</span>
            </p>

            <div className="w-64 h-[3px] rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-red-500 shadow-[0_0_8px_#ff0000] transition-[width] duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
            </div>

            <p className="text-[10px] font-mono text-zinc-600 tracking-[0.5em] uppercase mt-2">NeonRed Soundpad</p>
          </div>
        </div>
      </div>

      {isFading && (
        <div className="fixed inset-0 z-[10000] bg-red-500 mix-blend-screen pointer-events-none animate-[exit-flash_0.6s_ease-out_forwards]"></div>
      )}
    </>
  );
};

export default LoadingScreen;