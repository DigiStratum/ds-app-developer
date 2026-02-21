/**
 * useGdprConsent Hook
 * React hook for managing GDPR consent state
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GdprConsent, GdprPreferences, UseGdprConsentReturn } from './types';
import {
  readConsent,
  writeConsent,
  clearConsent,
  createAcceptAllConsent,
  createRejectAllConsent,
  createCustomConsent,
  isBrowser,
} from './cookie';

/**
 * Hook for managing GDPR consent
 * 
 * @example
 * ```tsx
 * const { consent, showBanner, acceptAll, rejectAll, hasConsent } = useGdprConsent();
 * 
 * // Check if analytics is allowed
 * if (hasConsent('analytics')) {
 *   // Initialize analytics
 * }
 * ```
 */
export function useGdprConsent(): UseGdprConsentReturn {
  const [consent, setConsent] = useState<GdprConsent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Load consent from cookie on mount
  useEffect(() => {
    if (!isBrowser()) {
      setIsLoading(false);
      return;
    }

    const storedConsent = readConsent();
    setConsent(storedConsent);
    setIsLoading(false);
  }, []);

  // Determine if banner should be shown
  const showBanner = useMemo(() => {
    if (isLoading) return false;
    return consent === null;
  }, [consent, isLoading]);

  // Accept all cookies
  const acceptAll = useCallback(() => {
    const newConsent = createAcceptAllConsent();
    writeConsent(newConsent);
    setConsent(newConsent);
    setPreferencesOpen(false);
  }, []);

  // Reject all non-essential cookies
  const rejectAll = useCallback(() => {
    const newConsent = createRejectAllConsent();
    writeConsent(newConsent);
    setConsent(newConsent);
    setPreferencesOpen(false);
  }, []);

  // Set custom preferences
  const setPreferences = useCallback((preferences: GdprPreferences) => {
    const newConsent = createCustomConsent(preferences);
    writeConsent(newConsent);
    setConsent(newConsent);
    setPreferencesOpen(false);
  }, []);

  // Open preferences modal
  const openPreferences = useCallback(() => {
    setPreferencesOpen(true);
  }, []);

  // Close preferences modal
  const closePreferences = useCallback(() => {
    setPreferencesOpen(false);
  }, []);

  // Check if a specific category is consented
  const hasConsent = useCallback((category: keyof GdprPreferences): boolean => {
    if (!consent || !consent.preferences) return false;
    return consent.preferences[category] === true;
  }, [consent]);

  // Revoke all consent
  const revokeConsent = useCallback(() => {
    clearConsent();
    setConsent(null);
    setPreferencesOpen(false);
  }, []);

  return {
    // State
    consent,
    showBanner,
    isLoading,
    preferencesOpen,
    // Actions
    acceptAll,
    rejectAll,
    setPreferences,
    openPreferences,
    closePreferences,
    hasConsent,
    revokeConsent,
  };
}

export default useGdprConsent;
