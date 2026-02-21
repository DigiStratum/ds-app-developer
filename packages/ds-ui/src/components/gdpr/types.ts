/**
 * GDPR Consent Types
 * @module @digistratum/ds-ui/gdpr
 */

export interface GdprPreferences {
  /** Analytics cookies (Google Analytics, etc.) */
  analytics: boolean;
  /** Marketing/advertising cookies */
  marketing: boolean;
}

export interface GdprConsent {
  /** Whether user has accepted any cookies beyond necessary */
  accepted: boolean;
  /** Unix timestamp when consent was given/updated */
  timestamp: number;
  /** Granular preferences if user customized */
  preferences?: GdprPreferences;
}

export interface GdprConsentState {
  /** Current consent data (null if not yet given) */
  consent: GdprConsent | null;
  /** Whether consent banner should be shown */
  showBanner: boolean;
  /** Whether consent is loading from cookie */
  isLoading: boolean;
}

export interface GdprConsentActions {
  /** Accept all cookies */
  acceptAll: () => void;
  /** Reject all non-essential cookies */
  rejectAll: () => void;
  /** Set custom preferences */
  setPreferences: (preferences: GdprPreferences) => void;
  /** Open the preferences modal */
  openPreferences: () => void;
  /** Close the preferences modal */
  closePreferences: () => void;
  /** Check if a specific category is consented */
  hasConsent: (category: keyof GdprPreferences) => boolean;
  /** Revoke all consent (clear cookie) */
  revokeConsent: () => void;
}

export interface UseGdprConsentReturn extends GdprConsentState, GdprConsentActions {
  /** Whether preferences modal is open */
  preferencesOpen: boolean;
}

export interface GdprBannerProps {
  /** Custom banner title */
  title?: string;
  /** Custom banner description */
  description?: string;
  /** Custom "Accept All" button text */
  acceptAllText?: string;
  /** Custom "Reject All" button text */
  rejectAllText?: string;
  /** Custom "Customize" button text */
  customizeText?: string;
  /** Custom "Save Preferences" button text */
  savePreferencesText?: string;
  /** Link to privacy policy */
  privacyPolicyUrl?: string;
  /** Custom privacy policy link text */
  privacyPolicyText?: string;
  /** Position of the banner */
  position?: 'top' | 'bottom';
  /** Custom class name for styling */
  className?: string;
  /** Z-index for the banner */
  zIndex?: number;
}

export interface GdprPreferencesModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Current preferences */
  preferences: GdprPreferences;
  /** Save handler */
  onSave: (preferences: GdprPreferences) => void;
  /** Custom modal title */
  title?: string;
  /** Custom class name */
  className?: string;
  /** Z-index for the modal */
  zIndex?: number;
}
