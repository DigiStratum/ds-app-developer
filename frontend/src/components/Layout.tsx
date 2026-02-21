import { ReactNode } from 'react';
import { SkeletonHeader, MenuItem } from './SkeletonHeader';
import { SkeletonFooter, FooterLink } from './SkeletonFooter';
import { AdSlot } from './AdSlot';

interface LayoutProps {
  children: ReactNode;
  appName?: string;
  appLogo?: string;
  currentAppId?: string;  // Highlights current app in app-switcher
  /** Custom menu items for app-specific navigation */
  menuItems?: MenuItem[];
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

// Standard layout wrapper [FR-NAV-001, FR-NAV-003, FR-NAV-004]
// Layout structure: Header (rounded bottom) -> AdSlot -> Content (fully rounded) -> AdSlot -> Footer (rounded top)
// Page background is the margin color; containers float as distinct rounded elements
// Side margins: 5px on desktop, 0 on mobile (#291)
//
// Now uses SkeletonHeader and SkeletonFooter for standardized, configurable navigation.
export function Layout({ 
  children, 
  appName = 'DS App', 
  appLogo,
  currentAppId,
  menuItems = [],
  extraFooterLinks = [],
  showAppSwitcher = true,
  showThemeToggle = true,
  showUserMenu = true,
  showGdprBanner = true,
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--ds-bg-margin)' }}>
      <header className="ds-container-margins">
        <SkeletonHeader 
          appName={appName}
          appLogo={appLogo}
          currentAppId={currentAppId}
          menuItems={menuItems}
          showAppSwitcher={showAppSwitcher}
          showThemeToggle={showThemeToggle}
          showUserMenu={showUserMenu}
        />
      </header>
      <AdSlot position="header" />
      <main 
        className="ds-container-margins flex-1 bg-gray-50 dark:bg-gray-900"
        style={{ borderRadius: 'var(--ds-container-radius)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <AdSlot position="footer" />
      <footer className="ds-container-margins">
        <SkeletonFooter 
          appName={appName}
          showGdprBanner={showGdprBanner}
          extraLinks={extraFooterLinks}
        />
      </footer>
    </div>
  );
}
