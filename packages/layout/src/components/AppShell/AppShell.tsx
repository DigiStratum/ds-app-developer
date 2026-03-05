import { useMemo, ReactNode } from 'react';
import type { AppShellProps, MenuItem, Tenant } from './types';
import type { AuthContext, ThemeContext, DSApp, FooterLink } from '../../types';
import { DSHeader } from '../../DSHeader';
import { DSFooter } from '../../DSFooter';

/**
 * Extended AppShell Props (internal)
 * 
 * The public interface is AppShellProps (simple).
 * Internally, we extend with DS-specific features.
 */
export interface AppShellExtendedProps extends AppShellProps {
  /** App display name */
  appName?: string;
  
  /** App ID for highlighting in app-switcher */
  currentAppId?: string;
  
  /** Logo URL (falls back to DS default) */
  logoUrl?: string;
  
  /** Logo alt text */
  logoAlt?: string;
  
  /** Auth context for user controls */
  auth?: AuthContext;
  
  /** Theme context for theme toggle */
  theme?: ThemeContext;
  
  /** Apps for the app-switcher dropdown */
  apps?: DSApp[];
  
  /** URL to fetch apps from registry API */
  appsApiUrl?: string;
  
  /** Footer links (when not using customFooter) */
  footerLinks?: FooterLink[];
  
  /** Copyright holder name (default: 'DigiStratum') */
  copyrightHolder?: string;
  
  // --- Feature toggles (granular header controls) ---
  
  /** Show app-switcher dropdown (default: true) */
  showAppSwitcher?: boolean;
  
  /** Show theme toggle button (default: true) */
  showThemeToggle?: boolean;
  
  /** Show user menu (default: true) */
  showUserMenu?: boolean;
  
  /** Show preferences button (default: true) */
  showPreferences?: boolean;
  
  /** Show GDPR cookie banner (default: true) */
  showGdprBanner?: boolean;
  
  /** Show tenant switcher for multi-tenant users (default: true) */
  showTenantSwitcher?: boolean;
  
  /** Additional className for the shell wrapper */
  className?: string;
  
  /** Override the content container className */
  contentClassName?: string;
  
  /** Custom menu content for hamburger menu (in addition to app nav items) */
  menuContent?: ReactNode;
  
  /** Header ad slot content (between header and main content) */
  headerAdSlot?: ReactNode;
  
  /** Footer ad slot content (between main content and footer) */
  footerAdSlot?: ReactNode;
}

/**
 * Extract current tenant info from auth context
 */
function getCurrentTenant(auth?: AuthContext): Tenant | null {
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
 * Render menu items as clickable links for the hamburger menu "Options" section
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
 * This is a simplified interface compared to DSAppShell, focusing on the most
 * common use cases while delegating to the full DSHeader/DSFooter components.
 * 
 * @example
 * ```tsx
 * import { AppShell } from '@digistratum/layout';
 * 
 * function App() {
 *   const getMenuItems = (user, tenant) => {
 *     const items = [
 *       { id: 'home', label: 'Home', path: '/' },
 *       { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
 *     ];
 *     
 *     // Add admin menu items for authenticated users
 *     if (user) {
 *       items.push({ id: 'settings', label: 'Settings', path: '/settings' });
 *     }
 *     
 *     return items;
 *   };
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
  // Extract user and tenant from auth context
  const user = auth?.user ?? null;
  const tenant = getCurrentTenant(auth);
  
  // Generate menu items using the callback
  const menuItems = useMemo(() => {
    if (hideNavigation || !getMenuItems) return [];
    return getMenuItems(user, tenant);
  }, [getMenuItems, user, tenant, hideNavigation]);

  // Generate hamburger menu content from menu items
  // Menu items appear ONLY in the "Options" section - NOT as navLinks
  const hamburgerMenuContent = useMemo(() => {
    const itemLinks = renderMenuItemsAsLinks(menuItems);
    
    // If we have both menu items and custom menuContent, combine them
    if (itemLinks && menuContent) {
      return (
        <>
          {itemLinks}
          {menuContent}
        </>
      );
    }
    
    // Otherwise return whichever one exists
    return itemLinks || menuContent || null;
  }, [menuItems, menuContent]);

  // Render custom header zone (collapses to 0 when null or hidden)
  const renderCustomHeader = (): ReactNode => {
    if (hideCustomHeader || !customHeader) return null;
    return (
      <div className="ds-custom-header-zone">
        {customHeader}
      </div>
    );
  };

  // Render footer content (custom or default DS Footer)
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

      {/* DS Header (logo, session, switcher, nav) - hideable via hideHeader */}
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
            navLinks={[]}  // Don't pass navLinks - items go in menuContent only
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

      {/* DS Footer (or custom footer) - hideable via hideFooter */}
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
