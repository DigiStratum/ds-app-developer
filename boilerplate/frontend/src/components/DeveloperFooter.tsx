import { useTranslation } from 'react-i18next';
import { useConsent } from '@digistratum/ds-core';

/**
 * Link configuration for footer navigation
 */
export interface FooterLink {
  label: string;
  url: string;
}

/**
 * Props for the standardized DeveloperFooter component
 * 
 * @example
 * // Minimal usage (all defaults)
 * <DeveloperFooter appName="My App" />
 * 
 * @example
 * // Full customization
 * <DeveloperFooter
 *   appName="DSKanban"
 *   showGdprBanner={true}
 *   showCopyright={true}
 *   showDefaultLinks={true}
 *   extraLinks={[
 *     { label: 'API Docs', url: '/docs' },
 *     { label: 'Status', url: 'https://status.digistratum.com' }
 *   ]}
 * />
 */
export interface DeveloperFooterProps {
  /** Display name for the app (used in copyright) */
  appName: string;
  /** Show GDPR consent banner if user hasn't consented (default: true) */
  showGdprBanner?: boolean;
  /** Show copyright line with current year (default: true) */
  showCopyright?: boolean;
  /** Show standard DS links (Privacy, Terms, Support) (default: true) */
  showDefaultLinks?: boolean;
  /** Additional links to show in footer */
  extraLinks?: FooterLink[];
  /** Additional class names for the footer element */
  className?: string;
}

/**
 * GDPR cookie consent banner component
 * 
 * Features:
 * - Shows only if user hasn't made a choice
 * - Two options: Accept All (analytics, ads) or Only Necessary (essential cookies)
 * - Persists choice in localStorage
 * - Accessible (keyboard nav, ARIA labels)
 */
function GdprBanner() {
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
                onClick={() => setConsent('essential')}
                className="btn btn-secondary text-sm whitespace-nowrap"
                aria-label={t('cookies.onlyNecessaryAriaLabel', 'Accept only necessary cookies for authentication')}
              >
                {t('cookies.onlyNecessary', 'Only Necessary')}
              </button>
              <button
                onClick={() => setConsent('all')}
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

/**
 * Standardized footer component for DigiStratum apps
 * 
 * Features:
 * - GDPR consent banner (with localStorage persistence) [FR-GDPR-001]
 * - Copyright with current year
 * - Standard links (Privacy Policy, Terms, Support)
 * - Custom extra links support
 * - Mobile-responsive layout
 * 
 * All features are toggleable via props for maximum flexibility.
 */
export function DeveloperFooter({
  appName,
  showGdprBanner = true,
  showCopyright = true,
  showDefaultLinks = true,
  extraLinks = [],
  className = '',
}: DeveloperFooterProps) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  // Standard DS links
  const defaultLinks: FooterLink[] = [
    { label: t('footer.privacy', 'Privacy'), url: 'https://www.digistratum.com/privacy' },
    { label: t('footer.terms', 'Terms'), url: 'https://www.digistratum.com/terms' },
    { label: t('footer.support', 'Support'), url: 'https://www.digistratum.com/support' },
  ];

  // Combine default and extra links
  const allLinks = [
    ...(showDefaultLinks ? defaultLinks : []),
    ...extraLinks,
  ];

  return (
    <>
      {/* GDPR Banner - shows above footer when needed */}
      {showGdprBanner && <GdprBanner />}

      {/* Footer */}
      <footer 
        className={`bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${className}`}
        style={{ borderRadius: 'var(--ds-container-radius) var(--ds-container-radius) 0 0' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            {/* Copyright */}
            {showCopyright && (
              <p>
                {t('footer.copyright', '© {{year}} {{appName}}. All rights reserved.', { year, appName })}
              </p>
            )}

            {/* Links */}
            {allLinks.length > 0 && (
              <nav className="flex flex-wrap justify-center sm:justify-end space-x-4 mt-2 sm:mt-0" aria-label={t('footer.navigation', 'Footer navigation')}>
                {allLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    {...(link.url.startsWith('http') && !link.url.includes('digistratum.com') 
                      ? { target: '_blank', rel: 'noopener noreferrer' } 
                      : {}
                    )}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}

/**
 * Re-export the GdprBanner for apps that want to use it separately
 */
export { GdprBanner };
