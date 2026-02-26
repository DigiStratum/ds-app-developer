import type { User } from '../../types';
import type { MenuItem, Tenant } from '../AppShell/types';

// Re-export for convenience
export type { MenuItem, Tenant };

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
