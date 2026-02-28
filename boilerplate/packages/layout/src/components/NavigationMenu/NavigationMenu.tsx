import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { NavigationMenuProps } from './types';
import type { MenuItem } from '../AppShell/types';

/**
 * NavigationMenu - Dynamic navigation component with callback pattern
 * 
 * Supports:
 * - Dynamic menu generation via menuItemsProvider callback
 * - User/tenant context for role-based menus
 * - Nested menu items (dropdowns)
 * - Badges for notifications/counts
 * - Mobile hamburger menu (horizontal) or drawer (vertical)
 * - Horizontal and vertical orientations
 * - Collapsible sidebar mode (vertical)
 * 
 * @example Horizontal (header) navigation
 * ```tsx
 * import { NavigationMenu } from '@digistratum/layout';
 * 
 * function Header() {
 *   return (
 *     <NavigationMenu
 *       menuItemsProvider={(user, tenant) => [
 *         { id: 'home', label: 'Home', path: '/', icon: '🏠' },
 *         { id: 'dashboard', label: 'Dashboard', path: '/dashboard', badge: 3 },
 *       ]}
 *       user={currentUser}
 *       tenant={currentTenant}
 *       onNavigate={(path) => navigate(path)}
 *     />
 *   );
 * }
 * ```
 * 
 * @example Collapsible sidebar
 * ```tsx
 * function Sidebar() {
 *   const [collapsed, setCollapsed] = useState(false);
 *   
 *   return (
 *     <NavigationMenu
 *       orientation="vertical"
 *       menuItemsProvider={getMenuItems}
 *       collapsed={collapsed}
 *       onCollapsedChange={setCollapsed}
 *       sidebarHeader={<Logo collapsed={collapsed} />}
 *     />
 *   );
 * }
 * ```
 */
