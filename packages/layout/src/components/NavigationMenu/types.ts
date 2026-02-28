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
 * const menuItemsProvider: MenuItemsProvider = (user, tenant) => {
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
export type MenuItemsProvider = (user: User | null, tenant: Tenant | null) => MenuItem[];

/** @deprecated Use MenuItemsProvider instead */
export type GetMenuItemsCallback = MenuItemsProvider;

/**
 * NavigationMenu component props
 */
export interface NavigationMenuProps {
  /**
   * Callback to get menu items based on current user and tenant context.
   * Called on each render to allow dynamic menu generation.
   * 
   * Alias: getMenuItems (deprecated)
   */
  menuItemsProvider?: MenuItemsProvider;
  
  /**
   * @deprecated Use menuItemsProvider instead
   */
  getMenuItems?: MenuItemsProvider;
  
  /** Current user (passed to menuItemsProvider callback) */
  user?: User | null;
  
  /** Current tenant (passed to menuItemsProvider callback) */
  tenant?: Tenant | null;
  
  /** Additional CSS classes for the nav container */
  className?: string;
  
  /** Whether to show mobile hamburger menu (default: true) */
  showMobileMenu?: boolean;
  
  /** Orientation: 'horizontal' for header navs, 'vertical' for sidebars */
  orientation?: 'horizontal' | 'vertical';
  
  /** Callback when a menu item is clicked (for router integration) */
  onNavigate?: (path: string) => void;
  
  // --- Collapsible sidebar features ---
  
  /**
   * Whether the sidebar is collapsed (vertical orientation only).
   * When collapsed, only icons are shown.
   */
  collapsed?: boolean;
  
  /**
   * Callback when collapsed state changes.
   * Use for controlled collapsed state.
   */
  onCollapsedChange?: (collapsed: boolean) => void;
  
  /**
   * Whether to show the collapse/expand toggle button (vertical orientation only).
   * Default: true when orientation is 'vertical'
   */
  showCollapseToggle?: boolean;
  
  // --- Mobile drawer features ---
  
  /**
   * Whether the mobile drawer is open (vertical orientation only).
   * For external control of mobile drawer state.
   */
  mobileDrawerOpen?: boolean;
  
  /**
   * Callback when mobile drawer state changes.
   */
  onMobileDrawerChange?: (open: boolean) => void;
  
  /**
   * Header content to show above navigation items (e.g., logo, app name).
   * Shown in both expanded sidebar and mobile drawer.
   */
  sidebarHeader?: React.ReactNode;
  
  /**
   * Footer content to show below navigation items (e.g., version, support link).
   */
  sidebarFooter?: React.ReactNode;
}
