import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { Layout, ErrorBoundaryWithKey } from './components';
import { HomePage } from './pages/Home';
import { DashboardPage } from './pages/Dashboard';
import { useTranslation } from 'react-i18next';

// Protected route wrapper [FR-AUTH-002]
// Only used for routes that require authentication (not the landing page)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ds-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center card max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('auth.loginRequired', 'Login Required')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('auth.unauthorized', 'Please sign in to access this page.')}
          </p>
          <button onClick={() => login()} className="btn btn-primary">
            {t('auth.signIn', 'Sign In')}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Loading spinner for initial session load
function SessionLoader({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ds-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  
  return (
    <ErrorBoundaryWithKey resetKey={location.pathname}>
      <SessionLoader>
        <Routes>
          {/* Public routes - accessible with guest session */}
          <Route path="/" element={<HomePage />} />
          
          {/* Protected routes - require authentication */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout appName="DS App Skeleton">
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </SessionLoader>
    </ErrorBoundaryWithKey>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
