
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeConfig } from '../types';
import { hexToRgb, isValidHexColor } from '../utils/colorUtils';

interface ThemeContextType {
  theme: ThemeConfig;
  updateTheme: (key: keyof ThemeConfig, color: string) => void;
  resetTheme: () => void;
}

const DEFAULT_THEME: ThemeConfig = {
  primary: '#ef4444',
  secondary: '#be123c',
  accent: '#ff0000',
  background: '#050505',
  surface: '#121212',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const toRgbString = (hex: string): string => {
  const rgb = hexToRgb(hex);
  return rgb ? `${rgb.r} ${rgb.g} ${rgb.b}` : '0 0 0';
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      return saved ? { ...DEFAULT_THEME, ...JSON.parse(saved) } : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    localStorage.setItem('app_theme', JSON.stringify(theme));
    
    // Apply CSS Variables
    const root = document.documentElement;
    root.style.setProperty('--color-primary', toRgbString(theme.primary));
    root.style.setProperty('--color-secondary', toRgbString(theme.secondary));
    root.style.setProperty('--color-accent', toRgbString(theme.accent));
    root.style.setProperty('--color-background', toRgbString(theme.background));
    root.style.setProperty('--color-surface', toRgbString(theme.surface));
    
    // Also set direct hex values for non-tailwind usage if needed
    root.style.setProperty('--color-primary-hex', theme.primary);
    
  }, [theme]);

  const updateTheme = (key: keyof ThemeConfig, color: string) => {
    if (!isValidHexColor(color)) return;
    setTheme(prev => ({ ...prev, [key]: color }));
  };

  const resetTheme = () => {
    setTheme(DEFAULT_THEME);
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
