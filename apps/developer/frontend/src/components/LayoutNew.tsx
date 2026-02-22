/**
 * Layout component for DS Developer app
 * 
 * Uses @digistratum/layout for the app shell and wraps app-specific content.
 * This demonstrates how derived apps import and use the shared packages.
 */
import { ReactNode } from 'react';
import { DSAppShell } from '@digistratum/layout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const auth = useAuth();
  const themeContext = useTheme();

  // Transform our auth hook to the layout package's AuthContext shape
  const authContext = {
    user: auth.user ? {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.display_name || auth.user.name,
      tenants: auth.user.tenants?.map(t => ({
        id: t.id,
        name: t.name,
        role: t.role,
      })),
    } : null,
    isAuthenticated: auth.isAuthenticated,
    currentTenant: auth.currentTenant,
    login: auth.login,
    logout: auth.logout,
    switchTenant: auth.switchTenant,
  };

  // Transform our theme hook to the layout package's ThemeContext shape
  const themeCtx = {
    theme: themeContext.theme,
    resolvedTheme: themeContext.resolvedTheme,
    setTheme: themeContext.setTheme,
  };

  return (
    <DSAppShell
      appName="DS Developer"
      currentAppId="dsdeveloper"
      auth={authContext}
      theme={themeCtx}
      apps={auth.availableApps?.map(app => ({
        id: app.id,
        name: app.name,
        url: app.url,
        icon: app.icon,
      }))}
    >
      {children}
    </DSAppShell>
  );
}
