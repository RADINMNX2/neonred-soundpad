
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Page } from '../types';

interface SmartCoreState {
  isBackground: boolean;
  isLowPowerMode: boolean;
  activePage: Page;
  fps: number;
  reportActivity: (page: Page) => void;
}

const SmartCoreContext = createContext<SmartCoreState | undefined>(undefined);

export const SmartCoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBackground, setIsBackground] = useState(document.hidden);
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [activePage, setActivePage] = useState<Page>(Page.PAD);
  const [fps, setFps] = useState(60);
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      setIsBackground(hidden);
      
      if (hidden) {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
      } else {
        startMonitor();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const startMonitor = () => {
    if (rafId.current) return;

    const loop = () => {
      frameCount.current++;
      const now = performance.now();

      // Only update state once every second to save CPU
      if (now - lastTime.current >= 1000) {
        const currentFps = frameCount.current;
        setFps(currentFps);
        
        // AI Optimization Decision
        if (currentFps < 35 && !isLowPowerMode) setIsLowPowerMode(true);
        else if (currentFps > 50 && isLowPowerMode) setIsLowPowerMode(false);

        frameCount.current = 0;
        lastTime.current = now;
      }

      if (!document.hidden) {
        rafId.current = requestAnimationFrame(loop);
      }
    };
    rafId.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    startMonitor();
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const reportActivity = (page: Page) => {
    if (page !== activePage) setActivePage(page);
  };

  return (
    <SmartCoreContext.Provider value={{ 
      isBackground, 
      isLowPowerMode, 
      activePage, 
      fps,
      reportActivity 
    }}>
      {children}
    </SmartCoreContext.Provider>
  );
};

export const useSmartCore = () => {
  const context = useContext(SmartCoreContext);
  if (context === undefined) {
    throw new Error('useSmartCore must be used within a SmartCoreProvider');
  }
  return context;
};