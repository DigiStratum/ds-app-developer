/**
 * @digistratum/ds-core - useFeatureFlags Hook
 * 
 * Feature flag provider and hooks for conditional feature rendering.
 * Fetches flags from the backend and caches them in sessionStorage.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { FeatureFlagsState } from '../types';
import { STORAGE_KEYS, TIMEOUTS } from '../utils/constants';

const FeatureFlagsContext = createContext<FeatureFlagsState | null>(null);

interface CacheEntry {
  flags: Record<string, boolean>;
  timestamp: number;
}

// Load cached flags from sessionStorage
function loadCachedFlags(): Record<string, boolean> | null {
  try {
    if (typeof window === 'undefined') return null;
    const cached = sessionStorage.getItem(STORAGE_KEYS.FEATURE_FLAGS);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      // Check if cache is still valid
      if (Date.now() - entry.timestamp < TIMEOUTS.FLAGS_CACHE_TTL) {
        return entry.flags;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Save flags to sessionStorage cache
function saveFlagsToCache(flags: Record<string, boolean>) {
  try {
    if (typeof window === 'undefined') return;
    const entry: CacheEntry = {
      flags,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEYS.FEATURE_FLAGS, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (quota, etc.)
  }
}

interface EvaluateResponse {
  flags: Record<string, boolean>;
}

interface FeatureFlagsProviderProps {
  children: ReactNode;
  /** API endpoint for flag evaluation (default: /api/flags/evaluate) */
  endpoint?: string;
  /** Base URL for API calls */
  baseURL?: string;
}

/**
 * FeatureFlagsProvider fetches and provides feature flags to the app.
 * 
 * @example
 * ```tsx
 * <FeatureFlagsProvider>
 *   <App />
 * </FeatureFlagsProvider>
 * ```
 */
export function FeatureFlagsProvider({
  children,
  endpoint = '/api/flags/evaluate',
  baseURL = '',
}: FeatureFlagsProviderProps) {
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    // Initialize with cached flags if available
    return loadCachedFlags() || {};
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      const response = await fetch(`${baseURL}${endpoint}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch flags: ${response.status}`);
      }
      
      const data: EvaluateResponse = await response.json();
      setFlags(data.flags);
      saveFlagsToCache(data.flags);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch feature flags:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch flags'));
      // Keep using cached/existing flags on error
    } finally {
      setIsLoading(false);
    }
  }, [baseURL, endpoint]);

  // Fetch flags on mount
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Helper to check if a flag is enabled
  const isEnabled = useCallback(
    (key: string): boolean => {
      return flags[key] ?? false;
    },
    [flags]
  );

  const value: FeatureFlagsState = {
    flags,
    isEnabled,
    isLoading,
    error,
    refresh: fetchFlags,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access feature flags.
 * 
 * @example
 * ```tsx
 * const { isEnabled, flags, isLoading } = useFeatureFlags();
 * 
 * if (isEnabled('new-dashboard')) {
 *   return <NewDashboard />;
 * }
 * ```
 */
export function useFeatureFlags(): FeatureFlagsState {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return context;
}

/**
 * Convenience hook to check a single flag.
 * 
 * @example
 * ```tsx
 * const isNewFeatureEnabled = useFeatureFlag('new-feature');
 * ```
 */
export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}
