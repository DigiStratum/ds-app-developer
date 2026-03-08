import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AppShell, CustomHeaderZone, type MenuItem, type Tenant } from '@digistratum/layout';
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
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Build auth context for AppShell
  const authContext: AuthContext = {
    user: user ? {
      id: user.id,
      name: user.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      avatar: user.avatar,
      role: user.role,
    } : null,
    isAuthenticated,
    login: () => login(),
    logout: () => logout(),
    currentTenant: currentTenant ? {
      id: currentTenant.id,
      name: currentTenant.name,
      type: currentTenant.type,
      logoUrl: currentTenant.logoUrl,
    } : null,
    availableTenants: user?.tenants?.map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      logoUrl: t.logoUrl,
    })) || [],
    switchTenant: (tenantId: string) => switchTenant(tenantId),
  };

  // Build theme context for AppShell
  const themeContext: ThemeContext = {
    theme: theme === 'dark' ? 'dark' : 'light',
    toggleTheme,
  };

  // Get menu items
  const getMenuItems = (authUser: User | null, _tenant: Tenant | null): MenuItem[] => {
    const items: MenuItem[] = [];
    
    if (authUser) {
      items.push({
        key: 'dashboard',
        label: t('nav.dashboard', 'Dashboard'),
        path: '/dashboard',
        isActive: location.pathname === '/dashboard',
      });
    }
    
    return items;
  };

  // Custom header zone (for app-specific content like ads)
  const customHeaderZone: CustomHeaderZone | undefined = headerAdSlot ? {
    position: 'right',
    content: headerAdSlot,
  } : undefined;

  return (
    <AppShell
      appName={appName}
      currentAppId={currentAppId}
      logoUrl={appLogo}
      auth={authContext}
      theme={themeContext}
      getMenuItems={getMenuItems}
      showAppSwitcher={showAppSwitcher}
      availableApps={availableApps}
      customHeaderZone={customHeaderZone}
      footer={<DeveloperFooter adSlot={footerAdSlot} />}
    >
      {children}
    </AppShell>
  );
}

export default DeveloperAppShell;
