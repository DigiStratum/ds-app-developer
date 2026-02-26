import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { NavigationMenuProps } from './types';
import type { MenuItem } from '../AppShell/types';

/**
 * NavigationMenu - Dynamic navigation component with callback pattern
 * 
 * Supports:
 * - Dynamic menu generation via getMenuItems callback
 * - User/tenant context for role-based menus
 * - Nested menu items (dropdowns)
 * - Badges for notifications/counts
 * - Mobile hamburger menu (collapsible)
 * - Horizontal and vertical orientations
 * 
 * @example
 * ```tsx
 * import { NavigationMenu } from '@digistratum/layout';
 * 
 * function App() {
 *   const getMenuItems = (user, tenant) => [
 *     { id: 'home', label: 'Home', path: '/', icon: '🏠' },
 *     { id: 'dashboard', label: 'Dashboard', path: '/dashboard', badge: 3 },
 *     {
 *       id: 'settings',
 *       label: 'Settings',
 *       icon: '⚙️',
 *       children: [
 *         { id: 'profile', label: 'Profile', path: '/settings/profile' },
 *         { id: 'security', label: 'Security', path: '/settings/security' },
 *       ],
 *     },
 *   ];
 * 
 *   return (
 *     <NavigationMenu
 *       getMenuItems={getMenuItems}
 *       user={currentUser}
 *       tenant={currentTenant}
 *       onNavigate={(path) => navigate(path)}
 *     />
 *   );
 * }
 * ```
 */
export function NavigationMenu({
  getMenuItems,
  user = null,
  tenant = null,
  className = '',
  showMobileMenu = true,
  orientation = 'horizontal',
  onNavigate,
}: NavigationMenuProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  // Generate menu items from callback
  const allMenuItems = useMemo(() => {
    return getMenuItems(user, tenant);
  }, [getMenuItems, user, tenant]);

  // Filter out invisible items
  const menuItems = useMemo(() => {
    return allMenuItems.filter(item => item.visible !== false);
  }, [allMenuItems]);

  // Close submenu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (submenuRef.current && !submenuRef.current.contains(event.target as Node)) {
        setOpenSubmenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle navigation
  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.disabled) return;

    // Execute custom onClick if provided
    if (item.onClick) {
      item.onClick();
    }

    // Navigate if path provided
    if (item.path && onNavigate) {
      onNavigate(item.path);
    }

    // Close mobile menu after navigation
    setMobileMenuOpen(false);
    setOpenSubmenu(null);
  }, [onNavigate]);

  // Toggle submenu
  const toggleSubmenu = useCallback((itemId: string) => {
    setOpenSubmenu(prev => prev === itemId ? null : itemId);
  }, []);

  // Render badge
  const renderBadge = (badge: string | number | undefined) => {
    if (badge === undefined || badge === null) return null;
    return (
      <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        {badge}
      </span>
    );
  };

  // Render a single menu item
  const renderMenuItem = (item: MenuItem, isMobile = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const visibleChildren = hasChildren
      ? item.children!.filter(child => child.visible !== false)
      : [];
    const hasVisibleChildren = visibleChildren.length > 0;
    const isSubmenuOpen = openSubmenu === item.id;

    const baseClasses = `
      flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
      ${item.disabled
        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
        : item.active
          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
      }
      ${isMobile ? 'w-full' : ''}
    `.trim().replace(/\s+/g, ' ');

    // Item with children - render as dropdown trigger
    if (hasVisibleChildren) {
      return (
        <div key={item.id} className="relative" ref={isSubmenuOpen ? submenuRef : undefined}>
          <button
            type="button"
            onClick={() => toggleSubmenu(item.id)}
            disabled={item.disabled}
            className={baseClasses}
            aria-expanded={isSubmenuOpen}
            aria-haspopup="true"
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            <span>{item.label}</span>
            {renderBadge(item.badge)}
            <svg
              className={`ml-2 w-4 h-4 transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Submenu dropdown */}
          {isSubmenuOpen && (
            <div
              className={`
                ${orientation === 'horizontal' && !isMobile
                  ? 'absolute left-0 mt-1 w-48'
                  : 'ml-4 mt-1'
                }
                bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50
              `}
            >
              <div className="py-1">
                {visibleChildren.map(child => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => handleItemClick(child)}
                    disabled={child.disabled}
                    className={`
                      w-full text-left flex items-center px-4 py-2 text-sm
                      ${child.disabled
                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                        : child.active
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {child.icon && <span className="mr-2">{child.icon}</span>}
                    <span>{child.label}</span>
                    {renderBadge(child.badge)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Simple item - render as link or button
    if (item.path && !item.onClick) {
      return (
        <a
          key={item.id}
          href={item.path}
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              handleItemClick(item);
            }
          }}
          className={baseClasses}
          aria-disabled={item.disabled}
        >
          {item.icon && <span className="mr-2">{item.icon}</span>}
          <span>{item.label}</span>
          {renderBadge(item.badge)}
        </a>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleItemClick(item)}
        disabled={item.disabled}
        className={baseClasses}
      >
        {item.icon && <span className="mr-2">{item.icon}</span>}
        <span>{item.label}</span>
        {renderBadge(item.badge)}
      </button>
    );
  };

  // Horizontal layout (default - for headers)
  if (orientation === 'horizontal') {
    return (
      <nav className={`ds-navigation-menu ${className}`}>
        {/* Desktop menu */}
        <div className="hidden md:flex items-center space-x-1">
          {menuItems.map(item => renderMenuItem(item))}
        </div>

        {/* Mobile hamburger button */}
        {showMobileMenu && (
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Mobile menu dropdown */}
            {mobileMenuOpen && (
              <div className="absolute left-0 right-0 mt-2 mx-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="py-2 px-2 space-y-1">
                  {menuItems.map(item => renderMenuItem(item, true))}
                </div>
              </div>
            )}
          </div>
        )}
      </nav>
    );
  }

  // Vertical layout (for sidebars)
  return (
    <nav className={`ds-navigation-menu flex flex-col space-y-1 ${className}`}>
      {menuItems.map(item => renderMenuItem(item))}
    </nav>
  );
}
