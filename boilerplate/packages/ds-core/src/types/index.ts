/**
 * @digistratum/ds-core - Core Types
 * 
 * Shared TypeScript types for DigiStratum applications.
 * These types are used across all DS apps for consistency.
 */

// =============================================================================
// User & Auth Types
// =============================================================================

/**
 * Tenant information returned from DSAccount
 */
export interface TenantInfo {
  id: string;
  name: string;
  role: string;
}

/**
 * User information from DSAccount SSO
 * [FR-AUTH-003]
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  display_name?: string;
  tenants: TenantInfo[];
  preferredLanguage?: string;
  theme?: Theme;
}

/**
 * App info for app switcher (from DSAccount)
 */
export interface AppInfo {
  id: string;
  name: string;
  url: string;
  icon: string;
  description?: string;
}

/**
 * Session state (guest session pattern)
 */
export interface Session {
  session_id: string;
  is_authenticated: boolean;
  is_guest: boolean;
  tenant_id?: string;
  user?: User;
}

/**
 * Tenant information
 * [FR-TENANT-001]
 */
export interface Tenant {
  id: string;
  name: string;
}

// =============================================================================
// Theme Types
// =============================================================================

/**
 * Theme preference
 * [FR-THEME-001]
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Theme context value
 */
export interface ThemeContext {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

/**
 * Tenant-specific theme configuration
 * [FR-THEME-004]
 */
export interface TenantThemeConfig {
  /** CSS custom properties to override */
  cssVars?: Record<string, string>;
  /** Custom logo URL */
  logoUrl?: string | null;
  /** Logo alt text */
  logoAlt?: string;
  /** Favicon URL */
  faviconUrl?: string | null;
}

// =============================================================================
// API Types
// =============================================================================

/**
 * Standard API error response format
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    request_id?: string;
  };
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
}

// =============================================================================
// Consent Types
// =============================================================================

/**
 * Cookie consent level
 * - 'all': User accepted all cookies (analytics, ads, personalization)
 * - 'essential': User accepted only essential cookies
 * - null: User hasn't made a choice yet
 */
export type ConsentLevel = 'all' | 'essential' | null;

// =============================================================================
// Feature Flag Types
// =============================================================================

/**
 * Feature flags state
 */
export interface FeatureFlagsState {
  flags: Record<string, boolean>;
  isEnabled: (key: string) => boolean;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// =============================================================================
// Layout Types
// =============================================================================

/**
 * Menu item for navigation
 */
export interface MenuItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

/**
 * Footer link configuration
 */
export interface FooterLink {
  label: string;
  url: string;
}

// =============================================================================
// Discovery Types
// =============================================================================

export type {
  DiscoveredResource,
  DiscoveryCacheEntry,
  DiscoveryCache,
  DiscoveryClientOptions,
  UseDiscoveryState,
} from './discovery';

// =============================================================================
// Shell Loader Types
// =============================================================================

export type {
  ShellModuleExports,
  DSAppShellProps,
  DSHeaderProps,
  DSFooterProps,
  AdSlotProps,
  GdprBannerProps,
  CookiePreferencesModalProps,
  ShellSlotConfig,
  ShellNavLink,
  ShellApp,
  ShellFooterLink,
  ShellUser,
  ShellAuthContext,
  ShellThemeContext,
  ShellLoaderConfig,
  ShellLoadStatus,
  UseShellLoaderState,
  UseShellLoaderOptions,
} from './shell-loader';
