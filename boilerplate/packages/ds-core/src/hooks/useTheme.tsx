/**
 * @digistratum/ds-core - useTheme Hook
 * 
 * Theme provider for light/dark mode support.
 * Supports system preference detection and persistence.
 * [FR-THEME-001, FR-THEME-002]
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import type { Theme, ThemeContext } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

const ThemeContextInstance = createContext<ThemeContext | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Default theme if none saved (default: 'system') */
  defaultTheme?: Theme;
  /** localStorage key for persistence (default: 'ds-theme') */
  storageKey?: string;
}

/**
 * Theme provider for light/dark mode support.
 * 
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = STORAGE_KEYS.THEME,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    const saved = localStorage.getItem(storageKey) as Theme;
    return saved || defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = () => {
      let resolved: 'light' | 'dark' = 'light';

      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
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
    localStorage.setItem(storageKey, newTheme);
  };

  return (
    <ThemeContextInstance.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContextInstance.Provider>
  );
}

/**
 * Hook to access theme context.
 * 
 * @example
 * ```tsx
 * const { theme, setTheme, resolvedTheme } = useTheme();
 * ```
 */
export function useTheme(): ThemeContext {
  const context = useContext(ThemeContextInstance);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
