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
 * Tenant information for multi-tenant context
 */
export interface Tenant {
  id: string;
  name: string;
  role?: string;
}

/**
 * Menu item for navigation
 */
export interface MenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label */
  label: string;
  /** Navigation path (relative URL) - optional if onClick is provided */
  path?: string;
  /** Optional icon (emoji or React node) */
  icon?: ReactNode;
  /** Badge text or number (e.g., notification count) */
  badge?: string | number;
  /** Nested menu items (for submenus/dropdowns) */
  children?: MenuItem[];
  /** Click handler (alternative to path navigation) */
  onClick?: () => void;
  /** Whether this item is visible (default: true) */
  visible?: boolean;
  /** Whether this item is currently active */
  active?: boolean;
  /** Whether this item is disabled */
  disabled?: boolean;
}

/**
 * Zone visibility configuration for AppShell
 */
export interface AppShellZoneVisibility {
  /** Hide the custom header zone (default: false) */
  hideCustomHeader?: boolean;
  /** Hide the DS Header zone entirely (default: false) */
  hideHeader?: boolean;
  /** Hide the navigation menu within the header (default: false) */
  hideNavigation?: boolean;
  /** Hide the DS Footer zone (default: false) */
  hideFooter?: boolean;
}

/**
 * AppShell Props - Base interface
 */
export interface AppShellProps extends AppShellZoneVisibility {
  /** Optional custom header content (collapses to 0 height when null/undefined) */
  customHeader?: ReactNode;
  /** Callback to get menu items based on current user and tenant */
  getMenuItems?: (user: User | null, tenant: Tenant | null) => MenuItem[];
  /** Main content to render in the content container */
  children: ReactNode;
  /** Optional custom footer content (replaces DS Footer when provided) */
  customFooter?: ReactNode;
}

/**
 * Extended AppShell Props with all DS-specific features
 */
export interface AppShellExtendedProps extends AppShellProps {
  /** App display name */
  appName?: string;
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
  /** Apps for the app-switcher dropdown */
  apps?: DSApp[];
  /** URL to fetch apps from registry API */
  appsApiUrl?: string;
  /** Footer links (when not using customFooter) */
  footerLinks?: FooterLink[];
  /** Copyright holder name (default: 'DigiStratum') */
  copyrightHolder?: string;
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
  /** Custom menu content for hamburger menu */
  menuContent?: ReactNode;
}

/**
 * DSHeader Props
 */
export interface DSHeaderProps {
  appName: string;
  currentAppId?: string;
  logoUrl?: string;
  logoAlt?: string;
  logoLinkUrl?: string;
  auth?: AuthContext;
  theme?: ThemeContext;
  navLinks?: NavLink[];
  apps?: DSApp[];
  appsApiUrl?: string;
  showAppSwitcher?: boolean;
  showThemeToggle?: boolean;
  showUserMenu?: boolean;
  showPreferences?: boolean;
  showTenantSwitcher?: boolean;
  className?: string;
  menuContent?: ReactNode;
}

/**
 * DSFooter Props
 */
export interface DSFooterProps {
  appName: string;
  links?: FooterLink[];
  copyrightHolder?: string;
  showGdprBanner?: boolean;
  showDefaultLinks?: boolean;
  showCookieSettings?: boolean;
  className?: string;
  appVersion?: string;
  sticky?: boolean;
}

/**
 * AdSlot Props
 */
export interface AdSlotProps {
  position: 'header' | 'footer';
  className?: string;
}

/**
 * Cookie consent level
 */
export type ConsentLevel = 'all' | 'essential' | null;

/**
 * Cookie Preferences Modal Props
 */
export interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}
