import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme;
    if (stored && ['light', 'dark'].includes(stored)) {
      return stored;
    }
    // Default to light on first visit
    return 'light';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Apply theme to document
  const applyTheme = (themeToApply: 'light' | 'dark') => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add new theme class
    root.classList.add(themeToApply);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content', 
        themeToApply === 'dark' ? '#1f2937' : '#ffffff'
      );
    }
  };

  // Initialize theme on mount
  useEffect(() => {
    setResolvedTheme(theme);
    applyTheme(theme);
  }, []);

  // Update theme
  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    setResolvedTheme(newTheme);
    applyTheme(newTheme);
  };

  return {
    theme,
    resolvedTheme: theme,
    setTheme: updateTheme,
    toggleTheme: () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      updateTheme(newTheme);
    },
  };
}