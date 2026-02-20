// Tenant info returned from DSAccount
export interface TenantInfo {
  id: string;
  name: string;
  role: string;
}

// User types [FR-AUTH-003]
export interface User {
  id: string;
  email: string;
  name?: string;          // Frontend field
  display_name?: string;  // DSAccount returns this
  tenants: TenantInfo[];
  preferredLanguage?: string;
  theme?: 'light' | 'dark' | 'system';
}

// App info for app switcher (from DSAccount)
export interface AppInfo {
  id: string;
  name: string;
  url: string;
  icon: string;
  description?: string;
}

// Session types (guest session pattern)
export interface Session {
  session_id: string;
  is_authenticated: boolean;
  is_guest: boolean;
  tenant_id?: string;
  user?: User;
}

// Tenant types [FR-TENANT-001]
export interface Tenant {
  id: string;
  name: string;
}

// Auth context - supports both guest and authenticated sessions
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

// Theme context [FR-THEME-001]
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContext {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

// API response types
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    request_id?: string;
  };
}
