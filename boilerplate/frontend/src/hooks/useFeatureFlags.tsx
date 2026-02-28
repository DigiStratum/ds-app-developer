import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../api/client';

interface FeatureFlagsContextValue {
  flags: Record<string, boolean>;
  isEnabled: (key: string) => boolean;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

const CACHE_KEY = 'ds-feature-flags';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  flags: Record<string, boolean>;
  timestamp: number;
}

// Load cached flags from sessionStorage
function loadCachedFlags(): Record<string, boolean> | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      // Check if cache is still valid
      if (Date.now() - entry.timestamp < CACHE_TTL) {
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
    const entry: CacheEntry = {
      flags,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (quota, etc.)
  }
}

interface EvaluateResponse {
  flags: Record<string, boolean>;
}

/**
 * FeatureFlagsProvider fetches and provides feature flags to the app.
 * 
 * Usage:
 * ```tsx
 * <FeatureFlagsProvider>
 *   <App />
 * </FeatureFlagsProvider>
 * ```
 */
export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    // Initialize with cached flags if available
    return loadCachedFlags() || {};
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      const response = await api.get<EvaluateResponse>('/api/flags/evaluate');
      setFlags(response.flags);
      saveFlagsToCache(response.flags);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch feature flags:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch flags'));
      // Keep using cached/existing flags on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch flags on mount
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Helper to check if a flag is enabled
  const isEnabled = useCallback((key: string): boolean => {
    return flags[key] ?? false;
  }, [flags]);

  const value: FeatureFlagsContextValue = {
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
 * Usage:
 * ```tsx
 * const { isEnabled, flags, isLoading } = useFeatureFlags();
 * 
 * if (isEnabled('new-dashboard')) {
 *   return <NewDashboard />;
 * }
 * ```
 */
export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return context;
}

/**
 * Convenience hook to check a single flag.
 * 
 * Usage:
 * ```tsx
 * const isNewFeatureEnabled = useFeatureFlag('new-feature');
 * ```
 */
export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}
