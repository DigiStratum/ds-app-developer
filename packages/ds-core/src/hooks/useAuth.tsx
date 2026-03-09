/**
 * @module useAuth
 * 
 * Authentication hook for DS applications.
 * Handles session state, login/logout, and tenant switching.
 * 
 * Auth flow:
 * 1. Check for ds-session cookie
 * 2. Call Account API to validate session and get user info
 * 3. Provide auth state to app via context
 * 
 * Important: Apps CONSUME auth state — they don't produce it.
 * The ds-session cookie is managed by DSAccount, not by individual apps.
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session, AppInfo } from '../types';
import { DS_URLS } from '../utils/constants';

// Extended auth context with all fields apps need
export interface AuthContext {
  session: Session | null;
  user: User | null;
  currentTenant: string | null;
  availableApps: AppInfo[];
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (redirectTo?: string) => void;
  logout: () => void;
  switchTenant: (tenantId: string | null) => void;
}

const AuthContextInstance = createContext<AuthContext | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  /** Base URL for auth API calls (defaults to current origin) */
  apiBaseUrl?: string;
  /** DSAccount URL for available apps (defaults to DS_URLS.ACCOUNT) */
  accountUrl?: string;
}

/**
 * Auth provider supporting guest session pattern [FR-AUTH-001, FR-AUTH-003]
 * 
 * - Checks session state on mount via /api/session
 * - Provides auth state and controls to the app
 * - Login/logout redirect to Account app
 */
export function AuthProvider({ 
  children, 
  apiBaseUrl = '',
  accountUrl = DS_URLS.ACCOUNT,
}: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);
  const [availableApps, setAvailableApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
    loadAvailableApps();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAvailableApps = async () => {
    try {
      const response = await fetch(`${accountUrl}/api/apps/available`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableApps(data.apps || []);
      }
    } catch (error) {
      console.error('Failed to load available apps:', error);
    }
  };

  const loadSession = async () => {
    try {
      // Call app's /api/session which proxies to DSAccount
      const response = await fetch(`${apiBaseUrl}/api/session`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Session API returned ${response.status}`);
      }
      
      const sessionData: Session = await response.json();
      setSession(sessionData);
      
      if (sessionData.is_authenticated && sessionData.user) {
        setUser(sessionData.user);
        
        // Restore tenant from localStorage or use session tenant
        // Note: localStorage for tenant PREFERENCE is okay (not auth state)
        const savedTenant = localStorage.getItem('ds-current-tenant');
        const tenantToUse = savedTenant && sessionData.user.tenants?.some(t => t.id === savedTenant)
          ? savedTenant
          : sessionData.tenant_id || null;
        
        setCurrentTenant(tenantToUse);
      } else {
        setUser(null);
        setCurrentTenant(null);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      setSession(null);
      setUser(null);
      setCurrentTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect to login with optional return URL
  const login = useCallback((redirectTo?: string) => {
    const redirect = redirectTo || window.location.pathname;
    window.location.href = `${apiBaseUrl}/api/auth/login?redirect=${encodeURIComponent(redirect)}`;
  }, [apiBaseUrl]);

  // Logout and redirect
  const logout = useCallback(() => {
    localStorage.removeItem('ds-current-tenant');
    window.location.href = `${apiBaseUrl}/api/auth/logout`;
  }, [apiBaseUrl]);

  // Switch tenant context
  // Tenant is sent via X-Tenant-ID header on subsequent API calls
  const switchTenant = useCallback((tenantId: string | null) => {
    setCurrentTenant(tenantId);
    if (tenantId) {
      localStorage.setItem('ds-current-tenant', tenantId);
    } else {
      localStorage.removeItem('ds-current-tenant');
    }
  }, []);

  const contextValue: AuthContext = {
    session,
    user,
    currentTenant,
    availableApps,
    isLoading,
    isAuthenticated: session?.is_authenticated ?? false,
    isGuest: session?.is_guest ?? true,
    login,
    logout,
    switchTenant,
  };

  return (
    <AuthContextInstance.Provider value={contextValue}>
      {children}
    </AuthContextInstance.Provider>
  );
}

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContext {
  const context = useContext(AuthContextInstance);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * Hook to check if auth is loading (for SSR/hydration)
 */
export function useAuthLoading(): boolean {
  const context = useContext(AuthContextInstance);
  return context?.isLoading ?? true;
}
