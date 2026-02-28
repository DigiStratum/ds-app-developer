/**
 * @digistratum/ds-core - Discovery Client
 * 
 * Registry discovery client for discovering services by canonical resource name.
 * Implements in-memory caching with optional localStorage persistence.
 * 
 * @example
 * ```ts
 * import { discoveryClient, discoverResource } from '@digistratum/ds-core';
 * 
 * // Simple usage
 * const resource = await discoverResource('sso.authorize');
 * console.log(resource.url, resource.path); // https://account.digistratum.com, /api/sso/authorize
 * 
 * // Prefetch multiple resources
 * await discoveryClient.prefetchResources(['sso.authorize', 'users.profile']);
 * 
 * // Invalidate cache
 * discoveryClient.invalidateCache('sso.authorize'); // Single resource
 * discoveryClient.invalidateCache(); // All resources
 * ```
 */

import type {
  DiscoveredResource,
  DiscoveryCacheEntry,
  DiscoveryCache,
  DiscoveryClientOptions,
} from '../types/discovery';
import { DS_URLS, STORAGE_KEYS, TIMEOUTS } from './constants';
import { storage } from './storage';

const CACHE_VERSION = 1;

/**
 * Registry discovery client for service-to-service discovery.
 * 
 * Features:
 * - In-memory TTL cache for fast lookups
 * - Optional localStorage persistence for reload resilience
 * - Prefetch support for bulk resolution
 * - Manual cache invalidation
 */
export class DiscoveryClient {
  private baseURL: string;
  private cacheTTL: number;
  private persistCache: boolean;
  
  /** In-memory cache for fast access */
  private memoryCache: Map<string, DiscoveryCacheEntry> = new Map();
  
  /** Pending requests to deduplicate concurrent calls */
  private pendingRequests: Map<string, Promise<DiscoveredResource>> = new Map();

  constructor(options: DiscoveryClientOptions = {}) {
    this.baseURL = options.baseURL ?? DS_URLS.ACCOUNT;
    this.cacheTTL = options.cacheTTL ?? TIMEOUTS.DISCOVERY_CACHE_TTL;
    this.persistCache = options.persistCache ?? true;
    
    // Load persisted cache on initialization
    if (this.persistCache) {
      this.loadPersistedCache();
    }
  }

  /**
   * Discover a resource by its canonical name.
   * Returns cached result if valid, otherwise fetches from registry.
   * 
   * @param name - Canonical resource name (e.g., 'sso.authorize')
   * @returns The discovered resource
   * @throws Error if the resource cannot be found
   */
  async discoverResource(name: string): Promise<DiscoveredResource> {
    // Check memory cache first
    const cached = this.getCachedResource(name);
    if (cached) {
      return cached;
    }

    // Check for pending request to deduplicate concurrent calls
    const pending = this.pendingRequests.get(name);
    if (pending) {
      return pending;
    }

    // Fetch from registry
    const request = this.fetchResource(name);
    this.pendingRequests.set(name, request);

    try {
      const resource = await request;
      this.cacheResource(name, resource);
      return resource;
    } finally {
      this.pendingRequests.delete(name);
    }
  }

  /**
   * Prefetch multiple resources in parallel.
   * Useful for pre-loading commonly used dependencies.
   * 
   * @param names - Array of canonical resource names
   */
  async prefetchResources(names: string[]): Promise<void> {
    // Filter out already-cached resources
    const uncached = names.filter((name) => !this.getCachedResource(name));
    
    if (uncached.length === 0) {
      return;
    }

    // Fetch all uncached resources in parallel
    await Promise.all(
      uncached.map((name) => this.discoverResource(name).catch(() => {
        // Log but don't fail on individual prefetch errors
        console.warn(`[DiscoveryClient] Failed to prefetch resource: ${name}`);
      }))
    );
  }

