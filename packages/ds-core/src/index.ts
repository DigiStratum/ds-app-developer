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

export type {
  // Shell Loader
  ShellModuleExports,
  DSAppShellProps,
  DSHeaderProps,
  DSFooterProps,
  ShellSlotConfig,
  ShellNavLink,
  ShellApp,
  ShellFooterLink,
  ShellUser,
  ShellAuthContext,
  ShellThemeContext,
  ShellLoaderConfig,
  ShellLoadStatus,
  UseShellLoaderState,
  UseShellLoaderOptions,
} from './types/shell-loader';

// =============================================================================
// Hooks
// =============================================================================

// Consent management
export { useConsent } from './hooks/useConsent';
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

// Authentication
export { AuthProvider, useAuth, useAuthLoading } from './hooks/useAuth';
export type { AuthContext, AuthProviderProps } from './hooks/useAuth';

// Tenant theming
export { useTenantTheme } from './hooks/useTenantTheme';
export type { TenantThemeState, UseTenantThemeOptions } from './hooks/useTenantTheme';

// Discovery
export { useDiscovery, useDiscoveryPrefetch } from './hooks/useDiscovery';

// Shell loader
export { useShellLoader, prefetchShell } from './hooks/useShellLoader';

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

// Shell fallbacks
export { 
  ShellSkeleton, 
  ShellErrorFallback, 
  ShellErrorBoundary,
} from './components/ShellFallback';
export type { 
  ShellSkeletonProps, 
  ShellErrorFallbackProps,
  ShellErrorBoundaryProps,
} from './components/ShellFallback';

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

// Shell loader utilities
export {
  configureShellLoader,
  getShellLoaderConfig,
  getResolvedShellUrl,
  addPreloadHint,
  loadShellModule,
  resetShellLoader,
  isShellLoaded,
  getShellLoadError,
  getShellRetryCount,
} from './utils/shell-loader';

// Unified preferences
export { 
  usePrefs, 
  initPrefs,
  usePrefsInit,
  getPrefs, 
  SUPPORTED_LANGUAGES,
} from './hooks/usePrefs';
export type { 
  UserPrefs, 
  LanguageCode, 
  ThemeMode,
} from './hooks/usePrefs';

// Session data
export { useSessionData } from './hooks/useSessionData';
export type { 
  SessionInfo, 
  UseSessionDataOptions, 
  UseSessionDataReturn,
} from './hooks/useSessionData';

// API Error View and handling
export { ApiErrorView } from './components/ApiErrorView';
export type { ApiErrorDetails, ApiErrorViewProps } from './components/ApiErrorView';

export { ApiErrorProvider, useApiError, useApiErrorSafe } from './hooks/useApiError';
export type { ApiErrorProviderProps } from './hooks/useApiError';

export { ApiHttpError } from './utils/ApiHttpError';
