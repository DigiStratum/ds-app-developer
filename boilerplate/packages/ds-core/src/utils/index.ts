/**
 * @digistratum/ds-core - Utilities
 * 
 * Re-exports all utility functions and classes.
 */

// API Client
export { ApiClient, DSApiError, createApiClient } from './api-client';

// Constants
export { DS_URLS, STORAGE_KEYS, TIMEOUTS, CSS_VARS } from './constants';

// Storage utilities
export { storage, sessionStore } from './storage';

// Discovery client
export {
  DiscoveryClient,
  discoveryClient,
  discoverResource,
  prefetchResources,
  invalidateDiscoveryCache,
} from './discovery';
