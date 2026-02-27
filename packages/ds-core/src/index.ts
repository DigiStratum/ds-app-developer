/**
 * @digistratum/ds-core
 * 
 * DigiStratum shared runtime library.
 * Core utilities, hooks, and components for DS applications.
 * 
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================
export type {
  // User & Auth
  User,
  TenantInfo,
  AppInfo,
  Session,
  Tenant,
  // Theme
  Theme,
  ThemeContext,
  TenantThemeConfig,
  // API
  ApiError,
  ApiClientConfig,
  // Consent
  ConsentLevel,
  // Feature Flags
  FeatureFlagsState,
  // Layout
  MenuItem,
  FooterLink,
} from './types';

export type {
  // Discovery
  DiscoveredResource,
  DiscoveryCacheEntry,
  DiscoveryCache,
  DiscoveryClientOptions,
  UseDiscoveryState,
} from './types/discovery';

// =============================================================================
// Hooks
// =============================================================================

// Consent management
export {
  useConsent,
  getConsentLevel,
  hasFullConsent,
} from './hooks/useConsent';
export type { UseConsentReturn } from './hooks/useConsent';

// Feature flags
export {
  FeatureFlagsProvider,
  useFeatureFlags,
  useFeatureFlag,
} from './hooks/useFeatureFlags';

// Theme
export { ThemeProvider, useTheme } from './hooks/useTheme';
export type { ThemeProviderProps } from './hooks/useTheme';

// Tenant theming
export { useTenantTheme } from './hooks/useTenantTheme';
export type { TenantThemeState, UseTenantThemeOptions } from './hooks/useTenantTheme';

// Discovery
export { useDiscovery, useDiscoveryPrefetch } from './hooks/useDiscovery';

// =============================================================================
// Components
// =============================================================================

// Error handling
export { ErrorBoundary } from './components/ErrorBoundary';
export type { ErrorBoundaryProps } from './components/ErrorBoundary';

// Feature flags
export { FeatureFlag, withFeatureFlag } from './components/FeatureFlag';
export type { FeatureFlagProps } from './components/FeatureFlag';

// Ad slots
export { AdSlot } from './components/AdSlot';
export type { AdSlotProps } from './components/AdSlot';

// Loading states
export { Loading, Skeleton } from './components/Loading';
export type { LoadingProps, SkeletonProps } from './components/Loading';

// =============================================================================
// Utilities
// =============================================================================

// API Client
export { ApiClient, DSApiError, createApiClient } from './utils/api-client';

// Constants
export { DS_URLS, STORAGE_KEYS, TIMEOUTS, CSS_VARS } from './utils/constants';

// Storage utilities
export { storage, sessionStore } from './utils/storage';

// Discovery client
export {
  DiscoveryClient,
  discoveryClient,
  discoverResource,
  prefetchResources,
  invalidateDiscoveryCache,
} from './utils/discovery';
