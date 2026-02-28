import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DS_URLS } from '@digistratum/ds-core';
import type { DSAppShellProps, DSApp, NavLink } from './types';

// Default DS apps for app-switcher (used when no apps prop or appsApiUrl provided)
const DEFAULT_DS_APPS: DSApp[] = [
  { id: 'dsaccount', name: 'DS Account', url: DS_URLS.ACCOUNT, icon: '👤' },
  { id: 'dskanban', name: 'DS Projects', url: DS_URLS.PROJECTS, icon: '📋' },
  { id: 'dscrm', name: 'DS CRM', url: DS_URLS.CRM, icon: '💼' },
  { id: 'dsdeveloper', name: 'DS Developer', url: DS_URLS.DEVELOPER, icon: '🛠️' },
  { id: 'ds-noc', name: 'DS NOC', url: DS_URLS.NOC, icon: '📡' },
];

// Get a default icon for known app IDs
function getDefaultIcon(appId: string): string {
  const iconMap: Record<string, string> = {
    dsaccount: '👤',
    dskanban: '📋',
    dscrm: '💼',
    dsdeveloper: '🛠️',
    'ds-noc': '📡',
    dsnoc: '📡',
    dsdocs: '📄',
    dsbilling: '💳',
  };
  return iconMap[appId.toLowerCase()] || '📱';
}

export interface DSHeaderProps {
  appName: string;
  currentAppId?: string;
  logoUrl?: string;
  logoAlt?: string;
  /** URL the logo links to (defaults to DS_URLS.ACCOUNT) */
  logoLinkUrl?: string;
  auth?: DSAppShellProps['auth'];
  theme?: DSAppShellProps['theme'];
  navLinks?: NavLink[];
  /** Static apps list for the app-switcher. If appsApiUrl is provided, apps from API take precedence. */
  apps?: DSApp[];
  /** URL to fetch apps from registry API (e.g., https://registry.digistratum.com/api/apps) */
  appsApiUrl?: string;
  showAppSwitcher?: boolean;
  showThemeToggle?: boolean;
  showUserMenu?: boolean;
  showPreferences?: boolean;
  showTenantSwitcher?: boolean;
  className?: string;
}

/**
 * DSHeader - Standard DigiStratum navigation header
 * 
 * Features:
 * - Logo with home link
 * - Navigation links
 * - App-switcher dropdown (with optional dynamic loading from registry API)
 * - Theme toggle
 * - Tenant switcher
 * - User menu with logout
 * - Mobile-responsive hamburger menu
 */
