/**
 * NavigationMenu - Dynamic navigation component with callback pattern
 * 
 * Supports role-based menu generation via menuItemsProvider callback,
 * nested items, badges, mobile hamburger/drawer menu, and collapsible sidebar.
 * 
 * @example Basic horizontal header navigation
 * ```tsx
 * import { NavigationMenu, MenuItem } from '@digistratum/layout';
 * 
 * const menuItemsProvider = (user, tenant) => {
 *   const items: MenuItem[] = [
 *     { id: 'home', label: 'Home', path: '/' },
 *   ];
 *   if (user) {
 *     items.push({ id: 'dashboard', label: 'Dashboard', path: '/dashboard' });
 *   }
 *   return items;
 * };
 * 
 * <NavigationMenu menuItemsProvider={menuItemsProvider} user={user} tenant={tenant} />
 * ```
 * 
 * @example Collapsible sidebar
 * ```tsx
 * const [collapsed, setCollapsed] = useState(false);
 * 
 * <NavigationMenu
 *   orientation="vertical"
 *   menuItemsProvider={menuItemsProvider}
 *   collapsed={collapsed}
 *   onCollapsedChange={setCollapsed}
 *   sidebarHeader={<Logo />}
 * />
 * ```
 */

export { NavigationMenu } from './NavigationMenu';
export type {
  MenuItem,
  Tenant,
  MenuItemsProvider,
  GetMenuItemsCallback,
  NavigationMenuProps,
} from './types';
