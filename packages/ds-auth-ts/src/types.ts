/**
 * User information from DSAccount SSO
 */
export interface User {
  id: string;
  email: string;
  name: string;
  tenants: string[];
  preferredLanguage?: string;
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Tenant information
 */
export interface Tenant {
  id: string;
  name: string;
}

/**
 * Authentication context interface
 */
export interface AuthContextValue {
  /** Current authenticated user, null if not authenticated */
  user: User | null;
  /** Currently selected tenant ID, null for personal/default context */
  currentTenant: string | null;
  /** True while checking authentication status */
  isLoading: boolean;
  /** True if user is authenticated */
  isAuthenticated: boolean;
  /** Redirect to SSO login */
  login: (redirectTo?: string) => void;
  /** Logout and redirect to DSAccount logout */
  logout: () => void;
  /** Switch to a different tenant context */
  switchTenant: (tenantId: string | null) => void;
  /** Refresh the current user session */
  refresh: () => Promise<void>;
}

/**
 * Configuration for AuthProvider
 */
export interface AuthConfig {
  /** Base URL for DSAccount SSO (default: https://account.digistratum.com) */
  ssoBaseURL?: string;
  /** Application ID registered with DSAccount */
  appId: string;
  /** Base URL of this application */
  appURL?: string;
  /** API base URL for /api/me endpoint (default: '') */
  apiBaseURL?: string;
  /** Session storage key for tenant (default: 'ds_currentTenant') */
  tenantStorageKey?: string;
  /** Custom session check endpoint (default: '/api/me') */
  sessionEndpoint?: string;
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  /** Base URL for API requests */
  baseURL?: string;
  /** Default headers for all requests */
  defaultHeaders?: Record<string, string>;
}

/**
 * API error response format
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    request_id?: string;
  };
}
