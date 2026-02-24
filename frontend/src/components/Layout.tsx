import { ReactNode } from 'react';
import { DSHeader } from '@digistratum/layout';
import type { AuthContext, ThemeContext } from '@digistratum/layout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@digistratum/ds-core';
import { DeveloperFooter, FooterLink } from './DeveloperFooter';
import { AdSlot } from './AdSlot';

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
 * Standard layout wrapper [FR-NAV-001, FR-NAV-003, FR-NAV-004]
 * 
 * Layout structure:
 * - Header: white bg, bottom corners radiused
 * - AdSlot (optional)
 * - Main Content: white bg, all four corners radiused
 * - AdSlot (optional)  
 * - Footer: white bg, top corners radiused
 * 
 * Page background is the margin color (medium gray in light, dark gray in dark).
 * Containers float as distinct rounded elements with side margins.
 * Side margins: 5px on desktop, 0 on mobile (#291)
 *
 * Uses DSHeader from @digistratum/layout for standardized navigation.
 * App-specific content is inserted into the main content container via {children}.
 */
export function Layout({ 
  children, 
  appName = 'DS Developer', 
  appLogo,
  currentAppId = 'dsdeveloper',
  extraFooterLinks = [],
  showAppSwitcher = true,
  showThemeToggle = true,
  showUserMenu = true,
  showGdprBanner = true,
}: LayoutProps) {
  const { user, isAuthenticated, login, logout, currentTenant, switchTenant } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Build auth context for DSHeader
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

  // Build theme context for DSHeader
  const themeContext: ThemeContext = {
    theme,
    resolvedTheme,
    setTheme,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--ds-bg-margin)' }}>
      {/* Header - white bg, bottom corners radiused */}
      <header 
        className="ds-container-margins bg-white dark:bg-gray-800"
        style={{ borderBottomLeftRadius: 'var(--ds-container-radius)', borderBottomRightRadius: 'var(--ds-container-radius)' }}
      >
        <DSHeader 
          appName={appName}
          logoUrl={appLogo}
          currentAppId={currentAppId}
          auth={auth}
          theme={themeContext}
          showAppSwitcher={showAppSwitcher}
          showThemeToggle={showThemeToggle}
          showUserMenu={showUserMenu}
          showPreferences={false}
          showTenantSwitcher={true}
        />
      </header>
      
      <AdSlot position="header" />
      
      {/* Main Content - white bg, all four corners radiused */}
      <main 
        className="ds-container-margins flex-1 bg-white dark:bg-gray-800 my-2"
        style={{ borderRadius: 'var(--ds-container-radius)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      
      <AdSlot position="footer" />
      
      {/* Footer - white bg, top corners radiused */}
      <footer 
        className="ds-container-margins bg-white dark:bg-gray-800"
        style={{ borderTopLeftRadius: 'var(--ds-container-radius)', borderTopRightRadius: 'var(--ds-container-radius)' }}
      >
        <DeveloperFooter 
          appName={appName}
          showGdprBanner={showGdprBanner}
          extraLinks={extraFooterLinks}
        />
      </footer>
    </div>
  );
}
