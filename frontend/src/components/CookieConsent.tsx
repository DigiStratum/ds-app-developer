import { useTranslation } from 'react-i18next';
import { useConsent } from '../hooks/useConsent';

/**
 * GDPR cookie consent banner with Accept All / Only Necessary options [FR-GDPR-001]
 * 
 * - Shows on first visit, remembers choice in localStorage
 * - Two options: "Accept All" (analytics, personalization) or "Only Necessary" (auth only)
 * - Stores consent level as 'all' or 'essential' in localStorage
 * - Accessible (keyboard navigation, ARIA labels, screen reader friendly)
 * - Mobile friendly bottom bar
 * - Components can check consent via useConsent() hook
 */
export function CookieConsent() {
  const { t } = useTranslation();
  const { hasConsented, setConsent } = useConsent();

  const handleAcceptAll = () => {
    setConsent('all');
  };

  const handleOnlyNecessary = () => {
    setConsent('essential');
  };

  if (hasConsented) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
    >
      <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          {/* Header and description */}
          <div className="text-center sm:text-left">
            <h2
              id="cookie-consent-title"
              className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-center sm:justify-start gap-2"
            >
              <span aria-hidden="true">🍪</span>
              {t('cookies.title', 'We use cookies to improve your experience')}
            </h2>
            <p
              id="cookie-consent-description"
              className="mt-2 text-sm text-gray-600 dark:text-gray-300"
            >
              {t('cookies.message', 'We use essential cookies for authentication, plus optional cookies for personalization, analytics, and relevant ads.')}
            </p>
          </div>

          {/* Buttons and privacy link */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href="https://www.digistratum.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ds-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ds-primary focus:ring-offset-2 rounded order-last sm:order-first"
            >
              {t('cookies.privacyPolicy', 'Learn more in our Privacy Policy')}
            </a>
            <div className="flex gap-3">
              <button
                onClick={handleOnlyNecessary}
                className="btn btn-secondary text-sm whitespace-nowrap"
                aria-label={t('cookies.onlyNecessaryAriaLabel', 'Accept only necessary cookies for authentication')}
              >
                {t('cookies.onlyNecessary', 'Only Necessary')}
              </button>
              <button
                onClick={handleAcceptAll}
                className="btn btn-primary text-sm whitespace-nowrap"
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
