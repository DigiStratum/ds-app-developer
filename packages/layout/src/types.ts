import { ReactNode } from 'react';

/**
 * Slot configuration for optional collapsible sections
 */
export interface SlotConfig {
  /** Content to render in the slot */
  content?: ReactNode;
  /** Whether the slot is currently visible (default: true) */
  visible?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Navigation link configuration
 */
export interface NavLink {
  label: string;
  path: string;
  icon?: ReactNode;
  /** Whether this link is currently active */
  active?: boolean;
}

/**
 * App in the app-switcher dropdown
 */
export interface DSApp {
  id: string;
  name: string;
  url: string;
  icon?: string | ReactNode;
  /** Whether this is the current app */
  current?: boolean;
}

/**
 * Footer link configuration
 */
export interface FooterLink {
  label: string;
  url: string;
  /** Open in new tab */
  external?: boolean;
}

/**
 * User information for the header
 */
export interface User {
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

/**
 * Auth context for header user controls
 */
export interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  currentTenant: string | null;
  login: () => void;
  logout: () => void;
  switchTenant: (tenantId: string | null) => void;
}

/**
 * Theme context for the app shell
 */
export interface ThemeContext {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

/**
 * DSAppShell Props
 * 
 * The main layout wrapper with configurable slots for:
 * - privateBrandedHeader (collapsible)
 * - header (logo, nav, app-switcher, preferences, account link)
 * - leftAdMargin (collapsible)
 * - mainContent (mount point)
 * - rightAdMargin (collapsible)
 * - footer (copyright, legal, GDPR)
 * 
 * @example
 * ```tsx
 * <DSAppShell
 *   appName="DSKanban"
 *   auth={authContext}
 *   theme={themeContext}
 *   navLinks={[{ label: 'Board', path: '/board' }]}
 *   apps={dsApps}
 * >
 *   <YourAppContent />
 * </DSAppShell>
 * ```
 */
export interface DSAppShellProps {
  /** Main content to render in the content area */
  children: ReactNode;
  
  /** App display name */
  appName: string;
  
  /** App ID for highlighting in app-switcher */
  currentAppId?: string;
  
  /** Logo URL (falls back to DS default) */
  logoUrl?: string;
  
  /** Logo alt text */
  logoAlt?: string;
  
  /** Auth context for user controls */
  auth?: AuthContext;
  
  /** Theme context for theme toggle */
  theme?: ThemeContext;
  
  /** Navigation links to show in header */
  navLinks?: NavLink[];
  
  /** Apps for the app-switcher dropdown */
  apps?: DSApp[];
  
  /** Footer links */
  footerLinks?: FooterLink[];
  
  /** Copyright holder name (default: 'DigiStratum') */
  copyrightHolder?: string;
  
  // --- Slot configurations ---
  
  /** Private branded header slot (above main header, collapsible) */
  privateBrandedHeader?: SlotConfig;
  
  /** Left ad/margin slot (collapsible) */
  leftAdMargin?: SlotConfig;
  
  /** Right ad/margin slot (collapsible) */
  rightAdMargin?: SlotConfig;
  
  // --- Feature toggles ---
  
  /** Show app-switcher dropdown (default: true) */
  showAppSwitcher?: boolean;
  
  /** Show theme toggle button (default: true) */
  showThemeToggle?: boolean;
  
  /** Show user menu (default: true) */
  showUserMenu?: boolean;
  
  /** Show preferences button (default: true) */
  showPreferences?: boolean;
  
  /** Show GDPR cookie banner (default: true) */
  showGdprBanner?: boolean;
  
  /** Show tenant switcher for multi-tenant users (default: true) */
  showTenantSwitcher?: boolean;
  
  /** Additional className for the shell wrapper */
  className?: string;
  
  /** Override the content container className */
  contentClassName?: string;
  
  /** Render function for custom header (replaces default) */
  renderHeader?: (props: DSAppShellProps) => ReactNode;
  
  /** Render function for custom footer (replaces default) */
  renderFooter?: (props: DSAppShellProps) => ReactNode;
}
