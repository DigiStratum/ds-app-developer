/**
 * @digistratum/ds-core - Shell Loader Types
 * 
 * Types for the remote App Shell loader utility.
 * Implements FR-SHELL-001: Load shell from CDN at runtime.
 * 
 * @see ~/.openclaw/workspace/spikes/912-app-shell-evaluation.md
 */

import type { ReactNode, ComponentType, LazyExoticComponent } from 'react';

// =============================================================================
// Shell Module Types
// =============================================================================

/**
 * The shape of the remote shell module exports.
 * Must match @digistratum/layout package exports.
 */
export interface ShellModuleExports {
  /** Main app shell wrapper component */
  DSAppShell: ComponentType<DSAppShellProps>;
  /** Header component */
  DSHeader: ComponentType<DSHeaderProps>;
  /** Footer component */
  DSFooter: ComponentType<DSFooterProps>;
  /** Ad slot component */
  AdSlot?: ComponentType<AdSlotProps>;
  /** GDPR banner component */
  GdprBanner?: ComponentType<GdprBannerProps>;
  /** Cookie preferences modal */
  CookiePreferencesModal?: ComponentType<CookiePreferencesModalProps>;
}

// =============================================================================
// Shell Component Props (subset of @digistratum/layout types)
// =============================================================================

/**
 * DSAppShell props - mirrors @digistratum/layout
 */
export interface DSAppShellProps {
  children: ReactNode;
  appName: string;
  currentAppId?: string;
  logoUrl?: string;
  logoAlt?: string;
  auth?: ShellAuthContext;
  theme?: ShellThemeContext;
  navLinks?: ShellNavLink[];
  apps?: ShellApp[];
  appsApiUrl?: string;
  footerLinks?: ShellFooterLink[];
  copyrightHolder?: string;
  privateBrandedHeader?: ShellSlotConfig;
  leftAdMargin?: ShellSlotConfig;
  rightAdMargin?: ShellSlotConfig;
  showAppSwitcher?: boolean;
  showThemeToggle?: boolean;
  showUserMenu?: boolean;
  showPreferences?: boolean;
  showGdprBanner?: boolean;
  showTenantSwitcher?: boolean;
  className?: string;
  contentClassName?: string;
  renderHeader?: (props: DSAppShellProps) => ReactNode;
  renderFooter?: (props: DSAppShellProps) => ReactNode;
}

/**
 * DSHeader props subset
 */
export interface DSHeaderProps {
  appName: string;
  currentAppId?: string;
  logoUrl?: string;
  logoAlt?: string;
  auth?: ShellAuthContext;
  theme?: ShellThemeContext;
  navLinks?: ShellNavLink[];
  apps?: ShellApp[];
  appsApiUrl?: string;
  showAppSwitcher?: boolean;
  showThemeToggle?: boolean;
  showUserMenu?: boolean;
  showPreferences?: boolean;
  showTenantSwitcher?: boolean;
}

/**
 * DSFooter props subset
 */
export interface DSFooterProps {
  appName?: string;
  links?: ShellFooterLink[];
  copyrightHolder?: string;
  showGdprBanner?: boolean;
}

/**
 * AdSlot props
 */
export interface AdSlotProps {
  position: 'header' | 'footer' | 'sidebar';
  className?: string;
}

/**
 * GdprBanner props
 */
export interface GdprBannerProps {
  onAcceptAll?: () => void;
  onAcceptEssential?: () => void;
  onManagePreferences?: () => void;
}

/**
 * CookiePreferencesModal props
 */
export interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (preferences: Record<string, boolean>) => void;
}

// =============================================================================
// Supporting Types for Shell Props
// =============================================================================

export interface ShellSlotConfig {
  content?: ReactNode;
  visible?: boolean;
  className?: string;
}

export interface ShellNavLink {
  label: string;
  path: string;
  icon?: ReactNode;
  active?: boolean;
}

export interface ShellApp {
  id: string;
  name: string;
  url: string;
  icon?: string | ReactNode;
  current?: boolean;
}

export interface ShellFooterLink {
  label: string;
  url: string;
  external?: boolean;
}

export interface ShellUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  tenants?: Array<{
    id: string;
    name: string;
    role?: string;
  }>;
}

export interface ShellAuthContext {
  user: ShellUser | null;
  isAuthenticated: boolean;
  currentTenant: string | null;
  login: () => void;
  logout: () => void;
  switchTenant: (tenantId: string | null) => void;
}

export interface ShellThemeContext {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

// =============================================================================
// Shell Loader Configuration
// =============================================================================

/**
 * Configuration options for the shell loader
 */
export interface ShellLoaderConfig {
  /**
   * URL to the shell module on CDN.
   * Can be set via VITE_SHELL_URL environment variable.
   * 
   * @example 'https://apps.digistratum.com/shell/v1/index.mjs'
   */
  shellUrl?: string;

  /**
   * Version constraint for the shell (used in URL construction).
   * @example 'v1', 'v2', 'latest'
   */
  version?: string;

  /**
   * Timeout in milliseconds before considering load failed.
   * @default 10000 (10 seconds)
   */
  timeout?: number;

  /**
   * Number of retry attempts on failure.
   * @default 2
   */
  retries?: number;

  /**
   * Enable local fallback if CDN load fails.
   * When true, attempts to import from local @digistratum/layout.
   * @default true
   */
  enableLocalFallback?: boolean;

  /**
   * Preload hint strategy.
   * - 'eager': Add preload link immediately
   * - 'lazy': Add preload on first use
   * - 'none': No preloading
   * @default 'eager'
   */
  preloadStrategy?: 'eager' | 'lazy' | 'none';
}

// =============================================================================
// Shell Loader State
// =============================================================================

/**
 * Loading status for shell components
 */
export type ShellLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * State returned by useShellLoader hook
 */
export interface UseShellLoaderState {
  /** Current loading status */
  status: ShellLoadStatus;

  /** Error if load failed */
  error: Error | null;

  /** Whether shell is ready to use */
  isReady: boolean;

  /** Whether shell is currently loading */
  isLoading: boolean;

  /** Lazy-loaded DSAppShell component */
  DSAppShell: LazyExoticComponent<ComponentType<DSAppShellProps>>;

  /** Lazy-loaded DSHeader component */
  DSHeader: LazyExoticComponent<ComponentType<DSHeaderProps>>;

  /** Lazy-loaded DSFooter component */
  DSFooter: LazyExoticComponent<ComponentType<DSFooterProps>>;

  /** Retry loading after error */
  retry: () => void;
}

/**
 * Options for useShellLoader hook
 */
export interface UseShellLoaderOptions extends ShellLoaderConfig {
  /**
   * Skip loading entirely (useful for SSR or testing).
   * @default false
   */
  skip?: boolean;

  /**
   * Custom fallback component to show while loading.
   */
  loadingFallback?: ReactNode;

  /**
   * Custom fallback component to show on error.
   */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
}
