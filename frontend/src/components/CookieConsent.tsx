import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const COOKIE_CONSENT_KEY = 'ds-cookie-consent';

/**
 * Minimal GDPR cookie consent banner [FR-GDPR-001]
 * 
 * - Shows on first visit, remembers acceptance in localStorage
 * - Brief text informing about session authentication cookies
 * - Single accept button + privacy policy link
 * - Accessible (keyboard, screen reader)
 * - Mobile friendly bottom bar
 */
export function CookieConsent() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasConsented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsented) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex-1 text-center sm:text-left">
            <p
              id="cookie-consent-description"
              className="text-sm text-gray-600 dark:text-gray-300"
            >
              <span id="cookie-consent-title" className="sr-only">
                {t('cookies.title', 'Cookie Notice')}
              </span>
              {t('cookies.message', 'We use cookies for session authentication.')}{' '}
              <a
                href="/privacy"
                className="text-ds-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ds-primary focus:ring-offset-1 rounded"
              >
                {t('cookies.learnMore', 'Learn more')}
              </a>
            </p>
          </div>
          <button
            onClick={handleAccept}
            className="btn btn-primary text-sm whitespace-nowrap"
            aria-label={t('cookies.acceptAriaLabel', 'Accept cookies and close banner')}
          >
            {t('cookies.accept', 'Accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
