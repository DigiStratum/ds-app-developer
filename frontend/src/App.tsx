import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AdDemoProvider } from './hooks/useAdDemo';
import { ThemeProvider, ErrorBoundary } from '@digistratum/ds-core';
import { CookieConsent } from './components';
import { RemoteShellWrapper, ShellLayout } from './components/RemoteShellWrapper';
import { HomePage } from './pages/Home';
import { DashboardPage } from './pages/Dashboard';
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
  
  // Clean up logout query param after redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('logged_out')) {
      // Remove the param and replace history
      params.delete('logged_out');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);
  
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <SessionLoader>
        <Routes>
          {/* Public routes - accessible with guest session */}
          <Route path="/" element={<HomePage />} />
          
          {/* Protected routes - require authentication */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ShellLayout appName="DS App Developer">
                  <DashboardPage />
                </ShellLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Catch-all route - redirect unknown paths to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionLoader>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdDemoProvider>
          <RemoteShellWrapper>
            <AppRoutes />
          </RemoteShellWrapper>
          <CookieConsent />
        </AdDemoProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
