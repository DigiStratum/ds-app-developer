export { DSNav } from './DSNav';
export type { DSNavFullProps } from './DSNav';

export { DSLayout } from './DSLayout';
export type { DSLayoutFullProps } from './DSLayout';

export { Footer } from './Footer';

export { TenantSwitcher } from './TenantSwitcher';
export type { TenantSwitcherProps } from './TenantSwitcher';

export { UserMenu } from './UserMenu';
export type { UserMenuProps } from './UserMenu';

export { ThemeToggle } from './ThemeToggle';
export type { ThemeToggleProps } from './ThemeToggle';

// GDPR Consent
export {
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
} from './gdpr';

export type {
  GdprConsent,
  GdprPreferences,
  GdprConsentState,
  GdprConsentActions,
  UseGdprConsentReturn,
  GdprBannerProps,
  GdprPreferencesModalProps,
  GdprManageLinkProps,
} from './gdpr';
