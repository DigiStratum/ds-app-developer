import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { DS_URLS } from '@digistratum/ds-core';
import type { AuthContext, User } from './types';

const CURRENT_TENANT_KEY = 'ds-current-tenant';

// Simple external store for auth state (allows multiple components to share)
type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  currentTenant: string | null;
};

let authState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  currentTenant: null,
};

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): AuthState {
  return authState;
}

function notify(): void {
  listeners.forEach((cb) => cb());
}

function setAuthState(newState: Partial<AuthState>): void {
  authState = { ...authState, ...newState };
  notify();
}

let fetchPromise: Promise<void> | null = null;

async function fetchAuthState(): Promise<void> {
  if (fetchPromise) return fetchPromise;
  
  fetchPromise = (async () => {
    try {
      // Call DSAccount /api/auth/me directly with credentials (sends ds_session cookie)
      const response = await fetch(`${DS_URLS.ACCOUNT}/api/auth/me`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        // Not authenticated
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
        });
        return;
      }
      
      const data = await response.json();
      const tenants = data.tenants || [];
      
      // Restore tenant from localStorage
      const savedTenant = localStorage.getItem(CURRENT_TENANT_KEY);
      const currentTenant = savedTenant && tenants.some((t: { id: string }) => t.id === savedTenant)
        ? savedTenant
        : (tenants.length > 0 ? tenants[0].id : null);
      
      setAuthState({
        isLoading: false,
        isAuthenticated: true,
        user: {
          id: data.id,
          email: data.email,
          name: data.display_name || data.email,
          avatarUrl: data.avatar_url,
          tenants,
        },
        currentTenant,
      });
    } catch (error) {
      console.error('AppShell: Failed to fetch auth state:', error);
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
    }
  })();
  
  return fetchPromise;
}

/**
 * Internal auth hook for AppShell
 * Fetches auth state directly from DSAccount (no app-specific backend needed)
 */
export function useAppShellAuth(): AuthContext & { isLoading: boolean } {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  
  useEffect(() => {
    if (state.isLoading) {
      fetchAuthState();
    }
  }, [state.isLoading]);
  
  const login = useCallback(() => {
    const currentUrl = window.location.href;
    window.location.href = `${DS_URLS.ACCOUNT}/api/sso/authorize?app_id=developer&redirect_uri=${encodeURIComponent(currentUrl)}`;
  }, []);
  
  const logout = useCallback(() => {
    localStorage.removeItem(CURRENT_TENANT_KEY);
    window.location.href = `${DS_URLS.ACCOUNT}/api/auth/logout?redirect=${encodeURIComponent(window.location.origin)}`;
  }, []);
  
  const switchTenant = useCallback((tenantId: string | null) => {
    if (tenantId) {
      localStorage.setItem(CURRENT_TENANT_KEY, tenantId);
    } else {
      localStorage.removeItem(CURRENT_TENANT_KEY);
    }
    setAuthState({ currentTenant: tenantId });
  }, []);
  
  return {
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    currentTenant: state.currentTenant,
    login,
    logout,
    switchTenant,
  };
}
