/**
 * NavigationMenu - Dynamic navigation component with callback pattern
 * 
 * Supports role-based menu generation via getMenuItems callback,
 * nested items, badges, and mobile hamburger menu.
 * 
 * @example
 * ```tsx
 * import { NavigationMenu, MenuItem } from '@digistratum/layout';
 * 
 * const getMenuItems = (user, tenant) => {
 *   const items: MenuItem[] = [
 *     { id: 'home', label: 'Home', path: '/' },
 *   ];
 *   if (user) {
 *     items.push({ id: 'dashboard', label: 'Dashboard', path: '/dashboard' });
 *   }
 *   return items;
 * };
 * 
 * <NavigationMenu getMenuItems={getMenuItems} user={user} tenant={tenant} />
 * ```
 */

export { NavigationMenu } from './NavigationMenu';
export type {
  MenuItem,
  Tenant,
  GetMenuItemsCallback,
  NavigationMenuProps,
} from './types';
