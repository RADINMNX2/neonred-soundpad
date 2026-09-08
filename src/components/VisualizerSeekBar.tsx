import React, { useEffect, useRef, useState, memo } from 'react';

interface VisualizerSeekBarProps {
  waveform: number[] | null;
  color: string;
  currentTime: number;
  duration: number;
  trackKey?: string | number;
  onSeek?: (seconds: number) => void;
}

const FLAT: number[] = Array.from({ length: 40 }, () => 0.05);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Static waveform seek bar: renders a per-song shape (never reacts to live audio),
// morphs smoothly between tracks and shows playback progress with a glowing sweep.
const VisualizerSeekBar: React.FC<VisualizerSeekBarProps> = memo(({
  waveform,
  color,
  currentTime,
  duration,
  trackKey,
  onSeek,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef({ currentTime, duration });
  timeRef.current = { currentTime, duration };
  const onSeekRef = useRef(onSeek);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
  const dragging = useRef(false);

  // Morph animation state: fade 0â†’1 interpolates the previous track's shape into the new one.
  const [fade, setFade] = useState(1);
  const lastWaveRef = useRef<number[] | null>(null);

  const targetWave = waveform && waveform.length > 0 ? waveform : null;
  const animeKey = `${String(trackKey === undefined || trackKey === null ? 'none' : trackKey)}|${targetWave ? targetWave.length : 'flat'}`;
  const animeKeyRef = useRef<string>(animeKey);

  useEffect(() => {
    if (animeKeyRef.current === animeKey) return;
    animeKeyRef.current = animeKey;
    setFade(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const f = Math.min(1, (now - start) / 420);
      setFade(f);
      if (f < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animeKey]);

  useEffect(() => {
    if (fade >= 1 && targetWave) lastWaveRef.current = targetWave;
  }, [fade, targetWave]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = wrap.clientWidth;
    let cssH = wrap.clientHeight;

    const resize = () => {
      cssW = wrap.clientWidth;
      cssH = wrap.clientHeight;
      if (cssW < 4 || cssH < 4) return;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
      const n = parseInt(full, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    let rgb = hexToRgb(color);
    let col = color;
    let baseGrad: CanvasGradient | null = null;
    const rebuildGrads = () => {
      if (color === col && baseGrad) return;
      col = color;
      rgb = hexToRgb(color);
      const h = Math.max(1, cssH);
      baseGrad = ctx.createLinearGradient(0, h, 0, 0);
      baseGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`);
      baseGrad.addColorStop(0.6, color);
      baseGrad.addColorStop(1, `rgba(${Math.min(255, rgb.r + 130)},${Math.min(255, rgb.g + 130)},${Math.min(255, rgb.b + 130)},0.95)`);
    };
    rebuildGrads();

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      if (w <= 0 || h <= 0) return;
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

    const draw = () => {
      if (cssW < 4 || cssH < 4) return;
      rebuildGrads();
      ctx.clearRect(0, 0, cssW, cssH);

      const { currentTime: ct, duration: du } = timeRef.current;
      const progress = Number.isFinite(du) && du > 0 ? clamp01(ct / du) : 0;

      const n = targetWave ? targetWave.length : FLAT.length;
      const from = lastWaveRef.current;
      const slotW = cssW / n;
      const bw = Math.max(1.5, slotW - 2.5);
      const radius = Math.min(bw / 2, 3.5);
      const playedIdx = progress * n;
      const e = smoothstep(fade);

      // Interpolate old shape â†’ new shape while fading.
      const heights: number[] = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        const prev = from && from.length > 0 ? from[i] : null;
        const next = targetWave ? targetWave[i] : FLAT[i] || 0;
        heights[i] = from && from.length > 0 ? lerp(prev as number, next, e) : next * fade;
      }

      // Unplayed columns â€” dim ghost bars.
      for (let i = 0; i < n; i++) {
        if (i + 0.6 <= playedIdx) continue;
        const x = i * slotW + slotW / 2 - bw / 2;
        const h = Math.max(2, heights[i] * cssH * 0.94);
        ctx.fillStyle = 'rgba(255,255,255,0.11)';
        roundRect(x, cssH - h, bw, h, radius);
        ctx.fill();
      }

      // Soft shimmer sweeping across during the track-change morph.
      if (fade < 1) {
        const gx = progress * cssW;
        const gg = ctx.createLinearGradient(gx - 120, 0, gx, 0);
        gg.addColorStop(0, 'rgba(255,255,255,0)');
        gg.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`);
        gg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(0, cssH * 0.22, cssW, cssH * 0.56);
      }

      // Played columns â€” full color bars with a white peak cap.
      for (let i = 0; i < n; i++) {
        if (i + 0.6 > playedIdx) break;
        const x = i * slotW + slotW / 2 - bw / 2;
        const h = Math.max(2, heights[i] * cssH * 0.94);
        ctx.fillStyle = baseGrad!;
        roundRect(x, cssH - h, bw, h, radius);
        ctx.fill();
        if (heights[i] > 0.06 && h > 5) {
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          roundRect(x, cssH - h - 2, bw, 2.5, 1.25);
          ctx.fill();
        }
      }

      // Playhead glow.
      if (progress > 0 && progress < 1) {
        const px = progress * cssW;
        const pg = ctx.createLinearGradient(px - 18, 0, px + 18, 0);
        pg.addColorStop(0, 'rgba(255,255,255,0)');
        pg.addColorStop(0.5, 'rgba(255,255,255,0.4)');
        pg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = pg;
        ctx.fillRect(px - 18, 3, 36, cssH - 6);
      }
    };
    draw();

    // Redraw whenever timeline props move (cheap, ~80 bars) â€” no live audio input.
    const iv = window.setInterval(draw, 120);
    return () => {
      window.clearInterval(iv);
      ro.disconnect();
    };
  }, [color, fade]);

  const seekFromClientX = (clientX: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const { duration: d } = timeRef.current;
    if (!Number.isFinite(d) || d <= 0) return;
    const p = clamp01((clientX - rect.left) / rect.width);
    onSeekRef.current?.(p * d);
  };

  const stepSeek = (delta: number) => {
    const { currentTime: ct, duration: d } = timeRef.current;
    if (!Number.isFinite(d) || d <= 0) return;
    onSeekRef.current?.(Math.max(0, Math.min(d, ct + delta)));
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-14 cursor-pointer select-none"
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration || 0)}
      aria-valuenow={Math.round(currentTime)}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
        seekFromClientX(e.clientX);
      }}
      onPointerMove={(e) => { if (dragging.current) seekFromClientX(e.clientX); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') stepSeek(5);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') stepSeek(-5);
        else if (e.key === 'Home') onSeekRef.current?.(0);
        else if (e.key === 'End') { const d = timeRef.current.duration; if (Number.isFinite(d) && d > 0) onSeekRef.current?.(d); }
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
});

export default VisualizerSeekBar;