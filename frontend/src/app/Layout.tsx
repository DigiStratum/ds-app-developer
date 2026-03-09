import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AppShell, type MenuItem, type Tenant, type User } from '@digistratum/layout';
import type { AuthContext, ThemeContext } from '@digistratum/layout';
import { useAuth } from '../boilerplate/useAuth';
import { useTheme } from '@digistratum/ds-core';
import { DeveloperFooter, FooterLink } from '../boilerplate/DeveloperFooter';
import { DeveloperToolsToggle } from './features/DeveloperToolsToggle';
import { PlaceholderAd } from './features/PlaceholderAd';
import { PlaceholderCustomHeader } from './features/PlaceholderCustomHeader';
import { useDeveloperToolsSafe } from './features/useDeveloperTools';

interface LayoutProps {
  children: ReactNode;
  appName?: string;
  appLogo?: string;
  currentAppId?: string;
  extraFooterLinks?: FooterLink[];
  showAppSwitcher?: boolean;
  showThemeToggle?: boolean;
  showUserMenu?: boolean;
  showGdprBanner?: boolean;
}

/**
 * Standard layout wrapper using AppShell
 * 
 * Layout structure:
 * - Custom Header (app-specific, above nav) - toggled via Developer Tools
 * - Header: navigation bar
 * - Header Ad Slot: between header and main content
 * - Main Content: app content area
 * - Footer Ad Slot: between main content and footer
 * - Footer: copyright, legal links
 */
export function Layout({ 
  children, 
  appName = 'DS Developer', 
  appLogo,
  currentAppId = 'dsdeveloper',
  extraFooterLinks = [],
  showAppSwitcher = true,
  showThemeToggle = false,
  showUserMenu = true,
  showGdprBanner = true,
}: LayoutProps) {
  const { user, isAuthenticated, login, logout, currentTenant, switchTenant } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { showAdDemo, showCustomHeader } = useDeveloperToolsSafe();
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
   * Get Developer app menu items based on user context
   */
  const getMenuItems = (authUser: User | null, _tenant: Tenant | null): MenuItem[] => {
    const items: MenuItem[] = [];

    if (authUser) {
      items.push({
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: '📊',
        active: location.pathname === '/dashboard',
      });

      items.push({
        id: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: '⚙️',
        active: location.pathname === '/settings',
      });
    }

    return items;
  };

  // Custom footer
  const customFooter = (
    <DeveloperFooter 
      appName={appName}
      showGdprBanner={showGdprBanner}
      extraLinks={extraFooterLinks}
      showAdToggle={false}
    />
  );

  // Developer Tools menu content - NO separator, just the toggles
  const menuContent = (
    <div className="space-y-1">
      <p className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
        Developer Tools
      </p>
      <div className="px-3 py-2">
        <DeveloperToolsToggle />
      </div>
    </div>
  );

  return (
    <AppShell
      appName={appName}
      currentAppId={currentAppId}
      logoUrl={appLogo}
      auth={auth}
      theme={themeContext}
      getMenuItems={getMenuItems}
      customFooter={customFooter}
      showAppSwitcher={showAppSwitcher}
      showThemeToggle={showThemeToggle}
      showUserMenu={showUserMenu}
      showPreferences={true}
      showGdprBanner={false}
      menuContent={menuContent}
      customHeader={showCustomHeader ? <PlaceholderCustomHeader /> : undefined}
      headerAdSlot={showAdDemo ? <PlaceholderAd position="header" /> : undefined}
      footerAdSlot={showAdDemo ? <PlaceholderAd position="footer" /> : undefined}
    >
      {children}
    </AppShell>
  );
}
