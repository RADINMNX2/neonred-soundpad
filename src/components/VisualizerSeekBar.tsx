import React, { useEffect, useRef, memo } from 'react';
import { VisualizerConfig } from '../types';

interface VisualizerSeekBarProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  color: string;
  config?: Partial<VisualizerConfig>;
  currentTime: number;
  duration: number;
  trackKey?: string | number;
  onSeek?: (seconds: number) => void;
}

interface VisState {
  L: number[];
  P: number[];
  fade: number;
  prevKey: string;
}

const VisualizerSeekBar: React.FC<VisualizerSeekBarProps> = memo(({
  analyser,
  isPlaying,
  color,
  config,
  currentTime,
  duration,
  trackKey,
  onSeek,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<VisState>({ L: [], P: [], fade: 1, prevKey: '' });
  const timeRef = useRef({ currentTime, duration });
  timeRef.current = { currentTime, duration };
  const onSeekRef = useRef(onSeek);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const draggingRef = useRef(false);

  const barCount = Math.max(16, Math.min(96, config?.barCount ?? 40));
  const sensitivity = config?.sensitivity ?? 1.5;

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

    const N = barCount;
    const st = stateRef.current;
    if (st.L.length !== N) {
      st.L = new Array(N).fill(0);
      st.P = new Array(N).fill(0);
      st.prevKey = '';
      st.fade = 1;
    }

    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const data = new Uint8Array(bufferLength);
    const B = analyser ? Math.floor(bufferLength * 0.72) : N;
    const span = Math.max(1, Math.round((B / N) * 0.55));
    const basis: { start: number; span: number; lift: number }[] = [];
    for (let i = 0; i < N; i++) {
      const tt = N === 1 ? 0 : i / (N - 1);
      const start = Math.max(0, Math.floor(Math.pow(tt, 1.4) * (B - span)));
      basis.push({ start, span, lift: 0.9 + 0.22 * Math.sin(tt * Math.PI) });
    }

    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
      const n = parseInt(full, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };

    let rgb = hexToRgb(color);
    let baseGrad: CanvasGradient | null = null;
    let lastColor = '';
    const rebuildGrads = () => {
      if (color === lastColor && baseGrad) return;
      lastColor = color;
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

    let last = performance.now();
    const KEY = String(trackKey === undefined || trackKey === null ? 'none' : trackKey);

    const frame = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;

      // Track-change morph: fade down and let the new song's spectrum rise in smoothly.
      if (st.prevKey !== KEY) {
        st.prevKey = KEY;
        st.fade = 0;
        st.L.fill(0);
        st.P.fill(0);
      }
      if (st.fade < 1) st.fade = Math.min(1, st.fade + dt / 380);

      // Live spectrum source.
      let source: Uint8Array | null = null;
      if (analyser && isPlayingRef.current && analyser.context.state === 'running') {
        analyser.getByteFrequencyData(data);
        source = data;
      }

      // Targets.
      const T: number[] = new Array(N).fill(0);
      if (source) {
        for (let i = 0; i < N; i++) {
          const b = basis[i];
          let sum = 0;
          for (let j = 0; j < b.span; j++) sum += source[b.start + j] || 0;
          const avg = (sum / b.span / 255) * sensitivity * b.lift;
          T[i] = Math.min(1.1, avg);
        }
      } else {
        // Calm idle waveform so the seek bar always stays alive ("static" visualizer).
        for (let i = 0; i < N; i++) {
          const tt = N === 1 ? 0 : i / (N - 1);
          const shape = 0.05 + 0.04 * Math.sin(tt * Math.PI * 2.5 + 0.6) * (0.55 + 0.45 * Math.sin(tt * 5.3 + 1.1));
          const breathe = 0.45 + 0.55 * Math.abs(Math.sin(now / 2100 + tt * 2.2));
          T[i] = shape * breathe;
        }
      }

      // Smoothing: fast attack, silky fall.
      for (let i = 0; i < N; i++) {
        const target = T[i] * st.fade;
        const tau = target > st.L[i] ? 0.05 : 0.18;
        st.L[i] += (target - st.L[i]) * (1 - Math.exp(-dt / 1000 / tau));
        const decay = (45 + st.P[i] * 0.3) * dt / 1000;
        st.P[i] = Math.max(st.L[i], st.P[i] - decay);
      }

      if (cssW < 4 || cssH < 4) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      rebuildGrads();

      ctx.clearRect(0, 0, cssW, cssH);
      const { currentTime: ct, duration: du } = timeRef.current;
      const progress = Number.isFinite(du) && du > 0 ? Math.max(0, Math.min(1, ct / du)) : 0;
      const slotW = cssW / N;
      const bw = Math.max(1.5, slotW - 3);
      const radius = Math.min(bw / 2, 4);
      const playedIdx = progress * N;

      // Unplayed columns — dim ghost bars.
      for (let i = 0; i < N; i++) {
        if (i + 0.6 <= playedIdx) continue;
        const x = i * slotW + slotW / 2 - bw / 2;
        const h = Math.max(2, st.L[i] * cssH * 0.94);
        ctx.fillStyle = 'rgba(255,255,255,0.11)';
        roundRect(x, cssH - h, bw, h, radius);
        ctx.fill();
      }

      // Soft shimmer sweeping across while a new track morphs in.
      if (st.fade < 1) {
        const sweep = 1 - Math.max(0, st.fade);
        const gx = progress * cssW;
        const gg = ctx.createLinearGradient(gx - 110 * (1 - sweep * 0.6) - 10, 0, gx - 10, 0);
        gg.addColorStop(0, 'rgba(255,255,255,0)');
        gg.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`);
        gg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(0, cssH * 0.22, cssW, cssH * 0.56);
      }

      // Played columns — full color bars with a white peak cap.
      for (let i = 0; i < N; i++) {
        if (i + 0.6 > playedIdx) break;
        const x = i * slotW + slotW / 2 - bw / 2;
        const h = Math.max(2, st.L[i] * cssH * 0.94);
        ctx.fillStyle = baseGrad!;
        roundRect(x, cssH - h, bw, h, radius);
        ctx.fill();
        if (st.L[i] > 0.05 && h > 5) {
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          roundRect(x, cssH - h - 2, bw, 3, 1.5);
          ctx.fill();
        }
      }

      // Playhead glow.
      if (progress > 0 && progress < 1) {
        const px = progress * cssW;
        const pg = ctx.createLinearGradient(px - 16, 0, px + 16, 0);
        pg.addColorStop(0, 'rgba(255,255,255,0)');
        pg.addColorStop(0.5, 'rgba(255,255,255,0.4)');
        pg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = pg;
        ctx.fillRect(px - 16, 4, 32, cssH - 8);
      }

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [barCount, sensitivity, analyser, color, trackKey]);

  const seekFromClientX = (clientX: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const { duration: d } = timeRef.current;
    if (!Number.isFinite(d) || d <= 0) return;
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
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
        draggingRef.current = true;
        (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
        seekFromClientX(e.clientX);
      }}
      onPointerMove={(e) => { if (draggingRef.current) seekFromClientX(e.clientX); }}
      onPointerUp={() => { draggingRef.current = false; }}
      onPointerCancel={() => { draggingRef.current = false; }}
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