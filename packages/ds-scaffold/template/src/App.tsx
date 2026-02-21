import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider, ErrorBoundary } from '@digistratum/ds-core';
import { GdprBanner } from '@digistratum/ds-ui';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { AboutPage } from './pages/About';
import { NotFoundPage } from './pages/NotFound';

/**
 * Protected route wrapper
 * Redirects unauthenticated users to home page
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ds-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Session loader - shows loading state while session initializes
 */
function SessionLoader({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ds-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * App routes configuration
 */
function AppRoutes() {
  const location = useLocation();
  
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <SessionLoader>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          
          {/* Protected routes - add your authenticated routes here */}
          {/* Example:
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout appName="{{APP_NAME}}">
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          */}
          
          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SessionLoader>
    </ErrorBoundary>
  );
}

/**
 * Main App component
 * 
 * Provides:
 * - ThemeProvider (light/dark mode from @ds/core)
 * - AuthProvider (SSO integration with DSAccount)
 * - GdprBanner (cookie consent from @ds/ui)
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
        <GdprBanner 
          privacyPolicyUrl="/privacy"
          position="bottom"
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
