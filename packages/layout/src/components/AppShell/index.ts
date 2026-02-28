/**
 * AppShell - Root layout container component
 * 
 * A simplified layout container that orchestrates all layout zones:
 * - Custom Header Zone (collapsible, hideable via hideCustomHeader)
 * - DS Header (logo, session, switcher, hideable via hideHeader)
 * - Navigation Menu (hideable via hideNavigation)
 * - Content Container
 * - DS Footer (hideable via hideFooter)
 */

export { AppShell } from './AppShell';
export type { AppShellExtendedProps } from './AppShell';
export type { AppShellProps, AppShellZoneVisibility, MenuItem, Tenant } from './types';
