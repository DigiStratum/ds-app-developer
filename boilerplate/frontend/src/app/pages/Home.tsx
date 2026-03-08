import { useTranslation } from 'react-i18next';
import { useAuth } from '../../boilerplate/useAuth';
import { ShellLayout } from '../../shell';
import config from '../config';

export function HomePage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, currentTenant } = useAuth();

  const currentTenantInfo = user?.tenants?.find(t => t.id === currentTenant);
  const isPersonalContext = !currentTenant || currentTenant === 'personal';

  return (
    <ShellLayout appName={config.name}>
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {config.name}
        </h1>

        {isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t('home.welcome', { name: user?.name || user?.email })}
            </p>
            {!isPersonalContext && currentTenantInfo && (
              <p className="text-gray-500">
                {t('home.tenant_context', { tenant: currentTenantInfo.name })}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t('home.guest_welcome')}
            </p>
            <p className="text-gray-500">
              {t('home.sign_in_prompt')}
            </p>
          </div>
        )}
      </div>
    </ShellLayout>
  );
}

export default HomePage;
