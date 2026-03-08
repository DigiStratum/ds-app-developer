import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AppShell, type MenuItem, type ThemeContext, type User, type Tenant } from '@digistratum/layout';
import { useAuth } from './useAuth';
import { useTheme } from '@digistratum/ds-core';
import { useTranslation } from 'react-i18next';
import { DeveloperFooter } from './DeveloperFooter';

interface DeveloperAppShellProps {
  children: ReactNode;
  appName?: string;
  appLogo?: string;
  currentAppId?: string;
  showAppSwitcher?: boolean;
}

export function DeveloperAppShell({
  children,
  appName = 'DS App',
  appLogo,
  currentAppId = 'dsapp',
  showAppSwitcher = true,
}: DeveloperAppShellProps) {
  const { t } = useTranslation();
  const { user, currentTenant, isAuthenticated, login, logout, switchTenant, availableApps } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const location = useLocation();

  const authContext = {
    user: user ? {
      id: user.id,
      name: user.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
    } : null,
    isAuthenticated,
    login: () => login(),
    logout: () => logout(),
    currentTenant: currentTenant || null,
    availableTenants: user?.tenants?.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
    })) || [],
    switchTenant: (tenantId: string | null) => tenantId && switchTenant(tenantId),
  };

  const themeContext: ThemeContext = {
    theme: theme as 'light' | 'dark' | 'system',
    resolvedTheme: (resolvedTheme || theme) as 'light' | 'dark',
    setTheme: (t: 'light' | 'dark' | 'system') => setTheme(t as 'light' | 'dark'),
  };

  const getMenuItems = (_user: User | null, _tenant: Tenant | null): MenuItem[] => {
    const items: MenuItem[] = [];
    
    if (user) {
      items.push({
        id: 'dashboard',
        label: t('nav.dashboard', 'Dashboard'),
        path: '/dashboard',
      });
    }
    
    return items;
  };

  // Mark location as used for future menu item active state
  void location;

  return (
    <AppShell
      appName={appName}
      currentAppId={currentAppId}
      logoUrl={appLogo}
      auth={authContext}
      theme={themeContext}
      getMenuItems={getMenuItems}
      showAppSwitcher={showAppSwitcher}
      apps={availableApps}
      customFooter={<DeveloperFooter appName={appName} />}
    >
      {children}
    </AppShell>
  );
}

export default DeveloperAppShell;