export function NavigationMenu({
  menuItemsProvider,
  getMenuItems,
  user = null,
  tenant = null,
  className = '',
  showMobileMenu = true,
  orientation = 'horizontal',
  onNavigate,
  // Collapsible sidebar props
  collapsed = false,
  onCollapsedChange,
  showCollapseToggle,
  // Mobile drawer props
  mobileDrawerOpen,
  onMobileDrawerChange,
  sidebarHeader,
  sidebarFooter,
}: NavigationMenuProps) {
  // Support both menuItemsProvider and deprecated getMenuItems
  const itemsCallback = menuItemsProvider || getMenuItems;
  
  // Validate that at least one callback is provided
  if (!itemsCallback) {
    console.warn('NavigationMenu: menuItemsProvider prop is required');
    return null;
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);
  const submenuRef = useRef<HTMLDivElement>(null);

  // Sync internal collapsed state with prop
  useEffect(() => {
    setInternalCollapsed(collapsed);
  }, [collapsed]);

  // Determine if we're controlling collapsed externally or internally
  const isCollapsed = onCollapsedChange ? collapsed : internalCollapsed;

  // Determine mobile drawer state (controlled or uncontrolled)
  const isDrawerOpen = onMobileDrawerChange ? mobileDrawerOpen : internalDrawerOpen;

  // Show collapse toggle by default for vertical orientation
  const shouldShowCollapseToggle = showCollapseToggle ?? (orientation === 'vertical');

  // Generate menu items from callback
  const allMenuItems = useMemo(() => {
    return itemsCallback(user, tenant);
  }, [itemsCallback, user, tenant]);

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

    // Close mobile menu/drawer after navigation
    setMobileMenuOpen(false);
    setInternalDrawerOpen(false);
    onMobileDrawerChange?.(false);
    setOpenSubmenu(null);
  }, [onNavigate, onMobileDrawerChange]);

  // Toggle submenu
  const toggleSubmenu = useCallback((itemId: string) => {
    setOpenSubmenu(prev => prev === itemId ? null : itemId);
  }, []);

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    const newCollapsed = !isCollapsed;
    if (onCollapsedChange) {
      onCollapsedChange(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
    // Close any open submenus when collapsing
    if (newCollapsed) {
      setOpenSubmenu(null);
    }
  }, [isCollapsed, onCollapsedChange]);

  // Toggle mobile drawer
  const toggleDrawer = useCallback(() => {
    const newOpen = !isDrawerOpen;
    if (onMobileDrawerChange) {
      onMobileDrawerChange(newOpen);
    } else {
      setInternalDrawerOpen(newOpen);
    }
  }, [isDrawerOpen, onMobileDrawerChange]);

  // Render badge
  const renderBadge = (badge: string | number | undefined, showInCollapsed = false) => {
    if (badge === undefined || badge === null) return null;
    if (isCollapsed && !showInCollapsed) return null;
    return (
      <span className={`
        px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200
        ${isCollapsed ? 'absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center' : 'ml-2'}
      `}>
        {badge}
      </span>
    );
  };

  // Render icon with optional tooltip for collapsed state
  const renderIcon = (icon: React.ReactNode, label: string) => {
    if (!icon) return null;
    
    if (isCollapsed && orientation === 'vertical') {
      return (
        <span className="relative group">
          <span className="text-lg">{icon}</span>
          <span className="absolute left-full ml-2 px-2 py-1 text-sm bg-gray-900 text-white rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
            {label}
          </span>
        </span>
      );
    }
    
    return <span className="mr-2">{icon}</span>;
  };

  // Render collapse toggle button
  const renderCollapseToggle = () => {
    if (!shouldShowCollapseToggle || orientation !== 'vertical') return null;
    
    return (
      <button
        type="button"
        onClick={toggleCollapsed}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
    );
  };

  // Render a single menu item
  const renderMenuItem = (item: MenuItem, isMobile = false, inDrawer = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const visibleChildren = hasChildren
      ? item.children!.filter(child => child.visible !== false)
      : [];
    const hasVisibleChildren = visibleChildren.length > 0;
    const isSubmenuOpen = openSubmenu === item.id;
    const isVerticalCollapsed = orientation === 'vertical' && isCollapsed && !inDrawer;

    const baseClasses = `
      relative flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
      ${item.disabled
        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
        : item.active
          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
      }
      ${isMobile || inDrawer ? 'w-full' : ''}
      ${isVerticalCollapsed ? 'justify-center px-2' : ''}
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
            {item.icon && renderIcon(item.icon, item.label)}
            {!isVerticalCollapsed && <span>{item.label}</span>}
            {renderBadge(item.badge, true)}
            {!isVerticalCollapsed && (
              <svg
                className={`ml-2 w-4 h-4 transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {/* Submenu dropdown */}
          {isSubmenuOpen && (
            <div
              className={`
                ${orientation === 'horizontal' && !isMobile
                  ? 'absolute left-0 mt-1 w-48'
                  : isVerticalCollapsed
                    ? 'absolute left-full top-0 ml-1 w-48'
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
          title={isVerticalCollapsed ? item.label : undefined}
        >
          {item.icon && renderIcon(item.icon, item.label)}
          {!isVerticalCollapsed && <span>{item.label}</span>}
          {renderBadge(item.badge, true)}
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
        title={isVerticalCollapsed ? item.label : undefined}
      >
        {item.icon && renderIcon(item.icon, item.label)}
        {!isVerticalCollapsed && <span>{item.label}</span>}
        {renderBadge(item.badge, true)}
      </button>
    );
  };

  // Render mobile drawer for vertical orientation
  const renderMobileDrawer = () => {
    if (orientation !== 'vertical' || !showMobileMenu) return null;

    return (
      <>
        {/* Mobile drawer toggle button */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <button
            type="button"
            onClick={toggleDrawer}
            className="p-2 bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-700"
            aria-label="Toggle navigation drawer"
            aria-expanded={isDrawerOpen}
          >
            {isDrawerOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Backdrop */}
        {isDrawerOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={toggleDrawer}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <div
          className={`
            md:hidden fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl z-50
            transform transition-transform duration-300 ease-in-out
            ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              {sidebarHeader || <span className="font-semibold text-gray-900 dark:text-white">Menu</span>}
              <button
                type="button"
                onClick={toggleDrawer}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {menuItems.map(item => renderMenuItem(item, false, true))}
            </nav>

            {/* Drawer footer */}
            {sidebarFooter && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                {sidebarFooter}
              </div>
            )}
          </div>
        </div>
      </>
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
    <>
      {/* Mobile drawer */}
      {renderMobileDrawer()}

      {/* Desktop sidebar */}
      <aside
        className={`
          ds-navigation-menu hidden md:flex flex-col
          ${isCollapsed ? 'w-16' : 'w-64'}
          transition-all duration-300 ease-in-out
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          ${className}
        `}
      >
        {/* Sidebar header */}
        {(sidebarHeader || shouldShowCollapseToggle) && (
          <div className={`
            flex items-center p-4 border-b border-gray-200 dark:border-gray-700
            ${isCollapsed ? 'justify-center' : 'justify-between'}
          `}>
            {!isCollapsed && sidebarHeader}
            {renderCollapseToggle()}
          </div>
        )}

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        {/* Sidebar footer */}
        {sidebarFooter && !isCollapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            {sidebarFooter}
          </div>
        )}
      </aside>
    </>
  );
}
