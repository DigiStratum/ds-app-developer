/**
 * @digistratum/ds-core - Hooks
 * 
 * Re-exports all hooks.
 */

// Consent management
export { useConsent } from './useConsent';
export type { UseConsentReturn } from './useConsent';

// Feature flags
export {
  FeatureFlagsProvider,
  useFeatureFlags,
  useFeatureFlag,
} from './useFeatureFlags';

// Theme
export { ThemeProvider, useTheme } from './useTheme';
export type { ThemeProviderProps } from './useTheme';

// Tenant theming
export { useTenantTheme } from './useTenantTheme';
export type { TenantThemeState, UseTenantThemeOptions } from './useTenantTheme';

// Discovery
export { useDiscovery, useDiscoveryPrefetch } from './useDiscovery';

// Shell loader
export { useShellLoader, prefetchShell } from './useShellLoader';

// Unified preferences (language, theme, consent)
export { 
  usePrefs, 
  getPrefs, 
  SUPPORTED_LANGUAGES,
} from './usePrefs';
export type { 
  UserPrefs, 
  LanguageCode, 
  ThemeMode,
  ConsentLevel,
} from './usePrefs';

// Session data
export { useSessionData } from './useSessionData';
export type { 
  SessionInfo, 
  UseSessionDataOptions, 
  UseSessionDataReturn,
} from './useSessionData';

// Authentication
export { 
  AuthProvider, 
  useAuth, 
  useAuthLoading,
} from './useAuth';
export type { 
  AuthContext, 
  AuthProviderProps,
} from './useAuth';

// API Error handling
export { ApiErrorProvider, useApiError, useApiErrorSafe } from './useApiError';
export type { ApiErrorProviderProps } from './useApiError';
