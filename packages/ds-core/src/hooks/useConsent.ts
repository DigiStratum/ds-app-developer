/**
 * @digistratum/ds-core - useConsent Hook
 * 
 * Hook to check and manage cookie consent level.
 * Uses cookies with domain=.digistratum.com for cross-subdomain sharing.
 * 
 * NOTE: The UI component (GDPR banner) is in @digistratum/layout.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '../utils/constants';
import type { ConsentLevel } from '../types';

// Cookie domain for cross-subdomain sharing
const COOKIE_DOMAIN = '.digistratum.com';
// Consent cookie expires in 1 year
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

// External store for cross-component reactivity
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Read cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Set cookie with cross-subdomain domain
 */
function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; domain=${COOKIE_DOMAIN}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}

/**
 * Delete cookie
 */
function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; domain=${COOKIE_DOMAIN}; path=/; max-age=0`;
}

function getSnapshot(): ConsentLevel {
  const value = getCookie(STORAGE_KEYS.COOKIE_CONSENT);
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
 * Stores consent in a cookie with domain=.digistratum.com so it's
 * shared across all DS apps (account, projects, developer, noc, etc.)
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
    setCookie(STORAGE_KEYS.COOKIE_CONSENT, level, COOKIE_MAX_AGE);
    notifyListeners();
  }, []);

  const clearConsent = useCallback(() => {
    deleteCookie(STORAGE_KEYS.COOKIE_CONSENT);
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
