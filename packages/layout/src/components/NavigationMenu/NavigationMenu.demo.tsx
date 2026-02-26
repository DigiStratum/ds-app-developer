/**
 * NavigationMenu Demo - Example usage demonstrating all patterns
 * 
 * This file shows how to use the NavigationMenu component with:
 * - Role-based menu generation via callback
 * - Nested items (submenus)
 * - Badges for notifications
 * - onClick handlers
 * - Visibility control
 * - Mobile responsive hamburger menu
 * 
 * @example Import in your app:
 * ```tsx
 * import { NavigationMenu, MenuItem } from '@digistratum/layout';
 * ```
 */

import { NavigationMenu } from './NavigationMenu';
import type { MenuItem, Tenant } from './types';
import type { User } from '../../types';

/**
 * Example: Role-based menu generation callback
 * 
 * This pattern allows apps to define menus that adapt to:
 * - Authenticated vs guest users
 * - User roles (admin, member, viewer)
 * - Tenant context
 */
export function getExampleMenuItems(user: User | null, tenant: Tenant | null): MenuItem[] {
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
}

/**
 * Example NavigationMenu component usage
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

  const handleNavigate = (path: string) => {
    console.log('Navigate to:', path);
    // In real app: navigate(path) or router.push(path)
  };

  return (
    <div className="p-4 space-y-8">
      <h2 className="text-xl font-bold">NavigationMenu Demo</h2>

      {/* Horizontal navigation (header style) */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Horizontal (Header)</h3>
        <div className="relative bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <NavigationMenu
            getMenuItems={getExampleMenuItems}
            user={mockUser}
            tenant={mockTenant}
            orientation="horizontal"
            onNavigate={handleNavigate}
          />
        </div>
      </section>

      {/* Vertical navigation (sidebar style) */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Vertical (Sidebar)</h3>
        <div className="w-64 bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <NavigationMenu
            getMenuItems={getExampleMenuItems}
            user={mockUser}
            tenant={mockTenant}
            orientation="vertical"
            onNavigate={handleNavigate}
          />
        </div>
      </section>

      {/* Guest view (no user) */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Guest View (No User)</h3>
        <div className="relative bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <NavigationMenu
            getMenuItems={getExampleMenuItems}
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
        <div className="relative bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <NavigationMenu
            getMenuItems={getExampleMenuItems}
            user={mockUser}
            tenant={{ id: 'tenant-2', name: 'Beta Inc', role: 'member' }}
            orientation="horizontal"
            onNavigate={handleNavigate}
          />
        </div>
      </section>
    </div>
  );
}
