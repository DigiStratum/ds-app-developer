/**
 * @ds/boilerplate - Shared DS App Components
 * 
 * This directory is WHOLESALE REPLACEABLE.
 * Do not add app-specific code here.
 * 
 * Provides:
 * - Navigation (DSNav, DeveloperHeader)
 * - Layout (DeveloperAppShell, Layout)
 * - Footer (DeveloperFooter, Footer)
 * - Consent (CookieConsent)
 * - Modals (PreferencesModal)
 * - Hooks (useAuth, useTheme, useTenantTheme, useFeatureFlags)
 * 
 * @version 1.0.0
 */

// Components
export { DSNav } from './DSNav';
export { DeveloperHeader } from './DeveloperHeader';
export { DeveloperFooter, GdprBanner } from './DeveloperFooter';
export { DeveloperAppShell } from './DeveloperAppShell';
export { CookieConsent } from './CookieConsent';
export { Footer } from './Footer';
export { PreferencesModal } from './PreferencesModal';

// Hooks
export { AuthProvider, useAuth } from './useAuth';
export { ThemeProvider as BoilerplateThemeProvider, useTheme } from './useTheme';
export { useTenantTheme } from './useTenantTheme';
export { FeatureFlagsProvider, useFeatureFlags } from './useFeatureFlags';

// Additional exports
export { ErrorBoundary } from './ErrorBoundary';
export { FeatureFlag } from './FeatureFlag';
