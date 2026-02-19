import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { PreferencesMenu } from './PreferencesMenu';

// DS Ecosystem apps for app-switcher [FR-NAV-002]
const DS_APPS = [
  { id: 'dsaccount', name: 'DSAccount', url: 'https://account.digistratum.com', icon: '👤' },
  { id: 'dskanban', name: 'DSKanban', url: 'https://kanban.digistratum.com', icon: '📋' },
  { id: 'dsdocs', name: 'DSDocs', url: 'https://docs.digistratum.com', icon: '📄' },
];

// Available languages
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
];

interface DSNavProps {
  appName?: string;
  currentAppId?: string;  // Highlights current app in switcher
}

// Standard navigation component [FR-NAV-001, FR-NAV-002, FR-NAV-004]
// Supports both guest and authenticated sessions:
// - Guest: Shows "Sign In / Sign Up" buttons
// - Authenticated: Shows user dropdown with tenant switcher
export function DSNav({ appName: _appName = 'DS App', currentAppId }: DSNavProps) {
  const { t, i18n } = useTranslation();
  const { user, currentTenant, isAuthenticated, login, logout, switchTenant } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Refs for click-outside handling
  const appSwitcherRef = useRef<HTMLDivElement>(null);
  const tenantMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (appSwitcherRef.current && !appSwitcherRef.current.contains(event.target as Node)) {
        setShowAppSwitcher(false);
      }
      if (tenantMenuRef.current && !tenantMenuRef.current.contains(event.target as Node)) {
        setShowTenantMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
    setShowMobileMenu(false);
  };

  const tenantName = currentTenant 
    ? `Org: ${currentTenant}` 
    : t('nav.personal');

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo, App Switcher, and App Name [FR-NAV-001, FR-NAV-002] */}
          <div className="flex items-center">
            {/* App Switcher [FR-NAV-002] */}
            <div className="relative" ref={appSwitcherRef}>
              <button
                onClick={() => setShowAppSwitcher(!showAppSwitcher)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                aria-label={t('nav.appSwitcher', 'Switch app')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>

              {showAppSwitcher && (
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('nav.dsApps', 'DigiStratum Apps')}
                    </p>
                  </div>
                  <div className="py-1">
                    {DS_APPS.map((app) => (
                      <a
                        key={app.id}
                        href={app.url}
                        className={`flex items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          currentAppId === app.id 
                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                            : 'text-gray-700 dark:text-gray-200'
                        }`}
                        onClick={() => setShowAppSwitcher(false)}
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

            <a href="/" className="flex items-center ml-2">
              <img 
                src="/lk_logo.png" 
                alt="LeapKick" 
                className="h-10"
              />
            </a>
          </div>

          {/* Mobile menu button [FR-NAV-004] */}
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

          {/* Desktop: Right side - Auth controls [FR-NAV-004] */}
          <div className="hidden sm:flex items-center space-x-2">
            {/* Preferences Menu (Theme + Language) */}
            <PreferencesMenu />

            {/* Guest: Sign In / Sign Up buttons */}
            {!isAuthenticated && (
              <div className="flex items-center space-x-2 ml-2">
                <button
                  onClick={() => login()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {t('auth.signIn', 'Sign In')}
                </button>
                <button
                  onClick={() => login()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  {t('auth.signUp', 'Sign Up')}
                </button>
              </div>
            )}

            {/* Authenticated: Tenant switcher and User menu */}
            {isAuthenticated && user && (
              <>
                {/* Tenant Switcher [FR-TENANT-002] */}
                {user.tenants.length > 0 && (
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
                              key={tenant}
                              onClick={() => { switchTenant(tenant); setShowTenantMenu(false); }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${currentTenant === tenant ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-700 dark:text-gray-200'}`}
                            >
                              {tenant}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <a href="/settings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          {t('common.settings')}
                        </a>
                        <button
                          onClick={logout}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          {t('common.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu [FR-NAV-004] */}
      {showMobileMenu && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
          <div className="px-4 py-3 space-y-3">
            {/* Guest: Sign In / Sign Up */}
            {!isAuthenticated && (
              <div className="space-y-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => { login(); setShowMobileMenu(false); }}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-left transition-colors"
                >
                  {t('auth.signIn', 'Sign In')}
                </button>
                <button
                  onClick={() => { login(); setShowMobileMenu(false); }}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md text-center transition-colors"
                >
                  {t('auth.signUp', 'Sign Up')}
                </button>
              </div>
            )}

            {/* Authenticated: User info */}
            {isAuthenticated && user && (
              <div className="flex items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </div>
            )}

            {/* Tenant Switcher */}
            {isAuthenticated && user && user.tenants.length > 0 && (
              <div className="space-y-1 pb-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('nav.switchTenant')}
                </p>
                <button
                  onClick={() => { switchTenant(null); setShowMobileMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${!currentTenant ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-700 dark:text-gray-200'}`}
                >
                  {t('nav.personal')}
                </button>
                {user.tenants.map((tenant) => (
                  <button
                    key={tenant}
                    onClick={() => { switchTenant(tenant); setShowMobileMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${currentTenant === tenant ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-700 dark:text-gray-200'}`}
                  >
                    {tenant}
                  </button>
                ))}
              </div>
            )}

            {/* Preferences Section */}
            <div className="space-y-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {t('preferences.title', 'Preferences')}
              </p>
              
              {/* Theme toggle */}
              <button
                onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {resolvedTheme === 'light' ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    {t('theme.dark')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {t('theme.light')}
                  </>
                )}
              </button>

              {/* Language selector */}
              <div className="space-y-1">
                <p className="px-3 text-sm text-gray-700 dark:text-gray-200">
                  {t('preferences.language', 'Language')}
                </p>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      currentLanguage.code === lang.code
                        ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      {t(`languages.${lang.code}`, lang.name)}
                      {currentLanguage.code === lang.code && (
                        <svg className="w-4 h-4 text-blue-500 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings & Logout (authenticated only) */}
            {isAuthenticated && user && (
              <div className="space-y-1">
                <a href="/settings" className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  {t('common.settings')}
                </a>
                <button
                  onClick={() => { logout(); setShowMobileMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
