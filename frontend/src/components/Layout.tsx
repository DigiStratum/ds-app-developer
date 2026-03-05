import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AppShell, type MenuItem, type Tenant, type User } from '@digistratum/layout';
import type { AuthContext, ThemeContext } from '@digistratum/layout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@digistratum/ds-core';
import { DeveloperFooter, FooterLink } from './DeveloperFooter';
import { AdSlot } from './AdSlot';
import { AdDemoToggle } from './AdDemoToggle';
import { PlaceholderAd } from './PlaceholderAd';
import { useAdDemoSafe } from '../hooks/useAdDemo';

interface LayoutProps {
  children: ReactNode;
  appName?: string;
  appLogo?: string;
  currentAppId?: string;  // Highlights current app in app-switcher
  /** Additional footer links */
  extraFooterLinks?: FooterLink[];
  /** Show app switcher in header (default: true) */
  showAppSwitcher?: boolean;
  /** Show theme toggle in header (default: true) */
  showThemeToggle?: boolean;
  /** Show user menu in header (default: true) */
  showUserMenu?: boolean;
  /** Show GDPR banner in footer (default: true) */
  showGdprBanner?: boolean;
}

/**
 * Standard layout wrapper using AppShell [FR-NAV-001, FR-NAV-003, FR-NAV-004]
 * 
 * This is the reference implementation - Developer app eats its own dog food
 * by using AppShell from @digistratum/layout. Changes to AppShell are validated
 * here before being pushed to other DS apps.
 * 
 * Layout structure (provided by AppShell):
 * - Header: white bg, bottom corners radiused
 * - Main Content: white bg, all four corners radiused
 * - Footer: white bg, top corners radiused
 * 
 * App-specific additions:
 * - AdSlots between header/content and content/footer
 * - Developer Tools menu section with AdDemoToggle
 * - Custom DeveloperFooter
 */
export function Layout({ 
  children, 
  appName = 'DS Developer', 
  appLogo,
  currentAppId = 'developer',
  extraFooterLinks = [],
  showAppSwitcher = true,
  showThemeToggle = false,
  showUserMenu = true,
  showGdprBanner = true,
}: LayoutProps) {
  const { user, isAuthenticated, login, logout, currentTenant, switchTenant } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { showAdDemo } = useAdDemoSafe();
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
   * 
   * This callback defines navigation for the Developer app.
   * Items can be conditionally included based on auth state.
   */
  const getMenuItems = (authUser: User | null, _tenant: Tenant | null): MenuItem[] => {
    const items: MenuItem[] = [];

    // Authenticated user navigation
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

  // Custom footer with Developer-specific options
  const customFooter = (
    <DeveloperFooter 
      appName={appName}
      showGdprBanner={showGdprBanner}
      extraLinks={extraFooterLinks}
      showAdToggle={false}
    />
  );

  // Developer Tools menu content (AdDemoToggle)
  const menuContent = (
    <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
      <p className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
        Developer Tools
      </p>
      <div className="px-3 py-2">
        <AdDemoToggle />
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
      showPreferences={false}
      showGdprBanner={false}
      menuContent={menuContent}
    >
      {/* Ad slot between header and content */}
      <AdSlot position="header">
        {showAdDemo && <PlaceholderAd position="header" />}
      </AdSlot>
      
      {children}
      
      {/* Ad slot between content and footer */}
      <AdSlot position="footer">
        {showAdDemo && <PlaceholderAd position="footer" />}
      </AdSlot>
    </AppShell>
  );
}
