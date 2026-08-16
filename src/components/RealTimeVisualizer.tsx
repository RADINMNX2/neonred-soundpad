import React, { useEffect, useRef, useState, memo } from 'react';
import { useSmartCore } from '../context/SmartCoreContext';
import { VisualizerConfig } from '../types';

interface RealTimeVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  color?: string;
  simulate?: boolean; 
  config?: Partial<VisualizerConfig>;
  // NEW PROPS FOR SYNC
  externalData?: Uint8Array | null; 
  onSync?: (data: Uint8Array) => void; 
}

const RealTimeVisualizer: React.FC<RealTimeVisualizerProps> = memo(({ 
  analyser, 
  isPlaying, 
  color = '#ef4444',
  simulate = false,
  config,
  externalData,
  onSync
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { isBackground } = useSmartCore();
  
  // Track previous bar heights for smooth falling effect
  const lastHeights = useRef<number[]>([]);
  const externalDataRef = useRef<Uint8Array | null>(null);
  externalDataRef.current = externalData || null;

  const [hasExternalData, setHasExternalData] = useState(false);

  useEffect(() => {
    setHasExternalData(!!externalData && externalData.length > 0);
  }, [externalData]);

  // Local config defaults
  const vHeight = config?.height ?? 1.0;
  const vSensitivity = config?.sensitivity ?? 1.5;
  const vBarCount = config?.barCount ?? 40;
  const vGap = config?.barGap ?? 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Only optimize if we are NOT an external receiver (Mini Player should always draw when data comes)
    if (isBackground && !simulate && !hasExternalData) {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        return;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Use dynamic bar count from config
    if (lastHeights.current.length !== vBarCount) {
        lastHeights.current = new Array(vBarCount).fill(0);
    }

    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    // We allocate array once
    const dataArray = new Uint8Array(bufferLength);
    
    const renderFrame = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      let sourceData: Uint8Array | null = null;

      const data = externalDataRef.current;
      if (data && data.length > 0) {
          // MODE 1: Slave (Mini Player)
          sourceData = data;
      } else if (simulate) {
          // MODE 2: Simulation (Settings Preview)
          const time = performance.now() / 400;
          for (let i = 0; i < vBarCount; i++) {
              const val = Math.sin(i * 0.3 + time) * (40 * vSensitivity) + 100 + Math.random() * 20;
              dataArray[i] = Math.min(255, val);
          }
          sourceData = dataArray;
      } else if (analyser && isPlaying) {
          // MODE 3: Master (Main Player)
          analyser.getByteFrequencyData(dataArray);
          sourceData = dataArray;
          // Send data to sync if callback exists
          if (onSync) onSync(dataArray);
      } else {
          // Silent Mode
          // If not playing, slowly drain existing bars
          let active = false;
          for (let i = 0; i < vBarCount; i++) {
            lastHeights.current[i] *= 0.85;
            if (lastHeights.current[i] > 0.1) active = true;
          }
          if (!active) {
            animationFrameRef.current = null;
            return;
          }
      }

      // Drawing Logic
      if (!sourceData) {
        animationFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const barWidth = (width / vBarCount);
      const centerX = width / 2;
      
      // We only use the first 70% of frequency data because higher bins are usually empty
      // If externalData provided, use its length as buffer length
      const effectiveBufferLen = sourceData.length;
      const binsPerBar = Math.floor((effectiveBufferLen * 0.7) / vBarCount) || 1;

      for (let i = 0; i < vBarCount; i++) {
          let sum = 0;
          for (let j = 0; j < binsPerBar; j++) {
              sum += sourceData[i * binsPerBar + j] || 0;
          }
          let average = (sum / binsPerBar) * vSensitivity;
          
          // Target height with user defined multiplier
          let targetHeight = (average / 255) * height * vHeight;
          
          // Safety cap
          if (targetHeight > height) targetHeight = height;

          // Minimum activity threshold (keep it alive)
          if ((isPlaying || externalDataRef.current) && targetHeight < 2) targetHeight = 2;

          // Smoothing: Ease towards target, fall slowly
          if (targetHeight > lastHeights.current[i]) {
            lastHeights.current[i] = targetHeight;
          } else {
            lastHeights.current[i] -= (lastHeights.current[i] - targetHeight) * 0.15;
          }

          const h = lastHeights.current[i];
          
          // Create Gradient for each bar
          const gradient = ctx.createLinearGradient(0, height, 0, height - h);
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, '#ffffff');
          ctx.fillStyle = gradient;

          // Symmetric Rendering
          const drawW = (barWidth / 2) - vGap;
          if (drawW > 0) {
            ctx.fillRect(centerX + (i * barWidth / 2), height - h, drawW, h);
            ctx.fillRect(centerX - ((i + 1) * barWidth / 2), height - h, drawW, h);
          }
      }

      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [analyser, isPlaying, color, simulate, isBackground, vHeight, vSensitivity, vBarCount, vGap, hasExternalData, onSync]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={140} 
      className="w-full h-full"
    />
  );
});

export default RealTimeVisualizer;