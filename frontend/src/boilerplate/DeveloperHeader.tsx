import { useState, useEffect, useRef, ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './useAuth';
import { useTenantTheme, useTheme } from '@digistratum/ds-core';
import { PreferencesModal } from './PreferencesModal';

/**
 * Menu item configuration for custom navigation
 */
export interface MenuItem {
  label: string;
  path: string;
  icon?: ReactNode;
}

/**
 * Props for the standardized DeveloperHeader component
 * 
 * @example
 * // Minimal usage (all defaults)
 * <DeveloperHeader appName="My App" />
 * 
 * @example
 * // Full customization
 * <DeveloperHeader
 *   appName="DSKanban"
 *   appLogo="/kanban-logo.svg"
 *   currentAppId="dskanban"
 *   menuItems={[
 *     { label: 'Board', path: '/board', icon: <BoardIcon /> },
 *     { label: 'Settings', path: '/settings' }
 *   ]}
 *   showAppSwitcher={true}
 *   showThemeToggle={true}
 *   showUserMenu={true}
 * />
 */
export interface DeveloperHeaderProps {
  /** Display name for the app (shown in mobile menu) */
  appName: string;
  /** Custom logo URL - falls back to tenant logo or DS default */
  appLogo?: string;
  /** App ID to highlight in the app switcher dropdown */
  currentAppId?: string;
  /** Custom menu items for app-specific navigation */
  menuItems?: MenuItem[];
  /** Show the DigiStratum app switcher grid (default: true) */
  showAppSwitcher?: boolean;
  /** Show quick theme toggle button (default: true) */
  showThemeToggle?: boolean;
  /** Show user menu with profile/logout (default: true) */
  showUserMenu?: boolean;
  /** Show preferences button that opens PreferencesModal (default: true) */
  showPreferences?: boolean;
  /** Show tenant switcher for multi-tenant users (default: true) */
  showTenantSwitcher?: boolean;
  /** Additional class names for the header element */
  className?: string;
}

/**
 * Standardized header component for DigiStratum apps
 * 
 * Features:
 * - App switcher dropdown for cross-app navigation [FR-NAV-002]
 * - User avatar with dropdown (profile, settings, logout)
 * - Theme toggle (light/dark/system)
 * - Tenant switcher for multi-tenant users
 * - Mobile-responsive hamburger menu
 * - Custom menu items support
 * 
 * All features are toggleable via props for maximum flexibility.
 */
export function DeveloperHeader({
  appName,
  appLogo,
  currentAppId,
  menuItems = [],
  showAppSwitcher = true,
  showThemeToggle = false,
  showUserMenu = true,
  showPreferences = true,
  showTenantSwitcher = true,
  className = '',
}: DeveloperHeaderProps) {
  const { t } = useTranslation();
  const { user, currentTenant, isAuthenticated, login, logout, switchTenant, availableApps } = useAuth();
  const { logoUrl, isLoading: themeLoading } = useTenantTheme();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const [showUserMenuDropdown, setShowUserMenuDropdown] = useState(false);
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [showAppSwitcherDropdown, setShowAppSwitcherDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  // Normalize user display name
  const userName = user?.display_name || user?.name || '';

  // Refs for click-outside handling
  const appSwitcherRef = useRef<HTMLDivElement>(null);
  const tenantMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
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

  // Determine which logo to use: prop > tenant > default
  const displayLogo = appLogo || logoUrl || '/lk_logo.svg';

  // Find current tenant info
  const currentTenantInfo = user?.tenants?.find(t => t.id === currentTenant);
  const tenantName = currentTenantInfo?.name || t('nav.personal');

  // Quick theme toggle cycles through light -> dark -> system
  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const themeIcon = useMemo(() => {
    if (theme === 'system') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    if (resolvedTheme === 'dark') {
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
  }, [theme, resolvedTheme]);

  return (
    <>
      <header 
        className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}
        style={{ borderRadius: '0 0 var(--ds-container-radius) var(--ds-container-radius)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo - leftmost element */}
            <div className="flex items-center">
              <a href="/" className="flex items-center">
                <div 
                  className={`h-[25px] transition-opacity duration-200 ${
                    themeLoading && !logoLoaded ? 'opacity-0' : 'opacity-100'
                  }`}
                  style={{ minWidth: '25px' }}
                >
                  <img 
                    src={displayLogo} 
                    alt={appName}
                    className="h-[25px]"
                    onLoad={() => setLogoLoaded(true)}
                    onError={() => setLogoLoaded(true)}
                  />
                </div>
              </a>

              {/* Custom menu items - desktop only */}
              {menuItems.length > 0 && (
                <nav className="hidden md:flex items-center ml-8 space-x-4">
                  {menuItems.map((item, index) => (
                    <a
                      key={index}
                      href={item.path}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                      {item.icon && <span className="mr-2">{item.icon}</span>}
                      {item.label}
                    </a>
                  ))}
                </nav>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
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

            {/* Desktop: Right side controls */}
            <div className="hidden sm:flex items-center space-x-2">
              {/* App Switcher */}
              {showAppSwitcher && (
                <div className="relative" ref={appSwitcherRef}>
                  <button
                    onClick={() => setShowAppSwitcherDropdown(!showAppSwitcherDropdown)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
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
                        {availableApps.map((app) => (
                          <a
                            key={app.id}
                            href={app.url}
                            className={`flex items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                              currentAppId === app.id 
                                ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                                : 'text-gray-700 dark:text-gray-200'
                            }`}
                            onClick={() => setShowAppSwitcherDropdown(false)}
                          >
                            <span className="text-lg mr-3">{app.icon}</span>
                            <span className="font-medium">{app.name}</span>
                            {currentAppId === app.id && (
                              <span className="ml-auto text-xs text-blue-500 dark:text-blue-300">
                                {t('nav.current', 'Current')}
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Theme Toggle */}
              {showThemeToggle && (
                <button
                  onClick={cycleTheme}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  aria-label={t('nav.toggleTheme', `Theme: ${theme}`)}
                  title={`Theme: ${theme}`}
                >
                  {themeIcon}
                </button>
              )}

              {/* Preferences button */}
              {showPreferences && (
                <button
                  onClick={() => setShowPreferencesModal(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  aria-label={t('preferences.title', 'Preferences')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
              )}

              {/* Guest: Sign In button */}
              {!isAuthenticated && showUserMenu && (
                <div className="flex items-center ml-2">
                  <button
                    onClick={() => login()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    {t('auth.signIn', 'Sign In')}
                  </button>
                </div>
              )}

              {/* Authenticated: Tenant switcher and User menu */}
              {isAuthenticated && user && (
                <>
                  {/* Tenant Switcher */}
                  {showTenantSwitcher && user.tenants && user.tenants.length > 0 && (
                    <div className="relative" ref={tenantMenuRef}>
                      <button
                        onClick={() => setShowTenantMenu(!showTenantMenu)}
                        className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
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
                              onClick={() => { switchTenant(null); setShowTenantMenu(false); }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!currentTenant ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-700 dark:text-gray-200'}`}
                            >
                              {t('nav.personal')}
                            </button>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            {user.tenants.map((tenant) => (
                              <button
                                key={tenant.id}
                                onClick={() => { switchTenant(tenant.id); setShowTenantMenu(false); }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${currentTenant === tenant.id ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-700 dark:text-gray-200'}`}
                              >
                                <span>{tenant.name}</span>
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({tenant.role})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* User Menu */}
                  {showUserMenu && (
                    <div className="relative" ref={userMenuRef}>
                      <button
                        onClick={() => setShowUserMenuDropdown(!showUserMenuDropdown)}
                        className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                      >
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          {(userName || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showUserMenuDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                          <a 
                            href="https://account.digistratum.com" 
                            className="block px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{userName || user.email}</p>
                            {userName && <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>}
                            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">My Account →</p>
                          </a>
                          <div className="py-1">
                            <a href="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {t('common.settings')}
                            </a>
                            <button
                              onClick={logout}
                              className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              {t('common.logout')}
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
          <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
            <div className="px-4 py-3 space-y-3">
              {/* Custom menu items - mobile */}
              {menuItems.length > 0 && (
                <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  {menuItems.map((item, index) => (
                    <a
                      key={index}
                      href={item.path}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      {item.icon && <span className="mr-3">{item.icon}</span>}
                      {item.label}
                    </a>
                  ))}
                </div>
              )}

              {/* Session state: Sign In button OR user info */}
              {!isAuthenticated && showUserMenu ? (
                <button
                  onClick={() => { login(); setShowMobileMenu(false); }}
                  className="w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md text-center transition-colors"
                >
                  {t('auth.signIn', 'Sign In')}
                </button>
              ) : isAuthenticated && user && showUserMenu && (
                <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <a 
                    href="https://account.digistratum.com" 
                    className="flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {(userName || user.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{userName || user.email}</p>
                      {userName && <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>}
                      <p className="text-xs text-blue-500 dark:text-blue-400">My Account →</p>
                    </div>
                  </a>
                  
                  <a
                    href="/settings"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {t('common.settings', 'Settings')}
                  </a>
                </div>
              )}

              {/* App Switcher - mobile */}
              {showAppSwitcher && (
                <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <p className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('nav.dsApps', 'DigiStratum Apps')}
                  </p>
                  {availableApps.map((app) => (
                    <a
                      key={app.id}
                      href={app.url}
                      className={`flex items-center px-4 py-2 text-sm rounded-md transition-colors ${
                        currentAppId === app.id 
                          ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <span className="text-lg mr-3">{app.icon}</span>
                      <span className="font-medium">{app.name}</span>
                      {currentAppId === app.id && (
                        <span className="ml-auto text-xs text-blue-500 dark:text-blue-300">
                          {t('nav.current', 'Current')}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              )}

              {/* Theme toggle - mobile */}
              {showThemeToggle && (
                <button
                  onClick={cycleTheme}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {themeIcon}
                  <span className="ml-3">
                    {t('nav.theme', 'Theme')}: {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </span>
                </button>
              )}

              {/* Preferences link - opens modal */}
              {showPreferences && (
                <button
                  onClick={() => { setShowMobileMenu(false); setShowPreferencesModal(true); }}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  {t('preferences.title', 'Preferences')}
                </button>
              )}

              {/* Logout - separate at bottom */}
              {isAuthenticated && showUserMenu && (
                <button
                  onClick={() => { logout(); setShowMobileMenu(false); }}
                  className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
      </header>

      {/* Preferences Modal */}
      {showPreferences && (
        <PreferencesModal
          isOpen={showPreferencesModal}
          onClose={() => setShowPreferencesModal(false)}
        />
      )}
    </>
  );
}
