// User types [FR-AUTH-003]
export interface User {
  id: string;
  email: string;
  name: string;
  tenants: string[];
  preferredLanguage?: string;
  theme?: 'light' | 'dark' | 'system';
}

// Tenant types [FR-TENANT-001]
export interface Tenant {
  id: string;
  name: string;
}

// Auth context
export interface AuthContext {
  user: User | null;
  currentTenant: string | null;
  isLoading: boolean;
  login: () => void;
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
