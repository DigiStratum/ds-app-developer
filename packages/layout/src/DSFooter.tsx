import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DS_URLS } from '@digistratum/ds-core';
import type { FooterLink } from './types';
import { GdprBanner } from './GdprBanner';
import { CookiePreferencesModal } from './CookiePreferencesModal';

const DEFAULT_LINKS: FooterLink[] = [
  { label: 'Privacy', url: DS_URLS.PRIVACY, external: true },
  { label: 'Terms', url: DS_URLS.TERMS, external: true },
  { label: 'Support', url: DS_URLS.SUPPORT, external: true },
];

export interface DSFooterProps {
  appName: string;
  links?: FooterLink[];
  copyrightHolder?: string;
  showGdprBanner?: boolean;
  showDefaultLinks?: boolean;
  showCookieSettings?: boolean;
  className?: string;
}

/**
 * DSFooter - Standard DigiStratum footer component
 * 
 * Features:
 * - Copyright with current year
 * - Standard links (Privacy, Terms, Support)
 * - Custom additional links
 * - Cookie Settings link to manage preferences
 * - GDPR cookie consent banner (optional)
 */
export function DSFooter({
  appName,
  links = [],
  copyrightHolder = 'DigiStratum LLC',
  showGdprBanner = true,
  showDefaultLinks = true,
  showCookieSettings = true,
  className = '',
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

  return (
    <>
      {showGdprBanner && <GdprBanner />}
      <CookiePreferencesModal 
        isOpen={isPreferencesOpen} 
        onClose={handleClosePreferences} 
      />

      <div className={`bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              {t('footer.copyright', '© {{year}} {{holder}}. All rights reserved.', { year, holder: copyrightHolder })}
            </p>

            <nav className="flex flex-wrap justify-center sm:justify-end space-x-4 mt-2 sm:mt-0" aria-label={t('footer.navigation', 'Footer navigation')}>
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
      </div>
    </>
  );
}
