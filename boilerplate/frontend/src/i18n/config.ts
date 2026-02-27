import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          home: {
            title: 'Welcome to {{APP_NAME}}',
            login_prompt: 'Please log in to continue.',
          },
          auth: {
            login: 'Log In',
            logout: 'Log Out',
          },
        },
      },
    },
  });

export default i18n;
