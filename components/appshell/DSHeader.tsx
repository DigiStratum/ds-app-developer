import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppShellAuth } from './useAppShellAuth';
import { DS_URLS } from '@digistratum/ds-core';
import type { DSHeaderProps, DSApp, NavLink } from './types';
import { PreferencesModal } from './PreferencesModal';

// Default DS apps for app-switcher
const DEFAULT_DS_APPS: DSApp[] = [
  { id: 'dsaccount', name: 'DS Account', url: DS_URLS.ACCOUNT, icon: '👤' },
  { id: 'dsdeveloper', name: 'DS Developer', url: DS_URLS.DEVELOPER, icon: '🛠️' },
];

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

/**
 * DSHeader - Standard DigiStratum navigation header
 * 
 * Features:
 * - Logo with home link
 * - Navigation links
 * - App-switcher dropdown
 * - Theme toggle
 * - Tenant switcher
 * - User menu with logout
 * - Mobile-responsive hamburger menu
 */
export function DSHeader({
  appName,
  currentAppId,
  logoUrl = '/lk_logo.svg',
  logoAlt,
  logoLinkUrl = DS_URLS.ACCOUNT,
  auth,
  theme,
  navLinks = [],
  apps: propApps,
  appsApiUrl = `${DS_URLS.ACCOUNT}/api/apps/available`,
  showAppSwitcher = true,
  showThemeToggle = true,
  showUserMenu = true,
  showPreferences = true,
  showTenantSwitcher = true,
  className = '',
  menuContent,
}: DSHeaderProps) {
  const { t } = useTranslation();
  const [showUserMenuDropdown, setShowUserMenuDropdown] = useState(false);
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [showAppSwitcherDropdown, setShowAppSwitcherDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [fetchedApps, setFetchedApps] = useState<DSApp[] | null>(null);
  const [appsLoading, setAppsLoading] = useState(false);

  const appSwitcherRef = useRef<HTMLDivElement>(null);
  const tenantMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Use internal auth hook (props can override if provided)
  const internalAuth = useAppShellAuth();
  const effectiveAuth = auth ?? internalAuth;
  
  const user = effectiveAuth.user;
  const isAuthenticated = effectiveAuth.isAuthenticated;
  const currentTenant = effectiveAuth.currentTenant;
  const currentTenantInfo = user?.tenants?.find(t => t.id === currentTenant);
  const tenantName = currentTenantInfo?.name || t('nav.personal', 'Personal');
  const userName = user?.name || user?.email || '';

  // Fetch apps from registry API
  useEffect(() => {
    if (!appsApiUrl) return;
    
    let cancelled = false;
    setAppsLoading(true);
    
    fetch(appsApiUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch apps');
        return res.json();
      })
      .then((response: { apps: Array<{ id: string; name: string; url: string; icon?: string; status?: string; is_public?: boolean; display_order?: number }> }) => {
        const data = response.apps || [];
        if (cancelled) return;
        const filteredApps = data
          .filter(app => {
            if (!app.url) return false;
            if (app.status && app.status !== 'production') return false;
            if (!isAuthenticated && app.is_public === false) return false;
            return true;
          })
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
        setFetchedApps(null);
      })
      .finally(() => {
        if (!cancelled) setAppsLoading(false);
      });
    
    return () => { cancelled = true; };
  }, [appsApiUrl, isAuthenticated]);

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


  return (
    <div className={className}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-[41px]">
          {/* Logo and nav links */}
          <div className="flex items-center">
            <a 
              href={logoLinkUrl} 
              className="flex items-center"
              aria-label={t('nav.home', 'Go to homepage')}
            >
              <img 
                src={logoUrl} 
                alt=""
                style={{ height: '25px' }}
              />
            </a>
          </div>

          {/* Hamburger menu button */}
          <div className="flex items-center">
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

          {/* Desktop controls - hidden, all controls in hamburger menu */}
          <div className="hidden items-center space-x-2">
            {/* Controls moved to hamburger menu for consistency */}
          </div>
        </div>
      </div>

      {/* Sectioned menu - visible when open */}
      {showMobileMenu && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Nav links at top if present */}
          {navLinks.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                {navLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.path}
                    className={`inline-flex items-center px-4 py-2 text-sm rounded-md w-full sm:w-auto ${
                      link.active 
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    {link.icon && <span className="mr-2">{link.icon}</span>}
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Sectioned grid container */}
          <div className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Section 1: Account */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <p className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t('nav.account', 'Account')}
                </p>
                <div className="space-y-1">
                  {!isAuthenticated && showUserMenu && (
                    <button
                      onClick={() => { effectiveAuth.login(); setShowMobileMenu(false); }}
                      className="flex items-center w-full md:w-48 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      {t('auth.signIn', 'Sign In')}
                    </button>
                  )}

                  {isAuthenticated && user && showUserMenu && (
                    <>
                      <a 
                        href={DS_URLS.ACCOUNT}
                        className="flex items-center w-full md:w-48 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={userName} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {(userName || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="ml-2 min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userName || user.email}</p>
                          <p className="text-xs text-blue-500 dark:text-blue-400">{t('nav.myAccount', 'My Account')} →</p>
                        </div>
                      </a>

                      {showTenantSwitcher && user.tenants && user.tenants.length > 0 && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                          <p className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
                            {t('nav.workspace', 'Workspace')}
                          </p>
                          <button
                            onClick={() => { effectiveAuth.switchTenant(null); setShowMobileMenu(false); }}
                            className={`flex items-center w-full md:w-48 px-3 py-2 text-sm rounded-md ${
                              !currentTenant 
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {t('nav.personal', 'Personal')}
                          </button>
                          {user.tenants.map((tenant) => (
                            <button
                              key={tenant.id}
                              onClick={() => { effectiveAuth.switchTenant(tenant.id); setShowMobileMenu(false); }}
                              className={`flex items-center w-full md:w-48 px-3 py-2 text-sm rounded-md ${
                                currentTenant === tenant.id 
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span className="truncate">{tenant.name}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Preferences */}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                        <button
                          onClick={() => { setShowPreferencesModal(true); setShowMobileMenu(false); }}
                          className="flex items-center w-full md:w-48 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span className="ds-icon ds-icon-adjustments-horizontal ds-icon-sm mr-2" />
                          {t('nav.preferences', 'Preferences')}
                        </button>
                      </div>


                      {(
                        <button
                          onClick={() => { effectiveAuth.logout(); setShowMobileMenu(false); }}
                          className="flex items-center w-full md:w-48 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <span className="ds-icon ds-icon-arrow-right-on-rectangle ds-icon-sm mr-2" />
                          {t('common.logout', 'Sign Out')}
                        </button>
                      )}
                    </>
                  )}


                  {/* Preferences (unauthenticated) */}
                  {!isAuthenticated && (
                    <button
                      onClick={() => { setShowPreferencesModal(true); setShowMobileMenu(false); }}
                      className="flex items-center w-full md:w-48 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <span className="ds-icon ds-icon-adjustments-horizontal ds-icon-sm mr-2" />
                      {t('nav.preferences', 'Preferences')}
                    </button>
                  )}

                </div>
              </div>
              {/* Apps Section - merged with app-specific options */}
              {showAppSwitcher && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <p className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {t('nav.apps', 'Apps')}
                  </p>
                  <div className="space-y-1">
                    {apps.map((app) => {
                      const isCurrent = currentAppId === app.id;
                      return (
                        <div key={app.id}>
                          {/* App row */}
                          <a
                            href={app.url}
                            className={`flex items-center w-full md:w-48 px-3 py-2 text-sm rounded-md transition-colors ${
                              isCurrent
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => setShowMobileMenu(false)}
                          >
                            <span className="text-lg mr-2">{app.icon}</span>
                            <span className="font-medium truncate">{app.name}</span>
                          </a>
                          {/* App-specific menu items (accordion) */}
                          {isCurrent && menuContent && (
                            <div className="ml-6 mt-1 space-y-1 border-l-2 border-blue-200 dark:border-blue-700 pl-3 [&>*]:w-full [&>*]:md:w-40">
                              {menuContent}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
      />
    </div>
  );
}
