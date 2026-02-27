/**
 * @digistratum/ds-core - Discovery Types
 * 
 * Types for the registry discovery client.
 * Used to discover services by canonical resource name.
 */

/**
 * A discovered resource from the registry.
 * Returned by the discovery API when looking up a canonical resource name.
 */
export interface DiscoveredResource {
  /** App ID that owns this resource */
  appId: string;
  /** Base URL for the service */
  url: string;
  /** Path to the resource endpoint */
  path: string;
  /** HTTP methods supported by this resource */
  methods: string[];
}

/**
 * Cache entry with TTL tracking
 */
export interface DiscoveryCacheEntry {
  /** The discovered resource data */
  resource: DiscoveredResource;
  /** Timestamp when this entry was cached */
  cachedAt: number;
}

/**
 * Discovery cache structure for localStorage persistence
 */
export interface DiscoveryCache {
  /** Version for cache format migrations */
  version: number;
  /** Map of resource name to cache entry */
  entries: Record<string, DiscoveryCacheEntry>;
}

/**
 * Options for the discovery client
 */
export interface DiscoveryClientOptions {
  /** Base URL for the registry API (defaults to DS_URLS.ACCOUNT) */
  baseURL?: string;
  /** Cache TTL in milliseconds (defaults to TIMEOUTS.DISCOVERY_CACHE_TTL) */
  cacheTTL?: number;
  /** Whether to persist cache to localStorage (default: true) */
  persistCache?: boolean;
}

/**
 * State returned by the useDiscovery hook
 */
export interface UseDiscoveryState {
  /** The discovered resource, or null if not yet loaded */
  resource: DiscoveredResource | null;
  /** Whether the resource is currently being fetched */
  isLoading: boolean;
  /** Error if the discovery failed */
  error: Error | null;
  /** Manually refresh the resource */
  refresh: () => Promise<void>;
}
