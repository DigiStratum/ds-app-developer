import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';

/**
 * Home Page
 * 
 * Landing page accessible to all users.
 * Shows different content for guest vs authenticated users.
 */
export function HomePage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, currentTenant } = useAuth();

  // Get current tenant info
  const currentTenantInfo = user?.tenants?.find(t => t.id === currentTenant);
  const isPersonalContext = !currentTenant || currentTenant === 'personal';

  return (
    <Layout appName="{{APP_NAME}}">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {{APP_NAME}}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          {t('home.subtitle', 'A DigiStratum Application')}
        </p>

        {/* Authenticated user content */}
        {isAuthenticated && user ? (
          <div className="card max-w-2xl mx-auto">
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Welcome back{(user.display_name || user.name) ? `, ${user.display_name || user.name}` : ''}!
            </p>
            
            {/* Tenant context indicator */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isPersonalContext ? (
                <>Viewing <span className="font-medium text-blue-600 dark:text-blue-400">Personal</span> account</>
              ) : currentTenantInfo ? (
                <>Viewing <span className="font-medium text-blue-600 dark:text-blue-400">{currentTenantInfo.name}</span> organization</>
              ) : (
                <>Viewing <span className="font-medium text-blue-600 dark:text-blue-400">Personal</span> account</>
              )}
            </p>
            
            {/* TODO: Add your authenticated user content here */}
            <div className="mt-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
              <p className="font-mono text-sm mb-2">{'<!-- Your authenticated content here -->'}</p>
              <p className="text-sm">Dashboard widgets, recent activity, quick actions, etc.</p>
            </div>
          </div>
        ) : (
          /* Guest user content */
          <div className="card max-w-md mx-auto">
            <p className="text-gray-700 dark:text-gray-300">
              {t('home.cta', 'Get started with your DigiStratum account')}
            </p>
          </div>
        )}

        {/* Feature cards - visible to all users */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="card">
            <h3 className="font-semibold text-lg mb-2">Feature One</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Describe your first feature here
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-lg mb-2">Feature Two</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Describe your second feature here
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-lg mb-2">Feature Three</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Describe your third feature here
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
