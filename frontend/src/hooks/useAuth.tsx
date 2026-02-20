import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session, AuthContext, AppInfo } from '../types';
import { api } from '../api/client';

const AuthContextInstance = createContext<AuthContext | null>(null);

const DSACCOUNT_URL = 'https://account.digistratum.com';

// Auth provider supporting guest session pattern [FR-AUTH-001, FR-AUTH-003]
// - Creates/loads session on mount (guest or authenticated)
// - Session survives auth flow (upgrade, not replace)
// - Provides auth state and controls to the app
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);
  const [availableApps, setAvailableApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load session on mount
    loadSession();
    // Load available apps (doesn't require auth)
    loadAvailableApps();
  }, []);

  const loadAvailableApps = async () => {
    try {
      const response = await fetch(`${DSACCOUNT_URL}/api/apps/available`);
      if (response.ok) {
        const data = await response.json();
        setAvailableApps(data.apps || []);
      }
    } catch (error) {
      console.error('Failed to load available apps:', error);
      // Keep empty array on error - app switcher will be empty
    }
  };

  const loadSession = async () => {
    try {
      // Get session state (works for both guest and authenticated)
      const sessionData = await api.get<Session>('/api/session');
      setSession(sessionData);
      
      // If authenticated, set user from session response
      if (sessionData.is_authenticated && sessionData.user) {
        setUser(sessionData.user);
        
        // Restore tenant from localStorage or use session tenant
        const savedTenant = localStorage.getItem('currentTenant');
        const tenantToUse = savedTenant && sessionData.user.tenants.includes(savedTenant)
          ? savedTenant
          : sessionData.tenant_id || null;
        
        setCurrentTenant(tenantToUse);
        api.setTenant(tenantToUse);
      } else {
        // Guest session - clear user but keep session
        setUser(null);
        api.setTenant(null);
      }
    } catch (error) {
      // On error, we still have a guest session (created server-side)
      // The cookie is set by the server response
      console.error('Failed to load session:', error);
      setSession(null);
      setUser(null);
      api.setTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect to login with optional return URL
  const login = useCallback((redirectTo?: string) => {
    const redirect = redirectTo || window.location.pathname;
    window.location.href = '/api/auth/login?redirect=' + encodeURIComponent(redirect);
  }, []);

  // Logout and redirect [FR-AUTH-004]
  const logout = useCallback(() => {
    localStorage.removeItem('currentTenant');
    window.location.href = '/api/auth/logout';
  }, []);

  // Switch tenant context [FR-TENANT-002, FR-TENANT-004]
  const switchTenant = useCallback((tenantId: string | null) => {
    setCurrentTenant(tenantId);
    api.setTenant(tenantId);
    if (tenantId) {
      localStorage.setItem('currentTenant', tenantId);
    } else {
      localStorage.removeItem('currentTenant');
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

export function useAuth(): AuthContext {
  const context = useContext(AuthContextInstance);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
