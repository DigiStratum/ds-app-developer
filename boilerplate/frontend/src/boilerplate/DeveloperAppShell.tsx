import { ReactNode } from 'react';
import { AppShell, type MenuItem, type Tenant, type DSApp } from '@digistratum/layout';
import type { AuthContext, ThemeContext, User } from '@digistratum/layout';
import { useAuth } from './useAuth';
import { useTheme } from '@digistratum/ds-core';
import { useTranslation } from 'react-i18next';
import { DeveloperFooter } from './DeveloperFooter';

interface DeveloperAppShellProps {
  children: ReactNode;
  /** App display name */
  appName?: string;
  /** App logo URL */
  appLogo?: string;
  /** Current app ID for app-switcher highlighting */
  currentAppId?: string;
  /** Show app switcher */
  showAppSwitcher?: boolean;
  /** Header ad slot (optional - app provides this) */
  headerAdSlot?: ReactNode;
  /** Footer ad slot (optional - app provides this) */
  footerAdSlot?: ReactNode;
}

/**
 * DeveloperAppShell - Reference implementation of AppShell wrapper
 * 
 * This component wraps @digistratum/layout AppShell with DS-specific defaults.
 * Ad slots are passed as props (attachment points) rather than imported directly.
 */
export function DeveloperAppShell({
  children,
  appName = 'DS App',
  appLogo,
  currentAppId = 'dsapp',
  showAppSwitcher = true,
  headerAdSlot,
  footerAdSlot,
}: DeveloperAppShellProps) {
  const { t } = useTranslation();
  const { user, currentTenant, isAuthenticated, login, logout, switchTenant, availableApps } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Build auth context for AppShell (maps our User to layout's User)
  const authContext: AuthContext = {
    user: user ? {
      id: user.id,
      name: user.name || user.display_name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      // avatarUrl not in our User type, omit
    } : null,
    isAuthenticated,
    login: () => login(),
    logout: () => logout(),
    currentTenant: currentTenant ?? null,
    switchTenant: (tenantId: string | null) => {
      if (tenantId) switchTenant(tenantId);
    },
  };

  // Build theme context for AppShell (already compatible)
  const themeContext: ThemeContext = {
    theme,
    resolvedTheme,
    setTheme,
  };

  // Get menu items
  const getMenuItems = (authUser: User | null, _tenant: Tenant | null): MenuItem[] => {
    const items: MenuItem[] = [];
    
    if (authUser) {
      items.push({
        id: 'dashboard',
        label: t('nav.dashboard', 'Dashboard'),
        path: '/dashboard',
      });
    }
    
    return items;
  };

  // Convert availableApps to DSApp format
  const apps: DSApp[] = availableApps.map(app => ({
    id: app.id,
    name: app.name,
    url: app.url,
    icon: app.icon,
    current: app.id === currentAppId,
  }));

  // Suppress unused vars for now - footerAdSlot needs footer slot support
  void footerAdSlot;

  return (
    <AppShell
      appName={appName}
      currentAppId={currentAppId}
      logoUrl={appLogo}
      auth={authContext}
      theme={themeContext}
      getMenuItems={getMenuItems}
      showAppSwitcher={showAppSwitcher}
      apps={apps}
      customHeader={headerAdSlot}
      customFooter={<DeveloperFooter appName={appName} />}
    >
      {children}
    </AppShell>
  );
}

export default DeveloperAppShell;
