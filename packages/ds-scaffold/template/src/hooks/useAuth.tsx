import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * User type from DSAccount
 */
interface User {
  id: string;
  name: string;
  email: string;
  display_name?: string;
  tenants: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

/**
 * Session state
 */
interface Session {
  session_id: string;
  is_authenticated: boolean;
  is_guest: boolean;
  user?: User;
  tenant_id?: string;
}

/**
 * Auth context type
 */
interface AuthContextType {
  session: Session | null;
  user: User | null;
  currentTenant: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (redirectTo?: string) => void;
  logout: () => void;
  switchTenant: (tenantId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DSACCOUNT_URL = import.meta.env.VITE_DSACCOUNT_URL || 'https://account.digistratum.com';

/**
 * Auth Provider
 * 
 * Manages authentication state with DSAccount SSO.
 * Supports guest session pattern - creates/loads session on mount.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const response = await fetch('/api/session', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const sessionData: Session = await response.json();
        setSession(sessionData);
        
        if (sessionData.is_authenticated && sessionData.user) {
          setUser(sessionData.user);
          
          // Restore tenant from localStorage or use session tenant
          const savedTenant = localStorage.getItem('currentTenant');
          const tenantToUse = savedTenant && sessionData.user.tenants.some(t => t.id === savedTenant)
            ? savedTenant
            : sessionData.tenant_id || null;
          
          setCurrentTenant(tenantToUse);
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback((redirectTo?: string) => {
    const redirect = redirectTo || window.location.pathname;
    window.location.href = '/api/auth/login?redirect=' + encodeURIComponent(redirect);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('currentTenant');
    window.location.href = '/api/auth/logout';
  }, []);

  const switchTenant = useCallback((tenantId: string | null) => {
    setCurrentTenant(tenantId);
    if (tenantId) {
      localStorage.setItem('currentTenant', tenantId);
    } else {
      localStorage.removeItem('currentTenant');
    }
  }, []);

  const value: AuthContextType = {
    session,
    user,
    currentTenant,
    isLoading,
    isAuthenticated: session?.is_authenticated ?? false,
    isGuest: session?.is_guest ?? true,
    login,
    logout,
    switchTenant,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
