/**
 * @digistratum/ds-core - useConsent Hook
 * 
 * Cookie consent management using the unified ds-prefs cookie.
 * This is a compatibility wrapper around usePrefs for consent-specific usage.
 */

import { usePrefs } from './usePrefs';
import type { ConsentLevel } from '../types';

export interface UseConsentReturn {
  consentLevel: ConsentLevel;
  hasConsented: boolean;
  hasFullConsent: boolean;
  setConsent: (level: 'all' | 'essential') => void;
  clearConsent: () => void;
}

/**
 * Hook to check and manage cookie consent level
 * 
 * Uses the unified ds-prefs cookie for storage.
 * 
 * @example
 * ```tsx
 * const { hasConsented, setConsent } = useConsent();
 * 
 * if (!hasConsented) {
 *   return <GdprBanner onAccept={() => setConsent('all')} />;
 * }
 * ```
 */
export function useConsent(): UseConsentReturn {
  const { consent, hasConsented, hasFullConsent, setConsent, clearConsent } = usePrefs();
  
  return {
    consentLevel: consent,
    hasConsented,
    hasFullConsent,
    setConsent,
    clearConsent,
  };
}
