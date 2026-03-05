import { useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { DS_URLS } from '@digistratum/ds-core';
import type { ConsentLevel } from './types';

const COOKIE_CONSENT_KEY = 'ds-cookie-consent';
const COOKIE_DOMAIN = '.digistratum.com';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; domain=${COOKIE_DOMAIN}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; domain=${COOKIE_DOMAIN}; path=/; max-age=0`;
}

function getSnapshot(): ConsentLevel {
  const value = getCookie(COOKIE_CONSENT_KEY);
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
 */
export function useConsent() {
  const consentLevel = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const setConsent = useCallback((level: 'all' | 'essential') => {
    setCookie(COOKIE_CONSENT_KEY, level, COOKIE_MAX_AGE);
    notifyListeners();
  }, []);

  const clearConsent = useCallback(() => {
    deleteCookie(COOKIE_CONSENT_KEY);
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
 * GDPR cookie consent banner component
 */
export function GdprBanner() {
  const { t } = useTranslation();
  const { hasConsented, setConsent } = useConsent();

  if (hasConsented) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-4"
    >
      <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="text-center sm:text-left">
            <h2
              id="cookie-consent-title"
              className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-center sm:justify-start gap-2"
            >
              {t('cookies.title', 'We use cookies to improve your experience')}
            </h2>
            <p
              id="cookie-consent-description"
              className="mt-2 text-sm text-gray-600 dark:text-gray-300"
            >
              {t('cookies.message', 'We use essential cookies for authentication, plus optional cookies for personalization, analytics, and relevant ads.')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href={DS_URLS.PRIVACY}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline order-last sm:order-first"
            >
              {t('cookies.privacyPolicy', 'Learn more in our Privacy Policy')}
            </a>
            <div className="flex gap-3">
              <button
                onClick={() => setConsent('essential')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                aria-label={t('cookies.onlyNecessaryAriaLabel', 'Accept only necessary cookies for authentication')}
              >
                {t('cookies.onlyNecessary', 'Only Necessary')}
              </button>
              <button
                onClick={() => setConsent('all')}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                aria-label={t('cookies.acceptAllAriaLabel', 'Accept all cookies including analytics and personalization')}
              >
                {t('cookies.acceptAll', 'Accept All')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
