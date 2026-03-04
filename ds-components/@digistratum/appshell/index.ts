/**
 * @digistratum/appshell
 * 
 * DigiStratum AppShell - Complete app layout system with header, footer,
 * navigation, and GDPR compliance.
 * 
 * @example
 * ```tsx
 * import { AppShell } from '@digistratum/appshell';
 * 
 * function App() {
 *   return (
 *     <AppShell appName="MyApp" auth={auth} theme={theme}>
 *       <YourContent />
 *     </AppShell>
 *   );
 * }
 * ```
 */

// Main shell component
export { AppShell } from './AppShell';

// Layout components
export { DSHeader } from './DSHeader';
export { DSFooter } from './DSFooter';
export { AdSlot } from './AdSlot';

// GDPR/Cookie components
export { GdprBanner, useConsent } from './GdprBanner';
export { CookiePreferencesModal, useCookiePreferencesModal } from './CookiePreferencesModal';

// Types
export type {
  // Core types
  SlotConfig,
  NavLink,
  DSApp,
  FooterLink,
  User,
  AuthContext,
  ThemeContext,
  Tenant,
  MenuItem,
  
  // Zone visibility
  AppShellZoneVisibility,
  
  // Component props
  AppShellProps,
  AppShellExtendedProps,
  DSHeaderProps,
  DSFooterProps,
  AdSlotProps,
  
  // Cookie consent
  ConsentLevel,
  CookiePreferencesModalProps,
} from './types';

// Utility components
export { CustomHeaderZone } from './CustomHeaderZone';
