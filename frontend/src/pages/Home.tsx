import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';

export function HomePage() {
  const { t } = useTranslation();
  const { user, login } = useAuth();

  return (
    <Layout appName="DS App Skeleton">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          DS App Skeleton
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Canonical baseline template for DigiStratum applications
        </p>

        {user ? (
          <div className="card max-w-md mx-auto">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Welcome back, <span className="font-semibold">{user.name}</span>!
            </p>
            <a href="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </a>
          </div>
        ) : (
          <button onClick={login} className="btn btn-primary">
            {t('auth.loginWith')}
          </button>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="card">
            <h3 className="font-semibold text-lg mb-2">Multi-Tenant</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Built-in tenant context switching and data isolation
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-lg mb-2">Internationalized</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              i18n support with language packs and dynamic translation
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-lg mb-2">Accessible</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              WCAG 2.1 AA compliant with keyboard navigation
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
