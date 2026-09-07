import React, { useRef, useState } from 'react';

interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  color?: string;
}

const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const VolumeSlider: React.FC<VolumeSliderProps> = ({ value, onChange, color = '#ec4899' }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const rgb = hexToRgb(color);
  const glow = `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`;
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onChange(Math.round(v * 100) / 100);
  };

  return (
    <div
      ref={trackRef}
      className="relative flex-1 h-6 flex items-center group cursor-pointer select-none"
      role="slider"
      tabIndex={0}
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
        setDragging(true);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => { if (dragging) setFromClientX(e.clientX); }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => { setHovering(false); setDragging(false); }}
      onKeyDown={(e) => {
        const next = (v: number) => onChange(Math.max(0, Math.min(1, v)));
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next(valueRef.current + 0.05);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next(valueRef.current - 0.05);
      }}
    >
      {/* Ambient glow behind the bar when hovering / dragging */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-opacity duration-300"
        style={{
          height: 18,
          opacity: hovering || dragging ? 1 : 0,
          boxShadow: `0 0 24px 2px ${glow}`,
          background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`,
        }}
      />

      {/* Track */}
      <div className="relative flex-1 h-1.5 rounded-full bg-zinc-700/70 transition-all duration-300 group-hover:h-2">
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${color} 55%, #ffffff)`,
            boxShadow: pct > 0 ? `0 0 12px ${glow}` : undefined,
            transition: dragging ? 'width 60ms linear' : 'width 220ms cubic-bezier(.34,1.56,.64,1)',
          }}
        />
      </div>

      {/* Thumb */}
      <div
        className="absolute top-1/2 rounded-full bg-white pointer-events-none"
        style={{
          left: `${pct}%`,
          width: 13,
          height: 13,
          transform: `translate(-50%, -50%) scale(${hovering || dragging ? 1.3 : 1})`,
          transition: 'transform 220ms cubic-bezier(.34,1.56,.64,1), box-shadow 200ms',
          boxShadow: `0 0 0 4px ${glow}, 0 2px 10px rgba(0,0,0,0.5)`,
        }}
      />
    </div>
  );
};

export default VolumeSlider;