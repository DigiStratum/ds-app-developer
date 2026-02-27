import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function Dashboard() {
  const { isAuthenticated, isLoading, user, tenantId, logout } = useAuth();

  if (isLoading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">User Info</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="font-medium">Name:</dt>
          <dd>{user?.name}</dd>
          <dt className="font-medium">Email:</dt>
          <dd>{user?.email}</dd>
          <dt className="font-medium">Current Tenant:</dt>
          <dd>{tenantId || 'None'}</dd>
        </dl>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Content</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add your dashboard content here.
        </p>
      </div>

      <button
        onClick={logout}
        className="mt-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
      >
        Log Out
      </button>
    </div>
  );
}
