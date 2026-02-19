import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { User, AuthContextValue, AuthConfig } from './types';
import { AuthApiClient } from './client';

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_SSO_URL = 'https://account.digistratum.com';
const DEFAULT_TENANT_STORAGE_KEY = 'ds_currentTenant';
const DEFAULT_SESSION_ENDPOINT = '/api/me';

interface AuthProviderProps {
  children: ReactNode;
  config: AuthConfig;
  /** Optional pre-configured API client */
  apiClient?: AuthApiClient;
}

/**
 * Authentication provider component.
 * Wrap your app with this to enable auth context throughout.
 */
export function AuthProvider({ children, config, apiClient }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ssoBaseURL = config.ssoBaseURL || DEFAULT_SSO_URL;
  const appURL = config.appURL || (typeof window !== 'undefined' ? window.location.origin : '');
  const tenantStorageKey = config.tenantStorageKey || DEFAULT_TENANT_STORAGE_KEY;
  const sessionEndpoint = config.sessionEndpoint || DEFAULT_SESSION_ENDPOINT;

  // Create or use provided API client
  const client = useMemo(
    () => apiClient || new AuthApiClient({ baseURL: config.apiBaseURL }),
    [apiClient, config.apiBaseURL]
  );

  // Check for existing session on mount
  const checkAuth = useCallback(async () => {
    try {
      const userData = await client.get<User>(sessionEndpoint);
      setUser(userData);

      // Restore tenant from localStorage
      if (typeof window !== 'undefined') {
        const savedTenant = localStorage.getItem(tenantStorageKey);
        if (savedTenant && userData.tenants.includes(savedTenant)) {
          setCurrentTenant(savedTenant);
          client.setTenant(savedTenant);
        }
      }
    } catch {
      setUser(null);
      client.setTenant(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, sessionEndpoint, tenantStorageKey]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect to DSAccount SSO login
  const login = useCallback(
    (redirectTo?: string) => {
      const redirect = redirectTo || (typeof window !== 'undefined' ? window.location.pathname : '/');
      const loginURL =
        `${ssoBaseURL}/oauth/authorize?app_id=${config.appId}` +
        `&redirect_uri=${encodeURIComponent(appURL + '/auth/callback')}` +
        `&state=${encodeURIComponent(redirect)}`;
      
      if (typeof window !== 'undefined') {
        window.location.href = loginURL;
      }
    },
    [ssoBaseURL, config.appId, appURL]
  );

  // Logout and redirect to DSAccount logout
  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(tenantStorageKey);
      window.location.href = '/auth/logout';
    }
  }, [tenantStorageKey]);

  // Switch tenant context
  const switchTenant = useCallback(
    (tenantId: string | null) => {
      setCurrentTenant(tenantId);
      client.setTenant(tenantId);

      if (typeof window !== 'undefined') {
        if (tenantId) {
          localStorage.setItem(tenantStorageKey, tenantId);
        } else {
          localStorage.removeItem(tenantStorageKey);
        }
      }
    },
    [client, tenantStorageKey]
  );

  // Refresh session
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await checkAuth();
  }, [checkAuth]);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      currentTenant,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
      switchTenant,
      refresh,
    }),
    [user, currentTenant, isLoading, login, logout, switchTenant, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to get the current user. Throws if not authenticated.
 * Use in components where auth is guaranteed.
 */
export function useUser(): User {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    throw new Error('useUser called while auth is still loading');
  }
  if (!user) {
    throw new Error('useUser called without authenticated user');
  }
  return user;
}

/**
 * Hook to get the current tenant ID.
 */
export function useTenant(): string | null {
  const { currentTenant } = useAuth();
  return currentTenant;
}

/**
 * Hook to get the current tenant ID. Throws if no tenant selected.
 * Use in components where tenant context is required.
 */
export function useRequiredTenant(): string {
  const { currentTenant } = useAuth();
  if (!currentTenant) {
    throw new Error('useRequiredTenant called without a selected tenant');
  }
  return currentTenant;
}
