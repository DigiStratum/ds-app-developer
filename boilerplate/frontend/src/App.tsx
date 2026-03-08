import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider, ErrorBoundary } from '@digistratum/ds-core';

// Shell - wholesale replaceable
import { RemoteShellWrapper, ShellLayout } from './shell';

// Boilerplate - wholesale replaceable
import { AuthProvider, useAuth } from './boilerplate';

// App-specific - direct imports
import { HomePage } from './app/pages/Home';
import { DashboardPage } from './app/pages/Dashboard';

import { useTranslation } from 'react-i18next';

// Protected route wrapper
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
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('logged_out')) {
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
          <Route path="/" element={<HomePage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ShellLayout appName="{{APP_NAME}}">
                  <DashboardPage />
                </ShellLayout>
              </ProtectedRoute>
            }
          />
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
        <RemoteShellWrapper>
          <AppRoutes />
        </RemoteShellWrapper>
      </AuthProvider>
    </ThemeProvider>
  );
}
