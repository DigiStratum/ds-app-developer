import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

/**
 * 404 Not Found Page
 * 
 * Shown when users navigate to a non-existent route.
 * Requirements: NFR-UX (user experience)
 */
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <Layout appName="DS Developer">
      <div className="text-center py-16">
        <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('errors.notFound', 'Page Not Found')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          {t('errors.notFoundDesc', "The page you're looking for doesn't exist or has been moved.")}
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
        >
          {t('common.goHome', 'Go to Home')}
        </Link>
      </div>
    </Layout>
  );
}
