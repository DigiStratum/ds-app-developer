import { useTranslation } from 'react-i18next';
import { useAuth } from '../../boilerplate/useAuth';
import { Layout } from '../Layout';

// Landing page - accessible without authentication
export function HomePage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, currentTenant } = useAuth();

  // Get current tenant info
  const currentTenantInfo = user?.tenants?.find(t => t.id === currentTenant);
  const isPersonalContext = !currentTenant || currentTenant === 'personal';

  return (
    <Layout>
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          DS App Developer
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Canonical baseline template for DigiStratum applications
        </p>

        {/* Authenticated user content */}
        {isAuthenticated && user ? (
          <div className="card max-w-2xl mx-auto">
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Welcome back{(user.display_name || user.name) ? `, ${user.display_name || user.name}` : ''}!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isPersonalContext ? (
                <>Viewing <span className="font-medium text-blue-600 dark:text-blue-400">Personal</span> account</>
              ) : currentTenantInfo ? (
                <>Viewing <span className="font-medium text-blue-600 dark:text-blue-400">{currentTenantInfo.name}</span> ({currentTenantInfo.role})</>
              ) : (
                <>Viewing <span className="font-medium text-blue-600 dark:text-blue-400">Personal</span> account</>
              )}
            </p>
            <div className="mt-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">Your authenticated app content here.</p>
            </div>
          </div>
        ) : (
          <div className="card max-w-md mx-auto">
            <p className="text-gray-700 dark:text-gray-300">
              {t('landing.cta', 'Get started with your DigiStratum account')}
            </p>
          </div>
        )}

        {/* Feature cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="card">
            <h3 className="font-semibold text-lg mb-2">Multi-Tenant</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Built-in tenant context switching</p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-lg mb-2">Internationalized</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">i18n support with language packs</p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-lg mb-2">Accessible</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">WCAG 2.1 AA compliant</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
