/**
 * @digistratum/layout
 * 
 * DigiStratum app shell and layout components for consistent UI across DS apps.
 * 
 * @example
 * ```tsx
 * import { DSAppShell } from '@digistratum/layout';
 * 
 * function App() {
 *   return (
 *     <DSAppShell appName="MyApp" auth={auth} theme={theme}>
 *       <YourContent />
 *     </DSAppShell>
 *   );
 * }
 * ```
 */

// Main shell components
export { DSAppShell } from './DSAppShell';
export { AppShell } from './components/AppShell';
export type { AppShellProps, AppShellExtendedProps, MenuItem, Tenant } from './components/AppShell';

// Navigation components
export { NavigationMenu } from './components/NavigationMenu';
export type { GetMenuItemsCallback, NavigationMenuProps } from './components/NavigationMenu';

// Content components
export { ContentContainer } from './components/ContentContainer';
export type { ContentContainerProps, LoadingConfig, ErrorConfig } from './components/ContentContainer';

// Layout components
export { DSHeader } from './DSHeader';
export { DSFooter } from './DSFooter';
export { AdSlot } from './AdSlot';
export { GdprBanner, useConsent } from './GdprBanner';
export { CookiePreferencesModal, useCookiePreferencesModal } from './CookiePreferencesModal';
export { CustomHeaderZone } from './components/CustomHeaderZone';

// Types
export type {
  DSAppShellProps,
  SlotConfig,
  NavLink,
  DSApp,
  FooterLink,
  User,
  AuthContext,
  ThemeContext,
} from './types';

export type { DSHeaderProps } from './DSHeader';
export type { DSFooterProps } from './DSFooter';
export type { AdSlotProps } from './AdSlot';
export type { ConsentLevel } from './GdprBanner';
export type { CookiePreferencesModalProps } from './CookiePreferencesModal';
export type { CustomHeaderZoneProps } from './components/CustomHeaderZone';
