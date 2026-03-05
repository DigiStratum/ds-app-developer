/**
 * @digistratum/ds-core - useTheme Hook
 * 
 * Theme provider for light/dark mode support.
 * Now reads from unified ds-prefs cookie for initial state.
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
import { getPrefs } from './usePrefs';

const ThemeContextInstance = createContext<ThemeContext | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Default theme if none saved (default: 'light') */
  defaultTheme?: Theme;
}

/**
 * Theme provider for light/dark mode support.
 * 
 * Reads initial theme from ds-prefs cookie (via getPrefs).
 * Updates both cookie and document class on theme change.
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
  defaultTheme = 'light',
}: ThemeProviderProps) {
  // Read initial theme from ds-prefs cookie
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    try {
      const prefs = getPrefs();
      return prefs.theme || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const prefs = getPrefs();
      return prefs.theme || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = () => {
      let resolved: 'light' | 'dark' = 'light';

      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        resolved = theme as 'light' | 'dark';
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

  // Note: setTheme here updates local state only.
  // The PreferencesModal uses usePrefs().setTheme() to persist to cookie.
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
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
