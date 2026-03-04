/**
 * @digistratum/ds-core - Hooks
 * 
 * Re-exports all hooks.
 */

// Consent management
export { useConsent, getConsentLevel, hasFullConsent } from './useConsent';
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
  updatePrefs,
  SUPPORTED_LANGUAGES,
} from './usePrefs';
export type { 
  UsePrefsReturn, 
  UserPrefs, 
  LanguageCode, 
  ThemeMode,
} from './usePrefs';
// Re-export ConsentLevel from usePrefs for new code
export type { ConsentLevel } from './usePrefs';
