import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (tenantId) {
      api.setTenant(tenantId);
    }
  }, [tenantId]);

  async function checkSession() {
    try {
      const session: Session = await api.getSession();
      if (session.authenticated && session.user) {
        setUser(session.user);
        setTenantId(session.tenantId || session.user.tenants[0] || null);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function login() {
    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.href = `/api/auth/login?return_to=${returnTo}`;
  }

  async function logout() {
    await api.logout();
    setUser(null);
    setTenantId(null);
  }

  function switchTenant(newTenantId: string) {
    setTenantId(newTenantId);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        tenantId,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
