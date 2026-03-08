import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Theme configuration returned from /api/theme endpoint
 * [FR-THEME-004]
 */
export interface TenantThemeConfig {
  /** CSS custom properties to override (e.g., { '--ds-primary': '#ff6600' }) */
  cssVars?: Record<string, string>;
  /** Custom logo URL (null = use default LeapKick logo) */
  logoUrl?: string | null;
  /** Logo alt text */
  logoAlt?: string;
  /** Favicon URL */
  faviconUrl?: string | null;
}

export interface TenantThemeState {
  /** Resolved theme config (merged with defaults) */
  theme: TenantThemeConfig;
  /** Logo URL to display (custom or null for default) */
  logoUrl: string | null;
  /** Whether theme is still loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Force refresh theme from server */
  refresh: () => void;
}

// Style element ID for dynamic theme injection
const THEME_STYLE_ID = 'ds-tenant-theme';

// Default timeout for theme fetch (2.5 seconds)
const FETCH_TIMEOUT_MS = 2500;

/**
 * Hook to fetch and apply tenant-specific theming from the backend.
 * 
 * This hook:
 * - Fetches theme config from /api/theme on mount
 * - Times out after 2.5s and falls back to defaults (no jank)
 * - Injects CSS custom properties as a <style> element
 * - Provides logo URL for custom branding
 * - Caches in sessionStorage to avoid flash on navigation
 * 
 * Usage:
 * ```tsx
 * const { logoUrl, isLoading } = useTenantTheme();
 * ```
 * 
 * [FR-THEME-004, FR-THEME-005]
 */
export function useTenantTheme(): TenantThemeState {
  const [theme, setTheme] = useState<TenantThemeConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const applyTheme = useCallback((config: TenantThemeConfig) => {
    // Remove existing theme style if present
    const existingStyle = document.getElementById(THEME_STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Apply CSS custom properties if provided
    if (config.cssVars && Object.keys(config.cssVars).length > 0) {
      const cssRules = Object.entries(config.cssVars)
        .map(([prop, value]) => `  ${prop}: ${value};`)
        .join('\n');

      const styleEl = document.createElement('style');
      styleEl.id = THEME_STYLE_ID;
      styleEl.textContent = `:root {\n${cssRules}\n}`;
      document.head.appendChild(styleEl);
    }

    // Update favicon if provided
    if (config.faviconUrl) {
      const existingFavicon = document.querySelector('link[rel="icon"]');
      if (existingFavicon) {
        (existingFavicon as HTMLLinkElement).href = config.faviconUrl;
      }
    }
  }, []);

  const fetchTheme = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check sessionStorage cache first
    const cached = sessionStorage.getItem('ds-tenant-theme');
    if (cached) {
      try {
        const cachedTheme = JSON.parse(cached) as TenantThemeConfig;
        setTheme(cachedTheme);
        applyTheme(cachedTheme);
        setIsLoading(false);
        // Still fetch fresh data in background
      } catch {
        // Invalid cache, ignore
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Set up timeout
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch('/api/theme', {
        signal: controller.signal,
        credentials: 'include', // Include session cookie
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Non-2xx response - fall back to defaults
        throw new Error(`Theme fetch failed: ${response.status}`);
      }

      const data = await response.json() as TenantThemeConfig;
      
      // Cache in sessionStorage
      sessionStorage.setItem('ds-tenant-theme', JSON.stringify(data));
      
      setTheme(data);
      applyTheme(data);
      setError(null);
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error && err.name === 'AbortError') {
        // Timeout - silently fall back to defaults
        console.debug('[useTenantTheme] Fetch timed out, using defaults');
      } else {
        // Other error - log but don't disrupt UX
        console.debug('[useTenantTheme] Fetch failed, using defaults:', err);
        setError(err instanceof Error ? err.message : 'Theme fetch failed');
      }
      
      // Ensure defaults are applied on error
      setTheme({});
    } finally {
      setIsLoading(false);
    }
  }, [applyTheme]);

  const refresh = useCallback(() => {
    sessionStorage.removeItem('ds-tenant-theme');
    setIsLoading(true);
    setError(null);
    fetchTheme();
  }, [fetchTheme]);

  useEffect(() => {
    fetchTheme();

    return () => {
      // Cleanup: abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTheme]);

  return {
    theme,
    logoUrl: theme.logoUrl ?? null,
    isLoading,
    error,
    refresh,
  };
}

export default useTenantTheme;
