import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider, ErrorBoundary } from '@digistratum/ds-core';
import { CookieConsent, Layout } from './components';
import { HomePage } from './pages/Home';
import { DashboardPage } from './pages/Dashboard';
import { SettingsPage } from './pages/Settings';
import { useTranslation } from 'react-i18next';

// Protected route wrapper [FR-AUTH-002]
// Only used for routes that require authentication (not the landing page)
// Auth controls are ONLY in the nav bar - unauthenticated users redirect to home
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
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

  // Redirect to home page - auth controls are only in the nav bar
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
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
    <ErrorBoundary resetKey={location.pathname}>
      <SessionLoader>
        <Routes>
          {/* Public routes - accessible with guest session */}
          <Route path="/" element={<HomePage />} />
          
          {/* Protected routes - require authentication */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout appName="DS App Developer">
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout appName="DS App Developer">
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </SessionLoader>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
        <CookieConsent />
      </AuthProvider>
    </ThemeProvider>
  );
}
