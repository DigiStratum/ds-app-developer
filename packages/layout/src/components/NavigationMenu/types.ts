import { ReactNode } from 'react';
import type { User } from '../../types';

/**
 * Tenant context for menu item generation
 */
export interface Tenant {
  id: string;
  name: string;
  role?: string;
}

/**
 * Menu item for navigation
 * 
 * @example
 * ```typescript
 * const menuItem: MenuItem = {
 *   id: 'dashboard',
 *   label: 'Dashboard',
 *   path: '/dashboard',
 *   icon: '📊',
 *   badge: 5,
 * };
 * ```
 */
export interface MenuItem {
  /** Unique identifier for the menu item */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Navigation path (relative URL) - optional if onClick is provided */
  path?: string;
  
  /** Optional icon (emoji, string, or React node) */
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
 * Callback type for generating menu items based on user/tenant context.
 * This allows apps to define role-based or tenant-specific menus.
 * 
 * @example
 * ```typescript
 * const getMenuItems: GetMenuItemsCallback = (user, tenant) => {
 *   const items: MenuItem[] = [
 *     { id: 'home', label: 'Home', path: '/', icon: '🏠' },
 *   ];
 *   
 *   if (user) {
 *     items.push({ id: 'dashboard', label: 'Dashboard', path: '/dashboard' });
 *   }
 *   
 *   if (tenant?.role === 'admin') {
 *     items.push({ id: 'settings', label: 'Settings', path: '/settings', icon: '⚙️' });
 *   }
 *   
 *   return items;
 * };
 * ```
 */
export type GetMenuItemsCallback = (user: User | null, tenant: Tenant | null) => MenuItem[];

/**
 * NavigationMenu component props
 */
export interface NavigationMenuProps {
  /**
   * Callback to get menu items based on current user and tenant context.
   * Called on each render to allow dynamic menu generation.
   */
  getMenuItems: GetMenuItemsCallback;
  
  /** Current user (passed to getMenuItems callback) */
  user?: User | null;
  
  /** Current tenant (passed to getMenuItems callback) */
  tenant?: Tenant | null;
  
  /** Additional CSS classes for the nav container */
  className?: string;
  
  /** Whether to show mobile hamburger menu (default: true) */
  showMobileMenu?: boolean;
  
  /** Orientation: 'horizontal' for header navs, 'vertical' for sidebars */
  orientation?: 'horizontal' | 'vertical';
  
  /** Callback when a menu item is clicked (for router integration) */
  onNavigate?: (path: string) => void;
}
