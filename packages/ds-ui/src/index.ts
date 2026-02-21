// Components
export {
  DSNav,
  DSLayout,
  Footer,
  TenantSwitcher,
  UserMenu,
  ThemeToggle,
  // GDPR
  GdprBanner,
  GdprPreferencesModal,
  GdprManageLink,
  useGdprConsent,
  readConsent,
  writeConsent,
  clearConsent,
  GDPR_COOKIE_NAME,
  GDPR_COOKIE_DOMAIN,
  GDPR_COOKIE_EXPIRY_DAYS,
} from './components';

export type {
  DSNavFullProps,
  DSLayoutFullProps,
  TenantSwitcherProps,
  UserMenuProps,
  ThemeToggleProps,
  // GDPR
  GdprConsent,
  GdprPreferences,
  GdprConsentState,
  GdprConsentActions,
  UseGdprConsentReturn,
  GdprBannerProps,
  GdprPreferencesModalProps,
  GdprManageLinkProps,
} from './components';

// Hooks
export {
  useTheme,
  ThemeProvider,
  useTranslation,
} from './hooks';

export type { ThemeProviderProps } from './hooks';

// Types
export type {
  User,
  Tenant,
  AuthContext,
  Theme,
  ThemeContext,
  DSApp,
  DSLayoutProps,
  DSNavProps,
  FooterProps,
} from './types';
