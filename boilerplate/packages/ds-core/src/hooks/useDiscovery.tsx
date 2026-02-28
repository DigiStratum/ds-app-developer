/**
 * @digistratum/ds-core - useDiscovery Hook
 * 
 * React hook for discovering resources by canonical name.
 * Provides loading states and automatic refresh capabilities.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { resource, isLoading, error, refresh } = useDiscovery('sso.authorize');
 *   
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error.message} />;
 *   
 *   return (
 *     <a href={`${resource.url}${resource.path}`}>
 *       Sign In
 *     </a>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import type { DiscoveredResource, UseDiscoveryState } from '../types/discovery';
import { discoveryClient } from '../utils/discovery';

/**
 * React hook for discovering a resource by canonical name.
 * 
 * @param resourceName - Canonical resource name (e.g., 'sso.authorize')
 * @returns State object with resource, loading state, error, and refresh function
 * 
 * @example
 * ```tsx
 * const { resource, isLoading, error } = useDiscovery('users.profile');
 * 
 * if (resource) {
 *   const profileUrl = `${resource.url}${resource.path}`;
 * }
 * ```
 */
export function useDiscovery(resourceName: string): UseDiscoveryState {
  const [resource, setResource] = useState<DiscoveredResource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchResource = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const discovered = await discoveryClient.discoverResource(resourceName);
      setResource(discovered);
    } catch (err) {
      console.error(`[useDiscovery] Failed to discover resource: ${resourceName}`, err);
      setError(err instanceof Error ? err : new Error('Discovery failed'));
    } finally {
      setIsLoading(false);
    }
  }, [resourceName]);

  // Fetch resource on mount and when resourceName changes
  useEffect(() => {
    fetchResource();
  }, [fetchResource]);

  const refresh = useCallback(async () => {
    // Invalidate cache before refreshing
    discoveryClient.invalidateCache(resourceName);
    await fetchResource();
  }, [resourceName, fetchResource]);

  return {
    resource,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook to prefetch multiple resources on mount.
 * Useful for pre-loading dependencies at the app or route level.
 * 
 * @param resourceNames - Array of canonical resource names to prefetch
 * 
 * @example
 * ```tsx
 * function App() {
 *   // Prefetch commonly used resources on app load
 *   useDiscoveryPrefetch(['sso.authorize', 'users.profile', 'tenants.list']);
 *   
 *   return <MyApp />;
 * }
 * ```
 */
export function useDiscoveryPrefetch(resourceNames: string[]): void {
  useEffect(() => {
    discoveryClient.prefetchResources(resourceNames).catch((err) => {
      console.warn('[useDiscoveryPrefetch] Prefetch failed:', err);
    });
    // Only run once on mount - resourceNames expected to be stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
