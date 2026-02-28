import { ReactNode } from 'react';
import type { User } from '../../types';

/**
 * Tenant information for multi-tenant context
 */
export interface Tenant {
  id: string;
  name: string;
  role?: string;
}

/**
 * Menu item for navigation
 * 
 * Supports the full NavigationMenu feature set:
 * - Optional path (can use onClick instead)
 * - Nested children for submenus
 * - Badges for counts/notifications
 * - Visibility control
 */
export interface MenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label */
  label: string;
  /** Navigation path (relative URL) - optional if onClick is provided */
  path?: string;
  /** Optional icon (emoji or React node) */
  icon?: ReactNode;
  /** Badge text or number (e.g., notification count) */
  badge?: string | number;
  /** Nested menu items (for submenus/dropdowns) */
  children?: MenuItem[];
  /** Click handler (alternative to path navigation) */
  onClick?: () => void;
  /** Whether this item is visible (default: true) */
  visible?: boolean;
  /** Whether this item is currently active */
  active?: boolean;
  /** Whether this item is disabled */
  disabled?: boolean;
}

/**
 * Zone visibility configuration for AppShell
 * 
 * All zones are visible by default. Set to true to hide a zone.
 */
export interface AppShellZoneVisibility {
  /** Hide the custom header zone (default: false) */
  hideCustomHeader?: boolean;
  
  /** Hide the DS Header zone entirely (default: false) */
  hideHeader?: boolean;
  
  /** Hide the navigation menu within the header (default: false) */
  hideNavigation?: boolean;
  
  /** Hide the DS Footer zone (default: false) */
  hideFooter?: boolean;
}

/**
 * AppShell Props
 * 
 * A simplified layout container that orchestrates all layout zones:
 * - Custom Header Zone (collapsible when null or hideCustomHeader=true)
 * - DS Header (logo, session, switcher) - hideable via hideHeader
 * - Navigation Menu - hideable via hideNavigation
 * - Content Container (children)
 * - DS Footer - hideable via hideFooter
 * 
 * @example
 * ```tsx
 * <AppShell
 *   getMenuItems={(user, tenant) => [
 *     { id: 'home', label: 'Home', path: '/' },
 *     { id: 'projects', label: 'Projects', path: '/projects' },
 *   ]}
 * >
 *   <YourAppContent />
 * </AppShell>
 * ```
 * 
 * @example Hide footer for fullscreen mode
 * ```tsx
 * <AppShell hideFooter hideNavigation>
 *   <FullscreenContent />
 * </AppShell>
 * ```
 */
export interface AppShellProps extends AppShellZoneVisibility {
  /** Optional custom header content (collapses to 0 height when null/undefined) */
  customHeader?: ReactNode;
  
  /**
   * Callback to get menu items based on current user and tenant.
   * Called with user/tenant context to allow dynamic menu generation.
   */
  getMenuItems?: (user: User | null, tenant: Tenant | null) => MenuItem[];
  
  /** Main content to render in the content container */
  children: ReactNode;
  
  /** Optional custom footer content (replaces DS Footer when provided) */
  customFooter?: ReactNode;
}
