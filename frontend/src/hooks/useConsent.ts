import { useCallback, useSyncExternalStore } from 'react';

const COOKIE_CONSENT_KEY = 'ds-cookie-consent';

export type ConsentLevel = 'all' | 'essential' | null;

// External store for cross-component reactivity
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): ConsentLevel {
  const value = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (value === 'all' || value === 'essential') {
    return value;
  }
  return null;
}

function notifyListeners(): void {
  listeners.forEach((callback) => callback());
}

/**
 * Hook to check and manage cookie consent level
 * 
 * @returns {Object} consent state and utilities
 * - consentLevel: 'all' | 'essential' | null (null = not yet decided)
 * - hasConsented: boolean - whether user has made any choice
 * - hasFullConsent: boolean - whether user accepted all cookies
 * - setConsent: function to update consent level
 * - clearConsent: function to reset consent (for testing/settings)
 * 
 * @example
 * const { hasFullConsent } = useConsent();
 * if (hasFullConsent) {
 *   // Load analytics, personalization, etc.
 * }
 */
export function useConsent() {
  const consentLevel = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const setConsent = useCallback((level: 'all' | 'essential') => {
    localStorage.setItem(COOKIE_CONSENT_KEY, level);
    notifyListeners();
  }, []);

  const clearConsent = useCallback(() => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    notifyListeners();
  }, []);

  return {
    consentLevel,
    hasConsented: consentLevel !== null,
    hasFullConsent: consentLevel === 'all',
    setConsent,
    clearConsent,
  };
}

/**
 * Get current consent level without hook (for non-React code)
 */
export function getConsentLevel(): ConsentLevel {
  return getSnapshot();
}

/**
 * Check if full consent was given (for non-React code)
 */
export function hasFullConsent(): boolean {
  return getSnapshot() === 'all';
}
