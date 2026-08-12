
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeConfig } from '../types';

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

// Helper to convert Hex to RGB string "r g b" for Tailwind opacity support
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : '0 0 0';
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('app_theme');
    return saved ? JSON.parse(saved) : DEFAULT_THEME;
  });

  useEffect(() => {
    localStorage.setItem('app_theme', JSON.stringify(theme));
    
    // Apply CSS Variables
    const root = document.documentElement;
    root.style.setProperty('--color-primary', hexToRgb(theme.primary));
    root.style.setProperty('--color-secondary', hexToRgb(theme.secondary));
    root.style.setProperty('--color-accent', hexToRgb(theme.accent));
    root.style.setProperty('--color-background', hexToRgb(theme.background));
    root.style.setProperty('--color-surface', hexToRgb(theme.surface));
    
    // Also set direct hex values for non-tailwind usage if needed
    root.style.setProperty('--color-primary-hex', theme.primary);
    
  }, [theme]);

  const updateTheme = (key: keyof ThemeConfig, color: string) => {
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
