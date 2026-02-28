/**
 * @digistratum/ds-core - useConsent Hook
 * 
 * Hook to check and manage cookie consent level.
 * Provides reactive state for GDPR compliance across components.
 * 
 * NOTE: The UI component (GDPR banner) is NOT included here.
 * Use this hook to check consent state; implement UI per app requirements.
 * See issue #358 for the GDPR consent component.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '../utils/constants';
import type { ConsentLevel } from '../types';

// External store for cross-component reactivity
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): ConsentLevel {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
  if (value === 'all' || value === 'essential') {
    return value;
  }
  return null;
}

function getServerSnapshot(): ConsentLevel {
  return null;
}

function notifyListeners(): void {
  listeners.forEach((callback) => callback());
}

export interface UseConsentReturn {
  /** Current consent level: 'all' | 'essential' | null */
  consentLevel: ConsentLevel;
  /** Whether user has made any choice */
  hasConsented: boolean;
  /** Whether user accepted all cookies (analytics, ads, etc.) */
  hasFullConsent: boolean;
  /** Update consent level */
  setConsent: (level: 'all' | 'essential') => void;
  /** Clear consent (for testing/settings) */
  clearConsent: () => void;
}

/**
 * Hook to check and manage cookie consent level
 * 
 * @returns Consent state and utilities
 * 
 * @example
 * ```tsx
 * const { hasFullConsent } = useConsent();
 * if (hasFullConsent) {
 *   // Load analytics, personalization, etc.
 * }
 * ```
 */
export function useConsent(): UseConsentReturn {
  const consentLevel = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setConsent = useCallback((level: 'all' | 'essential') => {
    localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, level);
    notifyListeners();
  }, []);

  const clearConsent = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.COOKIE_CONSENT);
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