  /**
   * Invalidate cached resources.
   * 
   * @param name - Specific resource name to invalidate, or undefined to clear all
   */
  invalidateCache(name?: string): void {
    if (name) {
      this.memoryCache.delete(name);
    } else {
      this.memoryCache.clear();
    }

    // Update persisted cache
    if (this.persistCache) {
      this.persistCacheToStorage();
    }
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.memoryCache.size,
      entries: Array.from(this.memoryCache.keys()),
    };
  }

  /**
   * Check if a resource is in the cache (and not expired)
   */
  private getCachedResource(name: string): DiscoveredResource | null {
    const entry = this.memoryCache.get(name);
    if (!entry) {
      return null;
    }

    // Check if entry is still valid
    const age = Date.now() - entry.cachedAt;
    if (age > this.cacheTTL) {
      // Expired - remove from cache
      this.memoryCache.delete(name);
      return null;
    }

    return entry.resource;
  }

  /**
   * Cache a discovered resource
   */
  private cacheResource(name: string, resource: DiscoveredResource): void {
    this.memoryCache.set(name, {
      resource,
      cachedAt: Date.now(),
    });

    // Persist to localStorage
    if (this.persistCache) {
      this.persistCacheToStorage();
    }
  }

  /**
   * Fetch a resource from the registry API
   */
  private async fetchResource(name: string): Promise<DiscoveredResource> {
    const url = `${this.baseURL}/api/discovery/resource/${encodeURIComponent(name)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Resource not found: ${name}`);
      }
      throw new Error(`Discovery failed for ${name}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as DiscoveredResource;
  }

  /**
   * Load cache from localStorage
   */
  private loadPersistedCache(): void {
    const cached = storage.get(STORAGE_KEYS.DISCOVERY_CACHE);
    if (!cached) {
      return;
    }

    try {
      const parsed: DiscoveryCache = JSON.parse(cached);
      
      // Check cache version for migrations
      if (parsed.version !== CACHE_VERSION) {
        // Invalid version - clear cache
        storage.remove(STORAGE_KEYS.DISCOVERY_CACHE);
        return;
      }

      // Load entries, filtering out expired ones
      const now = Date.now();
      for (const [name, entry] of Object.entries(parsed.entries)) {
        const age = now - entry.cachedAt;
        if (age <= this.cacheTTL) {
          this.memoryCache.set(name, entry);
        }
      }
    } catch {
      // Invalid cache - clear it
      storage.remove(STORAGE_KEYS.DISCOVERY_CACHE);
    }
  }

  /**
   * Persist cache to localStorage
   */
  private persistCacheToStorage(): void {
    const cache: DiscoveryCache = {
      version: CACHE_VERSION,
      entries: Object.fromEntries(this.memoryCache.entries()),
    };

    storage.set(STORAGE_KEYS.DISCOVERY_CACHE, JSON.stringify(cache));
  }
}

/**
 * Default discovery client instance.
 * Pre-configured with DS_URLS.ACCOUNT as the registry base URL.
 */
export const discoveryClient = new DiscoveryClient();

/**
 * Convenience function to discover a single resource.
 * Uses the default discovery client.
 * 
 * @param name - Canonical resource name (e.g., 'sso.authorize')
 * @returns The discovered resource
 * 
 * @example
 * ```ts
 * const resource = await discoverResource('sso.authorize');
 * // { appId: 'dsaccount', url: 'https://account.digistratum.com', path: '/api/sso/authorize', methods: ['GET', 'POST'] }
 * ```
 */
export async function discoverResource(name: string): Promise<DiscoveredResource> {
  return discoveryClient.discoverResource(name);
}

/**
 * Convenience function to prefetch multiple resources.
 * Uses the default discovery client.
 * 
 * @param names - Array of canonical resource names
 * 
 * @example
 * ```ts
 * await prefetchResources(['sso.authorize', 'users.profile', 'tenants.list']);
 * ```
 */
export async function prefetchResources(names: string[]): Promise<void> {
  return discoveryClient.prefetchResources(names);
}

/**
 * Convenience function to invalidate the discovery cache.
 * Uses the default discovery client.
 * 
 * @param name - Specific resource name to invalidate, or undefined to clear all
 * 
 * @example
 * ```ts
 * invalidateDiscoveryCache('sso.authorize'); // Clear single resource
 * invalidateDiscoveryCache(); // Clear entire cache
 * ```
 */
export function invalidateDiscoveryCache(name?: string): void {
  discoveryClient.invalidateCache(name);
}
