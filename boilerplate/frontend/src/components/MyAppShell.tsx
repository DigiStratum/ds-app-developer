import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AppShell, CustomHeaderZone, type MenuItem, type Tenant } from '@digistratum/layout';
import type { AuthContext, ThemeContext, User } from '@digistratum/layout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
// import { useTranslation } from 'react-i18next'; // Uncomment when i18n is configured

interface MyAppShellProps {
  children: ReactNode;
  /** App display name (default: '{{APP_NAME}}') */
  appName?: string;
  /** App logo URL */
  appLogo?: string;
  /** Current app ID for app-switcher highlighting (default: '{{APP_ID}}') */
  currentAppId?: string;
  /** Show app switcher in header (default: true) */
  showAppSwitcher?: boolean;
  /** Show theme toggle in header (default: true) */
  showThemeToggle?: boolean;
  /** Show user menu in header (default: true) */
  showUserMenu?: boolean;
  /** Show GDPR banner in footer (default: true) */
  showGdprBanner?: boolean;
  /** Custom header content (rendered in CustomHeaderZone above DSHeader) */
  customHeaderContent?: ReactNode;
}

/**
 * MyAppShell - Reference implementation of AppShell for {{APP_NAME}}
 * 
 * This is based on the ds-app-developer DeveloperAppShell pattern.
 * Customize this component for your app's specific needs:
 * 
 * 1. Update default appName and currentAppId
 * 2. Implement getMenuItems for your app's navigation
 * 3. Integrate auth/theme contexts from your hooks
 * 4. Optionally use CustomHeaderZone for branding
 * 5. Use custom footer if needed
 * 
 * @example
 * ```tsx
 * import { MyAppShell } from './components/MyAppShell';
 * 
 * function DashboardPage() {
 *   return (
 *     <MyAppShell>
 *       <h1>Dashboard</h1>
 *       <p>Your dashboard content here</p>
 *     </MyAppShell>
 *   );
 * }
 * ```
 */
export function MyAppShell({
  children,
  appName = '{{APP_NAME}}',
  appLogo,
  currentAppId = '{{APP_ID}}',
  showAppSwitcher = true,
  showThemeToggle = true,
  showUserMenu = true,
  showGdprBanner = true,
  customHeaderContent,
}: MyAppShellProps) {
  const { user, isAuthenticated, login, logout, currentTenant, switchTenant } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  // const { t } = useTranslation(); // Uncomment when i18n is configured
  const location = useLocation();

  // Build auth context for AppShell
  const auth: AuthContext = {
    user: user ? {
      id: user.id || user.email || 'unknown',
      email: user.email || '',
      name: user.display_name || user.name,
      tenants: user.tenants,
    } : null,
    isAuthenticated,
    currentTenant,
    login,
    logout,
    switchTenant,
  };

  // Build theme context for AppShell
  const themeContext: ThemeContext = {
    theme,
    resolvedTheme,
    setTheme,
  };

  /**
   * Get app-specific menu items based on user and tenant context
   * 
   * This callback defines the navigation structure for your app.
   * Menu items can be conditionally included based on:
   * - Authentication state (user present or null)
   * - Current tenant context
   * - User roles/permissions
   * 
   * TODO: Customize these menu items for your app's needs
   */
  const getMenuItems = (authUser: User | null, _tenant: Tenant | null): MenuItem[] => {
    const items: MenuItem[] = [];
    
    // Public navigation items (available to all users)
    items.push({
      id: 'home',
      label: 'Home', // Replace with t('nav.home', 'Home') when i18n is configured
      path: '/',
      icon: '🏠',
      active: location.pathname === '/',
    });

    // Authenticated user navigation
    if (authUser) {
      items.push({
        id: 'dashboard',
        label: 'Dashboard', // Replace with t('nav.dashboard', 'Dashboard')
        path: '/dashboard',
        icon: '📊',
        active: location.pathname === '/dashboard',
      });

      // TODO: Add more authenticated-only routes here
      // items.push({
      //   id: 'settings',
      //   label: 'Settings',
      //   path: '/settings',
      //   icon: '⚙️',
      //   active: location.pathname === '/settings',
      // });
    }

    return items;
  };

  // Custom header zone for app-specific branding (collapses when empty)
  // This demonstrates how to use CustomHeaderZone for announcements, branding, etc.
  const customHeader = customHeaderContent ? (
    <CustomHeaderZone>
      {customHeaderContent}
    </CustomHeaderZone>
  ) : undefined;

  return (
    <AppShell
      appName={appName}
      currentAppId={currentAppId}
      logoUrl={appLogo}
      auth={auth}
      theme={themeContext}
      getMenuItems={getMenuItems}
      customHeader={customHeader}
      showAppSwitcher={showAppSwitcher}
      showThemeToggle={showThemeToggle}
      showUserMenu={showUserMenu}
      showGdprBanner={showGdprBanner}
      appsApiUrl="/api/apps" // Fetch apps from DSAccount registry
    >
      {children}
    </AppShell>
  );
}
