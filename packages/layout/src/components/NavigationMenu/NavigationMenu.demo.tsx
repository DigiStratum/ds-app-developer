/**
 * NavigationMenu Demo - Example usage demonstrating all patterns
 * 
 * This file shows how to use the NavigationMenu component with:
 * - Role-based menu generation via callback
 * - Nested items (submenus)
 * - Badges for notifications
 * - onClick handlers
 * - Visibility control
 * - Mobile responsive (hamburger menu for horizontal, drawer for vertical)
 * - Collapsible sidebar mode
 * 
 * @example Import in your app:
 * ```tsx
 * import { NavigationMenu, MenuItem, MenuItemsProvider } from '@digistratum/layout';
 * ```
 */

import { useState } from 'react';
import { NavigationMenu } from './NavigationMenu';
import type { MenuItem, Tenant, MenuItemsProvider } from './types';
import type { User } from '../../types';

/**
 * Example: Role-based menu generation callback
 * 
 * This pattern allows apps to define menus that adapt to:
 * - Authenticated vs guest users
 * - User roles (admin, member, viewer)
 * - Tenant context
 */
export const exampleMenuItemsProvider: MenuItemsProvider = (user, tenant) => {
  const items: MenuItem[] = [];

  // Public items - always visible
  items.push({
    id: 'home',
    label: 'Home',
    path: '/',
    icon: '🏠',
  });

  items.push({
    id: 'docs',
    label: 'Documentation',
    path: '/docs',
    icon: '📚',
  });

  // Authenticated user items
  if (user) {
    items.push({
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      badge: 3, // Example: 3 notifications
    });

    // Nested menu example
    items.push({
      id: 'projects',
      label: 'Projects',
      icon: '📁',
      children: [
        { id: 'projects-list', label: 'All Projects', path: '/projects' },
        { id: 'projects-active', label: 'Active', path: '/projects?status=active', badge: 5 },
        { id: 'projects-archived', label: 'Archived', path: '/projects?status=archived' },
        {
          id: 'projects-create',
          label: 'Create Project',
          onClick: () => console.log('Open create project modal'),
          icon: '➕',
        },
      ],
    });

    // Settings with role-based visibility
    items.push({
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      children: [
        { id: 'settings-profile', label: 'Profile', path: '/settings/profile' },
        { id: 'settings-notifications', label: 'Notifications', path: '/settings/notifications' },
        {
          id: 'settings-billing',
          label: 'Billing',
          path: '/settings/billing',
          // Only show billing for admin users
          visible: tenant?.role === 'admin',
        },
        {
          id: 'settings-team',
          label: 'Team Management',
          path: '/settings/team',
          // Only show for admin role
          visible: tenant?.role === 'admin',
          badge: 'New',
        },
      ],
    });
  }

  // Admin-only items
  if (tenant?.role === 'admin') {
    items.push({
      id: 'admin',
      label: 'Admin',
      icon: '🔧',
      children: [
        { id: 'admin-users', label: 'User Management', path: '/admin/users' },
        { id: 'admin-logs', label: 'Audit Logs', path: '/admin/logs' },
        { id: 'admin-settings', label: 'System Settings', path: '/admin/settings' },
      ],
    });
  }

  // Help menu - always visible, with onClick action
  items.push({
    id: 'help',
    label: 'Help',
    icon: '❓',
    onClick: () => {
      console.log('Open help modal');
      // Could open a modal, trigger a tour, etc.
    },
  });

  return items;
};

// Keep the old name for backwards compatibility
export const getExampleMenuItems = exampleMenuItemsProvider;

/**
 * Example NavigationMenu component usage - All features demo
 */
