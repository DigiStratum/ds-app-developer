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
 * AppShell Props
 * 
 * A simplified layout container that orchestrates all layout zones:
 * - Custom Header Zone (collapsible when null)
 * - DS Header (logo, session, switcher)
 * - Navigation Menu
 * - Content Container (children)
 * - DS Footer
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
 */
export interface AppShellProps {
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
