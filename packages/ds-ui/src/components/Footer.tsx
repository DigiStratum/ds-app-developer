import { useTranslation } from 'react-i18next';
import type { FooterProps } from '../types';

const DEFAULT_LINKS = [
  { label: 'Privacy', href: 'https://digistratum.com/privacy' },
  { label: 'Terms', href: 'https://digistratum.com/terms' },
  { label: 'Support', href: 'https://digistratum.com/support' },
];

/**
 * Standard DigiStratum footer component
 * [FR-NAV-003]
 */
export function Footer({ 
  copyrightHolder = 'DigiStratum',
  links = DEFAULT_LINKS 
}: FooterProps) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <p>{t('footer.copyright', { year, holder: copyrightHolder, defaultValue: `© ${year} ${copyrightHolder}. All rights reserved.` })}</p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            {links.map((link, index) => (
              <a 
                key={index}
                href={link.href} 
                className="hover:text-gray-700 dark:hover:text-gray-200"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
