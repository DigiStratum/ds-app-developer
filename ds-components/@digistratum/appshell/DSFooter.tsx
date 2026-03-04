import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DS_URLS } from '@digistratum/ds-core';
import type { DSFooterProps, FooterLink } from './types';
import { GdprBanner } from './GdprBanner';
import { CookiePreferencesModal } from './CookiePreferencesModal';

const DEFAULT_LINKS: FooterLink[] = [
  { label: 'Privacy', url: DS_URLS.PRIVACY, external: true },
  { label: 'Terms', url: DS_URLS.TERMS, external: true },
  { label: 'Support', url: DS_URLS.SUPPORT, external: true },
];

/**
 * DSFooter - Standard DigiStratum footer component
 * 
 * Features:
 * - Dynamic copyright with current year
 * - Standard links (Privacy, Terms, Support)
 * - Custom additional links
 * - Cookie Settings link to manage preferences
 * - GDPR cookie consent banner (optional)
 * - Optional app version display
 * - Sticky bottom option when content is short
 */
export function DSFooter({
  appName,
  links = [],
  copyrightHolder = 'DigiStratum LLC',
  showGdprBanner = true,
  showDefaultLinks = true,
  showCookieSettings = true,
  className = '',
  appVersion,
  sticky = false,
}: DSFooterProps) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  const handleOpenPreferences = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsPreferencesOpen(true);
  }, []);

  const handleClosePreferences = useCallback(() => {
    setIsPreferencesOpen(false);
  }, []);

  const allLinks = [
    ...(showDefaultLinks ? DEFAULT_LINKS : []),
    ...links,
  ];

  const stickyClasses = sticky ? 'mt-auto' : '';

  return (
    <>
      {showGdprBanner && <GdprBanner />}
      <CookiePreferencesModal 
        isOpen={isPreferencesOpen} 
        onClose={handleClosePreferences} 
      />

      <footer 
        className={`bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${stickyClasses} ${className}`}
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto px-4 py-[10px] sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400 gap-2">
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
              <p>
                {t('footer.copyright', '© {{year}} {{holder}}. All rights reserved.', { year, holder: copyrightHolder })}
              </p>
              {appVersion && (
                <span 
                  className="text-xs text-gray-400 dark:text-gray-500"
                  aria-label={t('footer.version', 'Version {{version}}', { version: appVersion })}
                >
                  v{appVersion}
                </span>
              )}
            </div>

            <nav 
              className="flex flex-wrap justify-center sm:justify-end gap-x-4 gap-y-1" 
              aria-label={t('footer.navigation', 'Footer navigation')}
            >
              {allLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {link.label}
                </a>
              ))}
              {showCookieSettings && (
                <button
                  onClick={handleOpenPreferences}
                  className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  aria-label={t('cookies.settingsAriaLabel', 'Open cookie preferences')}
                >
                  {t('cookies.settings', 'Cookie Settings')}
                </button>
              )}
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
