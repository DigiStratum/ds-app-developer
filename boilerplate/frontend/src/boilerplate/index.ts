/**
 * @ds/boilerplate - Shared DS App Components
 * 
 * This directory is WHOLESALE REPLACEABLE.
 * Do not add app-specific code here.
 * 
 * @version 1.0.0
 */

// Components
export { DSNav } from './DSNav';
export { DeveloperHeader } from './DeveloperHeader';
export { DeveloperFooter } from './DeveloperFooter';
export { DeveloperAppShell } from './DeveloperAppShell';
export { CookieConsent } from './CookieConsent';
export { Footer } from './Footer';
export { PreferencesModal } from './PreferencesModal';
export { ErrorBoundary } from './ErrorBoundary';
export { FeatureFlag } from './FeatureFlag';

// Hooks
export { AuthProvider, useAuth } from './useAuth';
export { useTenantTheme } from './useTenantTheme';
export { FeatureFlagsProvider, useFeatureFlags } from './useFeatureFlags';
