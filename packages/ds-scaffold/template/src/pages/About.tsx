import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';

/**
 * About Page
 * 
 * Static page with information about the app.
 */
export function AboutPage() {
  const { t } = useTranslation();

  return (
    <Layout appName="{{APP_NAME}}">
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          {t('about.title', 'About {{APP_NAME}}')}
        </h1>
        
        <div className="prose dark:prose-invert">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {{APP_NAME}} is a DigiStratum application built with modern web technologies.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
            {t('about.techStack', 'Technology Stack')}
          </h2>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
            <li>React 18 with TypeScript</li>
            <li>Vite for fast development and builds</li>
            <li>Tailwind CSS for styling</li>
            <li>@digistratum/ds-core for shared utilities</li>
            <li>@digistratum/ds-ui for UI components</li>
            <li>DSAccount for SSO authentication</li>
          </ul>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
            {t('about.features', 'Features')}
          </h2>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
            <li>Multi-tenant support with organization switching</li>
            <li>Light/dark theme with system preference detection</li>
            <li>GDPR-compliant cookie consent</li>
            <li>Internationalization (i18n) ready</li>
            <li>Responsive design</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
