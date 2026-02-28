import type { User, AuthContext } from '../../types';

/**
 * UserSession component display variants
 */
export type UserSessionVariant = 'compact' | 'full' | 'avatar-only';

/**
 * Props for the UserSession component
 */
export interface UserSessionProps {
  /** User data to display */
  user: User | null;
  /** Current tenant ID (for display) */
  currentTenant?: string | null;
  /** Display variant */
  variant?: UserSessionVariant;
  /** Show tenant name alongside user */
  showTenant?: boolean;
  /** Show user's role in current tenant */
  showRole?: boolean;
  /** Custom click handler (for opening menu, etc.) */
  onClick?: () => void;
  /** Show dropdown indicator arrow */
  showDropdownIndicator?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether the component is in an interactive/clickable state */
  interactive?: boolean;
}

/**
 * Props for the UserSessionMenu (dropdown menu with actions)
 */
export interface UserSessionMenuProps {
  /** User data */
  user: User;
  /** Auth context for logout, tenant switching */
  auth: AuthContext;
  /** Whether menu is currently open */
  isOpen: boolean;
  /** Callback to close the menu */
  onClose: () => void;
  /** Additional menu items to render */
  additionalItems?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}
