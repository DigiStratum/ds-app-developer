/**
 * GDPR Consent Components
 * @module @digistratum/ds-ui/gdpr
 */

// Components
export { GdprBanner } from './GdprBanner';
export { GdprPreferencesModal } from './GdprPreferencesModal';
export { GdprManageLink } from './GdprManageLink';

// Hook
export { useGdprConsent } from './useGdprConsent';

// Cookie utilities (for advanced use cases)
export {
  readConsent,
  writeConsent,
  clearConsent,
  GDPR_COOKIE_NAME,
  GDPR_COOKIE_DOMAIN,
  GDPR_COOKIE_EXPIRY_DAYS,
} from './cookie';

// Types
export type {
  GdprConsent,
  GdprPreferences,
  GdprConsentState,
  GdprConsentActions,
  UseGdprConsentReturn,
  GdprBannerProps,
  GdprPreferencesModalProps,
} from './types';
export type { GdprManageLinkProps } from './GdprManageLink';
