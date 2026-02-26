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
 */
export interface MenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label */
  label: string;
  /** Navigation path (relative URL) */
  path: string;
  /** Optional icon (emoji or React node) */
  icon?: ReactNode;
  /** Whether this item is currently active */
  active?: boolean;
  /** Nested menu items (for submenus) */
  children?: MenuItem[];
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Badge text (e.g., count) */
  badge?: string | number;
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
