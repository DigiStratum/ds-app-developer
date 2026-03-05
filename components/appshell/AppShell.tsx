import { useMemo, ReactNode } from 'react';
import type { AppShellExtendedProps, MenuItem, Tenant, User } from './types';
import { DSHeader } from './DSHeader';
import { DSFooter } from './DSFooter';

/**
 * Extract current tenant info from auth context
 */
function getCurrentTenant(auth?: AppShellExtendedProps['auth']): Tenant | null {
  if (!auth?.user || !auth.currentTenant) return null;
  
  const tenantInfo = auth.user.tenants?.find(t => t.id === auth.currentTenant);
  if (!tenantInfo) return null;
  
  return {
    id: tenantInfo.id,
    name: tenantInfo.name,
    role: tenantInfo.role,
  };
}

/**
 * Render menu items as clickable links
 */
function renderMenuItemsAsLinks(items: MenuItem[]): ReactNode {
  if (items.length === 0) return null;
  
  return (
    <>
      {items.map((item) => (
        <a
          key={item.id}
          href={item.path ?? '#'}
          className={`flex items-center px-3 py-2 text-sm rounded-md ${
            item.active
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {item.icon && <span className="mr-2">{item.icon}</span>}
          <span className="font-medium">{item.label}</span>
        </a>
      ))}
    </>
  );
}

/**
 * AppShell - Root layout container that orchestrates all layout zones
 * 
 * Provides a consistent app shell with:
 * - Custom Header Zone (collapsible when null)
 * - DS Header (logo, session info, app switcher)
 * - Navigation Menu (derived from getMenuItems callback)
 * - Content Container (children)
 * - DS Footer (or custom footer)
 * 
 * @example
 * ```tsx
 * import { AppShell } from '@digistratum/appshell';
 * 
 * function App() {
 *   const getMenuItems = (user, tenant) => [
 *     { id: 'home', label: 'Home', path: '/' },
 *     { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
 *   ];
 *   
 *   return (
 *     <AppShell
 *       appName="MyApp"
 *       auth={authContext}
 *       theme={themeContext}
 *       getMenuItems={getMenuItems}
 *     >
 *       <MyAppContent />
 *     </AppShell>
 *   );
 * }
 * ```
 */
export function AppShell({
  // Core AppShellProps
  customHeader,
  getMenuItems,
  children,
  customFooter,
  // Zone visibility props
  hideCustomHeader = false,
  hideHeader = false,
  hideNavigation = false,
  hideFooter = false,
  // Extended props
  appName = 'App',
  currentAppId,
  logoUrl,
  logoAlt,
  auth,
  theme,
  apps,
  appsApiUrl,
  footerLinks,
  copyrightHolder = 'DigiStratum',
  showAppSwitcher = true,
  showThemeToggle = true,
  showUserMenu = true,
  showPreferences = true,
  showGdprBanner = true,
  showTenantSwitcher = true,
  className = '',
  contentClassName = '',
  menuContent,
  headerAdSlot,
  footerAdSlot,
}: AppShellExtendedProps) {
  const user = auth?.user ?? null;
  const tenant = getCurrentTenant(auth);
  
  const menuItems = useMemo(() => {
    if (hideNavigation || !getMenuItems) return [];
    return getMenuItems(user, tenant);
  }, [getMenuItems, user, tenant, hideNavigation]);

  const hamburgerMenuContent = useMemo(() => {
    const itemLinks = renderMenuItemsAsLinks(menuItems);
    
    if (itemLinks && menuContent) {
      return (
        <>
          {itemLinks}
          {menuContent}
        </>
      );
    }
    
    return itemLinks || menuContent || null;
  }, [menuItems, menuContent]);

  const renderCustomHeader = (): ReactNode => {
    if (hideCustomHeader || !customHeader) return null;
    return (
      <div className="ds-custom-header-zone">
        {customHeader}
      </div>
    );
  };

  const renderFooterContent = (): ReactNode => {
    if (customFooter) {
      return customFooter;
    }
    
    return (
      <DSFooter
        appName={appName}
        links={footerLinks}
        copyrightHolder={copyrightHolder}
        showGdprBanner={showGdprBanner}
      />
    );
  };

  return (
    <div 
      className={`ds-app-shell min-h-screen flex flex-col ${className}`}
      style={{ backgroundColor: 'var(--ds-bg-margin, #f3f4f6)' }}
    >
      {/* Custom Header Zone (collapsible) */}
      {renderCustomHeader()}

      {/* DS Header */}
      {!hideHeader && (
        <header 
          className="ds-container-margins bg-white dark:bg-gray-800 overflow-hidden"
          style={{ 
            borderBottomLeftRadius: 'var(--ds-container-radius, 8px)', 
            borderBottomRightRadius: 'var(--ds-container-radius, 8px)' 
          }}
        >
          <DSHeader
            appName={appName}
            currentAppId={currentAppId}
            logoUrl={logoUrl}
            logoAlt={logoAlt}
            auth={auth}
            theme={theme}
            navLinks={[]}
            apps={apps}
            appsApiUrl={appsApiUrl}
            showAppSwitcher={showAppSwitcher}
            showThemeToggle={showThemeToggle}
            showUserMenu={showUserMenu}
            showPreferences={showPreferences}
            showTenantSwitcher={showTenantSwitcher}
            menuContent={hamburgerMenuContent}
          />
        </header>
      )}

      {/* Header Ad Slot */}
      {headerAdSlot && (
        <div className="w-full" style={{ backgroundColor: 'var(--ds-bg-margin, #f3f4f6)' }}>
          {headerAdSlot}
        </div>
      )}

      {/* Content Container */}
      <main 
        className={`ds-container-margins flex-1 bg-white dark:bg-gray-800 my-2 ${contentClassName}`}
        style={{ borderRadius: 'var(--ds-container-radius, 8px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer Ad Slot */}
      {footerAdSlot && (
        <div className="w-full" style={{ backgroundColor: 'var(--ds-bg-margin, #f3f4f6)' }}>
          {footerAdSlot}
        </div>
      )}

      {/* DS Footer (or custom footer) */}
      {!hideFooter && (
        <footer 
          className="ds-container-margins bg-white dark:bg-gray-800 overflow-hidden"
          style={{ 
            borderTopLeftRadius: 'var(--ds-container-radius, 8px)', 
            borderTopRightRadius: 'var(--ds-container-radius, 8px)' 
          }}
        >
          {renderFooterContent()}
        </footer>
      )}
    </div>
  );
}
