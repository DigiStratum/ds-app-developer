/**
 * @digistratum/ds-core - useSessionData Hook
 * 
 * Provides access to session data stored in the user's session.
 * Calls /api/session/data endpoints on the app's own origin (BFF proxies to DSAccount).
 * 
 * Returns:
 * - session: { id, userId, expiresAt, lastActivityAt } (read-only)
 * - data: T (generic typed)
 * - get(key), set(key, val), merge(partial), remove(key), clear()
 * - isLoading, error
 * 
 * Implements FR-SESSION-001: Frontend access to session data
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Session metadata (read-only)
 */
export interface SessionInfo {
  id: string;
  userId: string | null;
  expiresAt: string | null;
  lastActivityAt: string | null;
}

/**
 * Response from /api/session/data endpoint
 */
interface SessionDataResponse<T> {
  session: SessionInfo;
  data: T;
}

/**
 * Options for useSessionData hook
 */
export interface UseSessionDataOptions {
  /** Base URL for API calls (default: empty string for same origin) */
  baseUrl?: string;
  /** Whether to fetch immediately on mount (default: true) */
  immediate?: boolean;
}

/**
 * Return type for useSessionData hook
 */
export interface UseSessionDataReturn<T extends Record<string, unknown>> {
  /** Session metadata (read-only) */
  session: Readonly<SessionInfo> | null;
  /** Session data object */
  data: T;
  /** Get a specific key from session data */
  get: <K extends keyof T>(key: K) => T[K] | undefined;
  /** Set a single key in session data */
  set: <K extends keyof T>(key: K, value: T[K]) => Promise<void>;
  /** Merge partial data into session data */
  merge: (partial: Partial<T>) => Promise<void>;
  /** Remove a specific key from session data */
  remove: <K extends keyof T>(key: K) => Promise<void>;
  /** Clear all session data */
  clear: () => Promise<void>;
  /** Refresh session data from server */
  refresh: () => Promise<void>;
  /** Whether the hook is loading data */
  isLoading: boolean;
  /** Error from the last operation */
  error: Error | null;
}

const SESSION_DATA_ENDPOINT = '/api/session/data';

/**
 * useSessionData hook
 * 
 * Provides CRUD access to session data stored in the user's session.
 * Uses optimistic updates for a snappy UX.
 * 
 * @example
 * ```tsx
 * interface MySessionData {
 *   theme: 'light' | 'dark';
 *   lastPage: string;
 * }
 * 
 * function MyComponent() {
 *   const { data, set, isLoading } = useSessionData<MySessionData>();
 *   
 *   if (isLoading) return <Loading />;
 *   
 *   return (
 *     <button onClick={() => set('theme', 'dark')}>
 *       Current theme: {data.theme}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSessionData<T extends Record<string, unknown> = Record<string, unknown>>(
  options: UseSessionDataOptions = {}
): UseSessionDataReturn<T> {
  const { baseUrl = '', immediate = true } = options;
  
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [data, setData] = useState<T>({} as T);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if we've done the initial fetch
  const hasFetched = useRef(false);

  /**
   * Fetch session data from the server
   */
  const fetchSessionData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}${SESSION_DATA_ENDPOINT}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error?.message || `HTTP ${response.status}`);
      }

      const result: SessionDataResponse<T> = await response.json();
      setSession(result.session);
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setSession(null);
      setData({} as T);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    if (immediate && !hasFetched.current) {
      hasFetched.current = true;
      fetchSessionData();
    }
  }, [immediate, fetchSessionData]);

  /**
   * Get a specific key from session data
   */
  const get = useCallback(<K extends keyof T>(key: K): T[K] | undefined => {
    return data[key];
  }, [data]);

  /**
   * Set a single key in session data (optimistic update)
   */
  const set = useCallback(async <K extends keyof T>(key: K, value: T[K]): Promise<void> => {
    // Optimistic update
    setData((prev) => ({ ...prev, [key]: value }));
    setError(null);

    try {
      const response = await fetch(`${baseUrl}${SESSION_DATA_ENDPOINT}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error?.message || `HTTP ${response.status}`);
      }

      // Optionally sync with server response
      const result: SessionDataResponse<T> = await response.json();
      setData(result.data);
      setSession(result.session);
    } catch (err) {
      // Rollback optimistic update on error
      setError(err instanceof Error ? err : new Error(String(err)));
      // Refetch to restore correct state
      await fetchSessionData();
    }
  }, [baseUrl, fetchSessionData]);

  /**
   * Merge partial data into session data (optimistic update)
   */
  const merge = useCallback(async (partial: Partial<T>): Promise<void> => {
    // Optimistic update
    setData((prev) => ({ ...prev, ...partial }));
    setError(null);

    try {
      const response = await fetch(`${baseUrl}${SESSION_DATA_ENDPOINT}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partial),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error?.message || `HTTP ${response.status}`);
      }

      // Sync with server response
      const result: SessionDataResponse<T> = await response.json();
      setData(result.data);
      setSession(result.session);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      await fetchSessionData();
    }
  }, [baseUrl, fetchSessionData]);

  /**
   * Remove a specific key from session data
   */
  const remove = useCallback(async <K extends keyof T>(key: K): Promise<void> => {
    // Optimistic update
    setData((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setError(null);

    try {
      const response = await fetch(`${baseUrl}${SESSION_DATA_ENDPOINT}/${String(key)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error?.message || `HTTP ${response.status}`);
      }

      // Sync with server response
      const result: SessionDataResponse<T> = await response.json();
      setData(result.data);
      setSession(result.session);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      await fetchSessionData();
    }
  }, [baseUrl, fetchSessionData]);

  /**
   * Clear all session data
   */
  const clear = useCallback(async (): Promise<void> => {
    // Optimistic update
    setData({} as T);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}${SESSION_DATA_ENDPOINT}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error?.message || `HTTP ${response.status}`);
      }

      // Sync with server response
      const result: SessionDataResponse<T> = await response.json();
      setData(result.data);
      setSession(result.session);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      await fetchSessionData();
    }
  }, [baseUrl, fetchSessionData]);

  /**
   * Refresh session data from server
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchSessionData();
  }, [fetchSessionData]);

  return {
    session: session ? Object.freeze(session) as Readonly<SessionInfo> : null,
    data,
    get,
    set,
    merge,
    remove,
    clear,
    refresh,
    isLoading,
    error,
  };
}