export function DSHeader({
  appName,
  currentAppId,
  logoUrl = '/ds-logo.svg',
  logoAlt,
  logoLinkUrl = DS_URLS.ACCOUNT,
  auth,
  theme,
  navLinks = [],
  apps: propApps,
  appsApiUrl,
  showAppSwitcher = true,
  showThemeToggle = true,
  showUserMenu = true,
  showPreferences = true,
  showTenantSwitcher = true,
  className = '',
}: DSHeaderProps) {
  const { t } = useTranslation();
  const [showUserMenuDropdown, setShowUserMenuDropdown] = useState(false);
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [showAppSwitcherDropdown, setShowAppSwitcherDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [fetchedApps, setFetchedApps] = useState<DSApp[] | null>(null);
  const [appsLoading, setAppsLoading] = useState(false);

  const appSwitcherRef = useRef<HTMLDivElement>(null);
  const tenantMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Derive auth state early (needed for apps fetch)
  const user = auth?.user;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const currentTenant = auth?.currentTenant;
  const currentTenantInfo = user?.tenants?.find(t => t.id === currentTenant);
  const tenantName = currentTenantInfo?.name || t('nav.personal', 'Personal');
  const userName = user?.name || user?.email || '';

  // Fetch apps from registry API if appsApiUrl is provided
  useEffect(() => {
    if (!appsApiUrl) return;
    
    let cancelled = false;
    setAppsLoading(true);
    
    fetch(appsApiUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch apps');
        return res.json();
      })
      .then((data: Array<{ id: string; name: string; url: string; icon?: string; status?: string; is_public?: boolean; display_order?: number }>) => {
        if (cancelled) return;
        // Filter to production apps that have a URL
        // If user is not authenticated, only show public apps
        const filteredApps = data
          .filter(app => {
            if (!app.url) return false;
            if (app.status && app.status !== 'production') return false;
            // Filter by is_public if user is not authenticated
            if (!isAuthenticated && app.is_public === false) return false;
            return true;
          })
          // Sort by display_order (undefined/null treated as Infinity to sort last)
          .sort((a, b) => (a.display_order ?? Infinity) - (b.display_order ?? Infinity))
          .map(app => ({
            id: app.id,
            name: app.name,
            url: app.url,
            icon: app.icon || getDefaultIcon(app.id),
          }));
        setFetchedApps(filteredApps);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to fetch apps from registry:', err);
        // Fall back to defaults on error
        setFetchedApps(null);
      })
      .finally(() => {
        if (!cancelled) setAppsLoading(false);
      });
    
    return () => { cancelled = true; };
  }, [appsApiUrl, isAuthenticated]);

  // Determine which apps list to use: fetched > prop > defaults
  const apps = fetchedApps ?? propApps ?? DEFAULT_DS_APPS;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (appSwitcherRef.current && !appSwitcherRef.current.contains(event.target as Node)) {
        setShowAppSwitcherDropdown(false);
      }
      if (tenantMenuRef.current && !tenantMenuRef.current.contains(event.target as Node)) {
        setShowTenantMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenuDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme toggle
  const cycleTheme = () => {
    if (!theme) return;
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    theme.setTheme(themes[nextIndex]);
  };

  const ThemeIcon = () => {
    if (!theme) return null;
    if (theme.theme === 'system') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    if (theme.resolvedTheme === 'dark') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and nav links */}
          <div className="flex items-center">
            <a href={logoLinkUrl} className="flex items-center">
              <img 
                src={logoUrl} 
                alt={logoAlt || appName}
                className="h-10"
              />
            </a>

            {/* Desktop nav links */}
            {navLinks.length > 0 && (
              <nav className="hidden md:flex items-center ml-8 space-x-4">
                {navLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.path}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      link.active 
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {link.icon && <span className="mr-2">{link.icon}</span>}
                    {link.label}
                  </a>
                ))}
              </nav>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={t('nav.menu', 'Menu')}
            >
              {showMobileMenu ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Desktop controls */}
          <div className="hidden sm:flex items-center space-x-2">
            {/* App Switcher */}
            {showAppSwitcher && (
              <div className="relative" ref={appSwitcherRef}>
                <button
                  onClick={() => setShowAppSwitcherDropdown(!showAppSwitcherDropdown)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  aria-label={t('nav.appSwitcher', 'Switch app')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>

                {showAppSwitcherDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('nav.dsApps', 'DigiStratum Apps')}
                      </p>
                    </div>
                    <div className="py-1">
                      {apps.map((app) => {
                        const isCurrent = currentAppId === app.id;
                        if (isCurrent) {
                          // Render as non-clickable div for current app
                          return (
                            <div
                              key={app.id}
                              className="flex items-center px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 cursor-default"
                            >
                              <span className="text-lg mr-3">{app.icon}</span>
                              <span className="font-medium">{app.name}</span>
                              <span className="ml-auto text-xs text-blue-500 dark:text-blue-300">
                                {t('nav.current', 'Current')}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <a
                            key={app.id}
                            href={app.url}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setShowAppSwitcherDropdown(false)}
                          >
                            <span className="text-lg mr-3">{app.icon}</span>
                            <span className="font-medium">{app.name}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Theme Toggle */}
            {showThemeToggle && theme && (
              <button
                onClick={cycleTheme}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                aria-label={t('nav.toggleTheme', `Theme: ${theme.theme}`)}
                title={`Theme: ${theme.theme}`}
              >
                <ThemeIcon />
              </button>
            )}

            {/* Guest: Sign In */}
            {!isAuthenticated && showUserMenu && auth && (
              <button
                onClick={() => auth.login()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                {t('auth.signIn', 'Sign In')}
              </button>
            )}

            {/* Authenticated: Tenant switcher + User menu */}
            {isAuthenticated && user && (
              <>
                {/* Tenant Switcher */}
                {showTenantSwitcher && user.tenants && user.tenants.length > 0 && auth && (
                  <div className="relative" ref={tenantMenuRef}>
                    <button
                      onClick={() => setShowTenantMenu(!showTenantMenu)}
                      className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="hidden lg:inline">{tenantName}</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showTenantMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                        <div className="py-1">
                          <button
                            onClick={() => { auth.switchTenant(null); setShowTenantMenu(false); }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              !currentTenant 
                                ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                                : 'text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {t('nav.personal', 'Personal')}
                          </button>
                          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                          {user.tenants.map((tenant) => (
                            <button
                              key={tenant.id}
                              onClick={() => { auth.switchTenant(tenant.id); setShowTenantMenu(false); }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                currentTenant === tenant.id 
                                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                                  : 'text-gray-700 dark:text-gray-200'
                              }`}
                            >
                              <span>{tenant.name}</span>
                              {tenant.role && (
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                  ({tenant.role})
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* User Menu */}
                {showUserMenu && auth && (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenuDropdown(!showUserMenuDropdown)}
                      className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={userName} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          {(userName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showUserMenuDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                        <a 
                          href={DS_URLS.ACCOUNT} 
                          className="block px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{userName || user.email}</p>
                          {user.name && <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>}
                          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Manage account →</p>
                        </a>
                        <div className="py-1">
                          <a href="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {t('common.settings', 'Settings')}
                          </a>
                          <button
                            onClick={() => auth.logout()}
                            className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            {t('common.logout', 'Logout')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 space-y-3">
            {/* Nav links */}
            {navLinks.length > 0 && (
              <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                {navLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.path}
                    className={`flex items-center px-4 py-2 text-sm rounded-md ${
                      link.active 
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    {link.icon && <span className="mr-3">{link.icon}</span>}
                    {link.label}
                  </a>
                ))}
              </div>
            )}

            {/* App Switcher - mobile */}
            {showAppSwitcher && (
              <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <p className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('nav.dsApps', 'DigiStratum Apps')}
                </p>
                {apps.map((app) => {
                  const isCurrent = currentAppId === app.id;
                  if (isCurrent) {
                    return (
                      <div
                        key={app.id}
                        className="flex items-center px-4 py-2 text-sm rounded-md bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 cursor-default"
                      >
                        <span className="text-lg mr-3">{app.icon}</span>
                        <span className="font-medium">{app.name}</span>
                        <span className="ml-auto text-xs text-blue-500 dark:text-blue-300">
                          {t('nav.current', 'Current')}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <a
                      key={app.id}
                      href={app.url}
                      className="flex items-center px-4 py-2 text-sm rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <span className="text-lg mr-3">{app.icon}</span>
                      <span className="font-medium">{app.name}</span>
                    </a>
                  );
                })}
              </div>
            )}

            {/* Theme toggle - mobile */}
            {showThemeToggle && theme && (
              <button
                onClick={cycleTheme}
                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ThemeIcon />
                <span className="ml-3">
                  {t('nav.theme', 'Theme')}: {theme.theme.charAt(0).toUpperCase() + theme.theme.slice(1)}
                </span>
              </button>
            )}

            {/* Logout - mobile */}
            {isAuthenticated && showUserMenu && auth && (
              <button
                onClick={() => { auth.logout(); setShowMobileMenu(false); }}
                className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('common.logout', 'Logout')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
