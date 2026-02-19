import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContext } from '../types';
import { api } from '../api/client';

const AuthContextInstance = createContext<AuthContext | null>(null);

// Auth provider [FR-AUTH-001, FR-AUTH-003]
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await api.get<User>('/api/me');
      setUser(userData);
      
      // Restore tenant from localStorage
      const savedTenant = localStorage.getItem('currentTenant');
      if (savedTenant && userData.tenants.includes(savedTenant)) {
        setCurrentTenant(savedTenant);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect to DSAccount SSO [FR-AUTH-002]
  const login = () => {
    window.location.href = '/auth/callback?redirect=' + encodeURIComponent(window.location.pathname);
  };

  // Logout and redirect [FR-AUTH-004]
  const logout = () => {
    localStorage.removeItem('currentTenant');
    window.location.href = '/auth/logout';
  };

  // Switch tenant context [FR-TENANT-002]
  const switchTenant = (tenantId: string | null) => {
    setCurrentTenant(tenantId);
    if (tenantId) {
      localStorage.setItem('currentTenant', tenantId);
    } else {
      localStorage.removeItem('currentTenant');
    }
  };

  return (
    <AuthContextInstance.Provider value={{ user, currentTenant, isLoading, login, logout, switchTenant }}>
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
