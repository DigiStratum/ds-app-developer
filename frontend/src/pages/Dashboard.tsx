import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const { user, currentTenant } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">User Info</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="font-medium">{user?.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="font-medium">{user?.email}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Tenant Context</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-gray-500">Current Context</dt>
              <dd className="font-medium">
                {currentTenant || 'Personal (No Organization)'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Available Tenants</dt>
              <dd className="font-medium">
                {user?.tenants.length ? user.tenants.join(', ') : 'None'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-8 card">
        <h2 className="text-lg font-semibold mb-4">Your App Content Here</h2>
        <p className="text-gray-600 dark:text-gray-400">
          This is where you build your application-specific features.
          The boilerplate provides the foundation: auth, theming, i18n, and tenant context.
        </p>
      </div>
    </div>
  );
}
