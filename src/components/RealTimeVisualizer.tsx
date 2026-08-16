import React, { useEffect, useRef, memo } from 'react';
import { useSmartCore } from '../context/SmartCoreContext';
import { VisualizerConfig } from '../types';

interface RealTimeVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  color?: string;
  simulate?: boolean; 
  config?: Partial<VisualizerConfig>;
  externalData?: Uint8Array | null; 
  externalDataRef?: React.MutableRefObject<Uint8Array | null>;
  onSync?: (data: Uint8Array) => void; 
}

const RealTimeVisualizer: React.FC<RealTimeVisualizerProps> = memo(({ 
  analyser, 
  isPlaying, 
  color = '#ef4444',
  simulate = false,
  config,
  externalData,
  externalDataRef,
  onSync
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { isBackground } = useSmartCore();
  const isBackgroundRef = useRef(isBackground);
  isBackgroundRef.current = isBackground;

  const onSyncRef = useRef(onSync);
  useEffect(() => { onSyncRef.current = onSync; }, [onSync]);

  const externalDataPropRef = useRef<Uint8Array | null>(null);
  externalDataPropRef.current = externalData || null;

  const visStateRef = useRef<{ count: number; L: number[]; P: number[]; E: number; silent: number } | null>(null);

  const vHeight = config?.height ?? 1.0;
  const vSensitivity = config?.sensitivity ?? 1.5;
  const vBarCount = config?.barCount ?? 40;
  const vGap = config?.barGap ?? 1;

  const miniMode = !!externalDataRef;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = canvas.clientWidth;
    let cssH = canvas.clientHeight;

    const resize = () => {
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      if (cssW < 2 || cssH < 2) return;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let contextLost = false;
    const onLost = () => {
      contextLost = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
    const onRestored = () => {
      contextLost = false;
      renderFrame();
    };
    canvas.addEventListener('contextlost', onLost);
    canvas.addEventListener('contextrestored', onRestored);

    const N = Math.max(8, vBarCount);
    let L: number[];
    let P: number[];
    let E: number;
    let silent = 0;
    const prev = visStateRef.current;
    if (prev && prev.count === N) {
      L = prev.L;
      P = prev.P;
      E = prev.E;
      silent = prev.silent;
    } else {
      L = new Array(N).fill(0);
      P = new Array(N).fill(0);
      if (prev && prev.count !== N && prev.count > 0) {
        const ratio = (N - 1) / (prev.count - 1 || 1);
        for (let i = 0; i < N; i++) {
          const j = Math.min(prev.count - 1, Math.round(i / ratio));
          L[i] = prev.L[j];
          P[i] = prev.P[j];
        }
        E = prev.E;
        silent = prev.silent;
      } else {
        E = 0;
        silent = 0;
      }
    }

    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);
    const simArray = new Uint8Array(N);
    const B = analyser ? Math.floor(bufferLength * 0.7) : N;

    const basis: { start: number; span: number; lift: number }[] = [];
    const buildBasis = () => {
      basis.length = 0;
      const span = Math.max(1, Math.round((B / N) * 0.6));
      for (let i = 0; i < N; i++) {
        const tt = N === 1 ? 0 : i / (N - 1);
        const start = Math.max(0, Math.floor(Math.pow(tt, 1.35) * (B - span)));
        basis.push({ start, span, lift: 0.9 + 0.25 * Math.sin(tt * Math.PI) });
      }
    };
    buildBasis();

    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
      const n = parseInt(full, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };

    let baseRgb = hexToRgb(color);
    let gradBase: CanvasGradient | null = null;
    let gradHotMagenta: CanvasGradient | null = null;
    let gradHotCyan: CanvasGradient | null = null;
    let lastColorKey = '';

    const rebuildGradients = () => {
      const key = `${color}`;
      if (key === lastColorKey && gradBase) return;
      lastColorKey = key;
      baseRgb = hexToRgb(color);
      const h = Math.max(1, cssH);
      gradBase = ctx.createLinearGradient(0, h, 0, 0);
      gradBase.addColorStop(0, `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},0.55)`);
      gradBase.addColorStop(0.55, color);
      gradBase.addColorStop(1, '#ffffff');
      gradHotMagenta = ctx.createLinearGradient(0, h, 0, 0);
      gradHotMagenta.addColorStop(0, `rgba(236,72,153,0.6)`);
      gradHotMagenta.addColorStop(0.55, '#f472b6');
      gradHotMagenta.addColorStop(1, '#ffffff');
      gradHotCyan = ctx.createLinearGradient(0, h, 0, 0);
      gradHotCyan.addColorStop(0, `rgba(34,211,238,0.6)`);
      gradHotCyan.addColorStop(0.55, '#22d3ee');
      gradHotCyan.addColorStop(1, '#ffffff');
    };
    rebuildGradients();

    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sctx = sprite.getContext('2d');
    if (sctx) {
      const rg = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, 'rgba(255,255,255,0.9)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      sctx.fillStyle = rg;
      sctx.fillRect(0, 0, 64, 64);
    }

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

    let frameCount = 0;
    let lastNow = performance.now();

    const renderFrame = (now?: number) => {
      const tNow = now ?? performance.now();
      const dt = Math.min(50, tNow - lastNow);
      lastNow = tNow;

      if (isBackgroundRef.current || contextLost) {
        animationFrameRef.current = null;
        return;
      }
      if (cssW < 2 || cssH < 2) {
        animationFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const ext = externalDataRef?.current ?? externalDataPropRef.current;
      let source: Uint8Array | null = null;
      let silentNow = false;

      if (ext && ext.length > 0) {
        source = ext;
        silent = 0;
      } else if (simulate) {
        const tt = performance.now() / 1000;
        for (let i = 0; i < N; i++) {
          const v = 90 + 70 * Math.sin(tt * 1.3 + i * 0.55) * (0.5 + 0.5 * Math.sin(tt * 0.23 + i * 0.1)) + 18 * Math.sin(i * 1.7 - tt * 0.9);
          simArray[i] = Math.max(0, Math.min(255, Math.round(v)));
        }
        source = simArray;
        silent = 0;
      } else if (analyser && isPlaying) {
        if (analyser.context.state === 'running') {
          analyser.getByteFrequencyData(dataArray);
          source = dataArray;
          frameCount++;
          if (onSyncRef.current && frameCount % 2 === 0) onSyncRef.current(dataArray);
          silent = 0;
        } else {
          silentNow = true;
        }
      } else {
        silentNow = true;
      }

      if (!source) {
        if (silentNow) {
          silent++;
          if (silent > 6) {
            let alive = false;
            for (let i = 0; i < N; i++) {
              L[i] *= Math.max(0, 1 - dt * 0.9);
              P[i] *= Math.max(0, 1 - dt * 0.9);
              if (L[i] > 0.004 || P[i] > 0.004) alive = true;
            }
            if (!alive) {
              E = 0;
              animationFrameRef.current = null;
              return;
            }
          }
        }
        animationFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const raw = new Array(N).fill(0);
      let maxBin = 0;
      for (let i = 0; i < N; i++) {
        const b = basis[i];
        let sum = 0;
        for (let j = 0; j < b.span; j++) sum += source[b.start + j] || 0;
        let avg = sum / b.span;
        if (avg > maxBin) maxBin = avg;
        avg = (avg / 255) * vSensitivity * b.lift;
        raw[i] = Math.min(1.15, avg);
      }

      const S = new Array(N).fill(0);
      for (let i = 0; i < N; i++) {
        const prevRaw = i > 0 ? raw[i - 1] : raw[i];
        const nextRaw = i < N - 1 ? raw[i + 1] : raw[i];
        S[i] = 0.75 * raw[i] + 0.15 * prevRaw + 0.1 * nextRaw;
      }

      E = 0.75 * E + 0.25 * (maxBin / 255);
      if (maxBin < 6) {
        silent++;
        if (silent > 40) E = 0;
      } else {
        silent = 0;
      }
      const floorPx = isPlaying ? Math.min(10, E * cssH * 0.1) : 0;
      const floorH = Math.min(cssH * 0.35, floorPx);

      for (let i = 0; i < N; i++) {
        const target = S[i] * cssH * vHeight + floorH;
        const tau = target > L[i] ? 0.045 : 0.15;
        L[i] += (target - L[i]) * (1 - Math.exp(-dt / 1000 / tau));
        const decay = (55 + P[i] * 0.45) * dt / 1000;
        P[i] = Math.max(L[i], P[i] - decay);
      }

      const slotW = cssW / N;
      const drawW = Math.max(1, slotW / 2 - vGap);
      const radius = Math.min(drawW / 2, 6);
      const capSprite = drawW * dpr >= 7 ? 3 : drawW * dpr >= 4 ? 2 : 1;

      const drawBars = (alpha: number) => {
        ctx.globalAlpha = alpha;
        for (let i = 0; i < N; i++) {
          const h = L[i];
          if (h <= 0.5) continue;
          const xR = cssW / 2 + i * slotW / 2 + vGap;
          const xL = cssW / 2 - (i + 1) * slotW / 2 + vGap;
          const topR = cssH - h;
          const hot = S[i] > 0.7;
          ctx.fillStyle = hot ? (i % 2 === 0 ? gradHotMagenta! : gradHotCyan!) : gradBase!;
          roundRect(xR, topR, drawW, h, radius);
          ctx.fill();
          roundRect(xL, topR, drawW, h, radius);
          ctx.fill();

          if (capSprite >= 2) {
            const capW = Math.max(3, drawW * 1.7);
            ctx.globalAlpha = alpha * 0.4;
            ctx.drawImage(sprite, xR - capW / 2, topR - capW / 2, capW, capW);
            ctx.drawImage(sprite, xL - capW / 2, topR - capW / 2, capW, capW);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            roundRect(xR, topR - 1.5, drawW, 3, 1.5);
            ctx.fill();
            roundRect(xL, topR - 1.5, drawW, 3, 1.5);
            ctx.fill();
          }
        }

        if (capSprite >= 2) {
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < N; i++) {
            const py = cssH - P[i];
            if (py > cssH - 1) continue;
            const s = Math.max(2, drawW * 0.6);
            ctx.globalAlpha = alpha * 0.55;
            ctx.drawImage(sprite, cssW / 2 + i * slotW / 2 + vGap - s / 2, py - s / 2, s, s);
            ctx.drawImage(sprite, cssW / 2 - (i + 1) * slotW / 2 + vGap - s / 2, py - s / 2, s, s);
          }
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 1;
      };

      ctx.clearRect(0, 0, cssW, cssH);
      rebuildGradients();
      if (capSprite === 3) {
        ctx.save();
        ctx.translate(0, cssH);
        ctx.scale(1, -1);
        drawBars(0.14);
        ctx.restore();
      }
      drawBars(1);

      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    let watchdog: ReturnType<typeof setInterval> | null = null;
    if (miniMode) {
      watchdog = setInterval(() => {
        const d = externalDataRef?.current;
        if (d && d.length > 0 && !animationFrameRef.current && !isBackgroundRef.current) {
          renderFrame();
        }
      }, 250);
    }

    visStateRef.current = { count: N, L, P, E, silent };
    renderFrame();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      if (watchdog) clearInterval(watchdog);
      ro.disconnect();
      canvas.removeEventListener('contextlost', onLost);
      canvas.removeEventListener('contextrestored', onRestored);
    };
  }, [analyser, isPlaying, color, simulate, isBackground, vHeight, vSensitivity, vBarCount, vGap, miniMode]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
    />
  );
});

export default RealTimeVisualizer;