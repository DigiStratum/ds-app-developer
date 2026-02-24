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

// Main shell
export { DSAppShell } from './DSAppShell';

// Layout components
export { DSHeader } from './DSHeader';
export { DSFooter } from './DSFooter';
export { AdSlot } from './AdSlot';
export { GdprBanner, useConsent } from './GdprBanner';
export { CookiePreferencesModal, useCookiePreferencesModal } from './CookiePreferencesModal';

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
