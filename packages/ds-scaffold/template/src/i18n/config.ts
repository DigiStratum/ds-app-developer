import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * i18n Configuration
 * 
 * Sets up internationalization with:
 * - Browser language detection
 * - Fallback to English
 * - Inline translations (add more as needed)
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    resources: {
      en: {
        translation: {
          common: {
            loading: 'Loading...',
            error: 'An error occurred',
            retry: 'Retry',
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            edit: 'Edit',
            create: 'Create',
          },
          home: {
            subtitle: 'A DigiStratum Application',
            cta: 'Get started with your DigiStratum account',
          },
          about: {
            title: 'About {{APP_NAME}}',
            techStack: 'Technology Stack',
            features: 'Features',
          },
          notFound: {
            title: 'Page Not Found',
            message: "The page you're looking for doesn't exist or has been moved.",
            backHome: 'Back to Home',
          },
        },
      },
      // Add more languages here:
      // de: { translation: { ... } },
      // es: { translation: { ... } },
    },
  });

export default i18n;
