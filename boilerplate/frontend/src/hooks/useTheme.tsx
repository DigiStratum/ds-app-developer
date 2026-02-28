import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, ThemeContext } from '../types';

const ThemeContextInstance = createContext<ThemeContext | null>(null);

// Theme provider [FR-THEME-001, FR-THEME-002]
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = () => {
      let resolved: 'light' | 'dark' = 'light';
      
      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolved = theme;
      }
      
      setResolvedTheme(resolved);
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', applyTheme);
    
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContextInstance.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContextInstance.Provider>
  );
}

export function useTheme(): ThemeContext {
  const context = useContext(ThemeContextInstance);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
