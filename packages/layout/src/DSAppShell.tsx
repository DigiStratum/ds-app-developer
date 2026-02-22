import { ReactNode } from 'react';
import type { DSAppShellProps, SlotConfig } from './types';
import { DSHeader } from './DSHeader';
import { DSFooter } from './DSFooter';
import { AdSlot } from './AdSlot';

/**
 * DSAppShell - Main layout wrapper for DigiStratum applications
 * 
 * Provides a consistent app shell with:
 * - privateBrandedHeader (collapsible) - for tenant-specific branding
 * - header - standard DS nav with logo, nav, app-switcher, preferences, account
 * - leftAdMargin (collapsible) - for sidebar/ad content
 * - mainContent - where your app renders
 * - rightAdMargin (collapsible) - for sidebar/ad content
 * - footer - copyright, legal links, GDPR banner
 * 
 * @example
 * ```tsx
 * import { DSAppShell } from '@digistratum/layout';
 * 
 * function App() {
 *   return (
 *     <DSAppShell
 *       appName="MyApp"
 *       auth={authContext}
 *       theme={themeContext}
 *     >
 *       <MyAppContent />
 *     </DSAppShell>
 *   );
 * }
 * ```
 */
export function DSAppShell({
  children,
  appName,
  currentAppId,
  logoUrl,
  logoAlt,
  auth,
  theme,
  navLinks = [],
  apps = [],
  footerLinks,
  copyrightHolder = 'DigiStratum',
  privateBrandedHeader,
  leftAdMargin,
  rightAdMargin,
  showAppSwitcher = true,
  showThemeToggle = true,
  showUserMenu = true,
  showPreferences = true,
  showGdprBanner = true,
  showTenantSwitcher = true,
  className = '',
  contentClassName = '',
  renderHeader,
  renderFooter,
}: DSAppShellProps) {
  // Render slot helper
  const renderSlot = (slot: SlotConfig | undefined, defaultVisible = true): ReactNode => {
    if (!slot) return null;
    if (slot.visible === false) return null;
    if (!slot.content) return null;
    return (
      <div className={slot.className}>
        {slot.content}
      </div>
    );
  };

  const headerContent = renderHeader ? (
    renderHeader({
      children,
      appName,
      currentAppId,
      logoUrl,
      logoAlt,
      auth,
      theme,
      navLinks,
      apps,
      footerLinks,
      copyrightHolder,
      privateBrandedHeader,
      leftAdMargin,
      rightAdMargin,
      showAppSwitcher,
      showThemeToggle,
      showUserMenu,
      showPreferences,
      showGdprBanner,
      showTenantSwitcher,
      className,
      contentClassName,
    })
  ) : (
    <DSHeader
      appName={appName}
      currentAppId={currentAppId}
      logoUrl={logoUrl}
      logoAlt={logoAlt}
      auth={auth}
      theme={theme}
      navLinks={navLinks}
      apps={apps}
      showAppSwitcher={showAppSwitcher}
      showThemeToggle={showThemeToggle}
      showUserMenu={showUserMenu}
      showPreferences={showPreferences}
      showTenantSwitcher={showTenantSwitcher}
    />
  );

  const footerContent = renderFooter ? (
    renderFooter({
      children,
      appName,
      currentAppId,
      logoUrl,
      logoAlt,
      auth,
      theme,
      navLinks,
      apps,
      footerLinks,
      copyrightHolder,
      privateBrandedHeader,
      leftAdMargin,
      rightAdMargin,
      showAppSwitcher,
      showThemeToggle,
      showUserMenu,
      showPreferences,
      showGdprBanner,
      showTenantSwitcher,
      className,
      contentClassName,
    })
  ) : (
    <DSFooter
      appName={appName}
      links={footerLinks}
      copyrightHolder={copyrightHolder}
      showGdprBanner={showGdprBanner}
    />
  );

  return (
    <div 
      className={`ds-app-shell min-h-screen flex flex-col ${className}`}
      style={{ backgroundColor: 'var(--ds-bg-margin, #f3f4f6)' }}
    >
      {/* Private branded header slot (collapsible) */}
      {renderSlot(privateBrandedHeader)}

      {/* Main header */}
      <header 
        className="ds-container-margins bg-white dark:bg-gray-800"
        style={{ 
          borderBottomLeftRadius: 'var(--ds-container-radius, 8px)', 
          borderBottomRightRadius: 'var(--ds-container-radius, 8px)' 
        }}
      >
        {headerContent}
      </header>

      {/* Top ad slot */}
      <AdSlot position="header" />

      {/* Main content area with optional side margins */}
      <div className="flex-1 flex">
        {/* Left ad/margin slot */}
        {renderSlot(leftAdMargin)}

        {/* Main content */}
        <main 
          className={`ds-container-margins flex-1 bg-white dark:bg-gray-800 my-2 ${contentClassName}`}
          style={{ borderRadius: 'var(--ds-container-radius, 8px)' }}
        >
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Right ad/margin slot */}
        {renderSlot(rightAdMargin)}
      </div>

      {/* Bottom ad slot */}
      <AdSlot position="footer" />

      {/* Footer */}
      <footer 
        className="ds-container-margins bg-white dark:bg-gray-800"
        style={{ 
          borderTopLeftRadius: 'var(--ds-container-radius, 8px)', 
          borderTopRightRadius: 'var(--ds-container-radius, 8px)' 
        }}
      >
        {footerContent}
      </footer>
    </div>
  );
}
