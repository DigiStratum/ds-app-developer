import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';

// Landing page - accessible without authentication (guest session pattern)
// Shows different content for guest vs authenticated users
// Note: Auth controls are ONLY in the nav bar (DSNav component)
export function HomePage() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  return (
    <Layout appName="DS App Skeleton">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          DS App Skeleton
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Canonical baseline template for DigiStratum applications
        </p>

        {/* Authenticated user - show personalized welcome */}
        {isAuthenticated && user ? (
          <div className="card max-w-md mx-auto">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Welcome back, <span className="font-semibold">{user.name}</span>!
            </p>
            <a href="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </a>
          </div>
        ) : (
          /* Guest user - show info about the app (auth controls in nav bar) */
          <div className="card max-w-md mx-auto">
            <p className="text-gray-700 dark:text-gray-300">
              {t('landing.cta', 'Get started with your DigiStratum account')}
            </p>
          </div>
        )}

        {/* Feature cards - visible to all users */}
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

        {/* Additional sections for landing page */}
        <div className="mt-16 max-w-4xl mx-auto text-left">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            {t('landing.whyTitle', 'Why DS App Skeleton?')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                {t('landing.feature1Title', 'Production Ready')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('landing.feature1Desc', 'Built with best practices for security, performance, and scalability. Deploy with confidence.')}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                {t('landing.feature2Title', 'Developer Experience')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('landing.feature2Desc', 'Clear patterns, comprehensive documentation, and a consistent structure across all DS apps.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
