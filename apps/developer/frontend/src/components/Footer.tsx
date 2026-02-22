import { useTranslation } from 'react-i18next';

// Standard footer component [FR-NAV-003]
export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700" style={{ borderRadius: 'var(--ds-container-radius) var(--ds-container-radius) 0 0' }}>
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <p>{t('footer.copyright', { year })}</p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <a href="https://www.digistratum.com/privacy" className="hover:text-gray-700 dark:hover:text-gray-200">
              Privacy
            </a>
            <a href="https://www.digistratum.com/terms" className="hover:text-gray-700 dark:hover:text-gray-200">
              Terms
            </a>
            <a href="https://www.digistratum.com/support" className="hover:text-gray-700 dark:hover:text-gray-200">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
