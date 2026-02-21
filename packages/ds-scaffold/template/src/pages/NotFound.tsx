import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';

/**
 * 404 Not Found Page
 */
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <Layout appName="{{APP_NAME}}">
      <div className="text-center py-20">
        <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('notFound.title', 'Page Not Found')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t('notFound.message', "The page you're looking for doesn't exist or has been moved.")}
        </p>
        <Link to="/" className="btn btn-primary">
          {t('notFound.backHome', 'Back to Home')}
        </Link>
      </div>
    </Layout>
  );
}
