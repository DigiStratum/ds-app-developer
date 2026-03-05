import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AppShell, CustomHeaderZone, type MenuItem, type Tenant } from '@digistratum/layout';
import type { AuthContext, ThemeContext, User } from '@digistratum/layout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@digistratum/ds-core';
import { useTranslation } from 'react-i18next';
import { DeveloperFooter } from './DeveloperFooter';
import { AdSlot } from './AdSlot';
import { PlaceholderAd } from './PlaceholderAd';
import { useAdDemoSafe } from '../hooks/useAdDemo';

interface DeveloperAppShellProps {
  children: ReactNode;
  /** App display name (default: 'DS Developer') */
  appName?: string;
  /** App logo URL */
  appLogo?: string;
  /** Current app ID for app-switcher highlighting (default: 'dsdeveloper') */
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
 * DeveloperAppShell - Reference implementation of AppShell for DS Developer Portal
 * 
 * This is the reference implementation showing how to integrate AppShell (#587-592)
 * in a DS app. Other apps can follow this pattern:
 * 
 * 1. Wrap AppShell with app-specific defaults
 * 2. Implement getMenuItems callback for app-specific navigation
 * 3. Integrate auth/theme contexts
 * 4. Use custom footer if needed (or let AppShell use DSFooter)
 * 5. Optionally use CustomHeaderZone for app-specific branding above the header
 * 
 * @example
 * ```tsx
 * import { DeveloperAppShell } from './components/DeveloperAppShell';
 * 
 * function DashboardPage() {
 *   return (
 *     <DeveloperAppShell>
 *       <h1>Dashboard</h1>
 *       <p>Your dashboard content here</p>
 *     </DeveloperAppShell>
 *   );
 * }
 * ```
 */
export function DeveloperAppShell({
  children,
  appName = 'DS Developer',
  appLogo,
  currentAppId = 'dsdeveloper',
  showAppSwitcher = true,
  showThemeToggle = false,
  showUserMenu = true,
  showGdprBanner = true,
  customHeaderContent,
}: DeveloperAppShellProps) {
  const { user, isAuthenticated, login, logout, currentTenant, switchTenant } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const location = useLocation();
  const { showAdDemo } = useAdDemoSafe();

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
   * Get Developer-specific menu items based on user and tenant context
   * 
   * This callback defines the navigation structure for the Developer Portal.
   * Menu items can be conditionally included based on:
   * - Authentication state (user present or null)
   * - Current tenant context
   * - User roles/permissions
   */
  const getMenuItems = (authUser: User | null, _tenant: Tenant | null): MenuItem[] => {
    const items: MenuItem[] = [];
    
    // Authenticated user navigation
    if (authUser) {
      items.push({
        id: 'dashboard',
        label: t('nav.dashboard', 'Dashboard'),
        path: '/dashboard',
        icon: '📊',
        active: location.pathname === '/dashboard',
      });

    }

    return items;
  };

  // Custom footer using DeveloperFooter component
  const customFooter = (
    <DeveloperFooter
      appName={appName}
      showGdprBanner={showGdprBanner}
    />
  );

  // Custom header zone for app-specific branding (collapses when empty)
  // This demonstrates how to use CustomHeaderZone for announcements, branding, etc.
  const customHeader = customHeaderContent ? (
    <CustomHeaderZone>
      {customHeaderContent}
    </CustomHeaderZone>
  ) : undefined;

  return (
    <>
      <AppShell
        appName={appName}
        currentAppId={currentAppId}
        logoUrl={appLogo}
        auth={auth}
        theme={themeContext}
        getMenuItems={getMenuItems}
        customHeader={customHeader}
        customFooter={customFooter}
        showAppSwitcher={showAppSwitcher}
        showThemeToggle={showThemeToggle}
        showUserMenu={showUserMenu}
        showGdprBanner={false} // Using custom footer with GDPR banner
        appsApiUrl="/api/apps" // Fetch apps from DSAccount registry
      >
        <AdSlot position="header">
          {showAdDemo && <PlaceholderAd position="header" />}
        </AdSlot>
        {children}
        <AdSlot position="footer">
          {showAdDemo && <PlaceholderAd position="footer" />}
        </AdSlot>
      </AppShell>
    </>
  );
}