export function NavigationMenuDemo() {
  // Mock user and tenant for demo
  const mockUser: User = {
    id: 'user-123',
    email: 'demo@example.com',
    name: 'Demo User',
    tenants: [
      { id: 'tenant-1', name: 'Acme Corp', role: 'admin' },
      { id: 'tenant-2', name: 'Beta Inc', role: 'member' },
    ],
  };

  const mockTenant: Tenant = {
    id: 'tenant-1',
    name: 'Acme Corp',
    role: 'admin',
  };

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mobile drawer state (for controlled example)
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNavigate = (path: string) => {
    console.log('Navigate to:', path);
    // In real app: navigate(path) or router.push(path)
  };

  // Custom sidebar header
  const SidebarHeader = ({ collapsed }: { collapsed: boolean }) => (
    <div className="flex items-center">
      <span className="text-2xl">🚀</span>
      {!collapsed && <span className="ml-2 font-bold text-gray-900 dark:text-white">MyApp</span>}
    </div>
  );

  // Custom sidebar footer
  const SidebarFooter = () => (
    <div className="text-xs text-gray-500 dark:text-gray-400">
      <p>Version 1.0.0</p>
      <a href="/support" className="hover:text-blue-500">Support</a>
    </div>
  );

  return (
    <div className="p-4 space-y-8">
      <h2 className="text-xl font-bold">NavigationMenu Demo</h2>

      {/* Horizontal navigation (header style) */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Horizontal (Header)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Default orientation for header navigation. Includes mobile hamburger menu.
        </p>
        <div className="relative bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <NavigationMenu
            menuItemsProvider={exampleMenuItemsProvider}
            user={mockUser}
            tenant={mockTenant}
            orientation="horizontal"
            onNavigate={handleNavigate}
          />
        </div>
      </section>

      {/* Vertical navigation (sidebar style) */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Vertical (Sidebar) - Expanded</h3>
        <p className="text-sm text-gray-600 mb-4">
          Sidebar navigation with collapsible support. Try the collapse toggle!
        </p>
        <div className="flex">
          <NavigationMenu
            menuItemsProvider={exampleMenuItemsProvider}
            user={mockUser}
            tenant={mockTenant}
            orientation="vertical"
            onNavigate={handleNavigate}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            sidebarHeader={<SidebarHeader collapsed={sidebarCollapsed} />}
            sidebarFooter={<SidebarFooter />}
            className="rounded-lg"
          />
          <div className="flex-1 p-4 ml-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              Sidebar is {sidebarCollapsed ? 'collapsed' : 'expanded'}.
              {' '}Click the toggle to {sidebarCollapsed ? 'expand' : 'collapse'}.
            </p>
          </div>
        </div>
      </section>

      {/* Collapsed sidebar */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Vertical (Sidebar) - Collapsed</h3>
        <p className="text-sm text-gray-600 mb-4">
          Collapsed sidebar shows only icons with tooltips on hover.
        </p>
        <div className="flex">
          <NavigationMenu
            menuItemsProvider={exampleMenuItemsProvider}
            user={mockUser}
            tenant={mockTenant}
            orientation="vertical"
            onNavigate={handleNavigate}
            collapsed={true}
            showCollapseToggle={false}
            className="rounded-lg"
          />
          <div className="flex-1 p-4 ml-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              Hover over icons to see tooltips with labels.
            </p>
          </div>
        </div>
      </section>

      {/* Guest view (no user) */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Guest View (No User)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Shows only public menu items when user is not authenticated.
        </p>
        <div className="relative bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <NavigationMenu
            menuItemsProvider={exampleMenuItemsProvider}
            user={null}
            tenant={null}
            orientation="horizontal"
            onNavigate={handleNavigate}
          />
        </div>
      </section>

      {/* Member view (limited permissions) */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Member View (Limited Permissions)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Shows user items but hides admin-only items.
        </p>
        <div className="relative bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <NavigationMenu
            menuItemsProvider={exampleMenuItemsProvider}
            user={mockUser}
            tenant={{ id: 'tenant-2', name: 'Beta Inc', role: 'member' }}
            orientation="horizontal"
            onNavigate={handleNavigate}
          />
        </div>
      </section>

      {/* Mobile drawer demo info */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Mobile Drawer (resize to see)</h3>
        <p className="text-sm text-gray-600 mb-4">
          On mobile screens (&lt;768px), vertical navigation shows as a slide-out drawer.
          The floating hamburger button appears in the top-left corner.
        </p>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-blue-800 dark:text-blue-200">
            💡 <strong>Tip:</strong> Resize your browser window to mobile width to see
            the drawer behavior. On desktop, the sidebar renders inline.
          </p>
        </div>
      </section>
    </div>
  );
}
