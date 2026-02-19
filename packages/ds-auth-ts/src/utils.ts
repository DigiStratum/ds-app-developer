import { User, AuthConfig } from './types';

/**
 * Build the SSO login URL
 */
export function buildLoginURL(config: AuthConfig, redirectTo?: string): string {
  const ssoBaseURL = config.ssoBaseURL || 'https://account.digistratum.com';
  const appURL = config.appURL || (typeof window !== 'undefined' ? window.location.origin : '');
  const redirect = redirectTo || '/';

  return (
    `${ssoBaseURL}/oauth/authorize?app_id=${config.appId}` +
    `&redirect_uri=${encodeURIComponent(appURL + '/auth/callback')}` +
    `&state=${encodeURIComponent(redirect)}`
  );
}

/**
 * Build the SSO logout URL
 */
export function buildLogoutURL(config: AuthConfig): string {
  const ssoBaseURL = config.ssoBaseURL || 'https://account.digistratum.com';
  const appURL = config.appURL || (typeof window !== 'undefined' ? window.location.origin : '');

  return `${ssoBaseURL}/logout?redirect_uri=${encodeURIComponent(appURL)}`;
}

/**
 * Check if a user has access to a specific tenant
 */
export function userHasTenant(user: User | null, tenantId: string): boolean {
  if (!user || !tenantId) {
    return false;
  }
  return user.tenants.includes(tenantId);
}

/**
 * Parse callback query params after SSO redirect
 */
export function parseCallbackParams(): { code?: string; state?: string; error?: string } {
  if (typeof window === 'undefined') {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get('code') || undefined,
    state: params.get('state') || undefined,
    error: params.get('error') || undefined,
  };
}

/**
 * Get the redirect path from callback state
 */
export function getRedirectFromState(state: string | undefined): string {
  if (!state) {
    return '/';
  }
  try {
    const decoded = decodeURIComponent(state);
    // Ensure it's a relative path for security
    if (decoded.startsWith('/')) {
      return decoded;
    }
    return '/';
  } catch {
    return '/';
  }
}

/**
 * Storage utilities with fallback for SSR
 */
export const storage = {
  get(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  },

  set(key: string, value: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },

  remove(key: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
};
