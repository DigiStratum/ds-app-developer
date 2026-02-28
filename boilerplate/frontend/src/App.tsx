import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { MyAppShell } from './components/MyAppShell';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';

/**
 * Protected route wrapper
 * Only used for routes that require authentication.
 * Unauthenticated users are redirected to home page.
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
 * AppRoutes - Define your app's route structure
 * 
 * Public routes: Accessible by all users (wrapped in MyAppShell if layout needed)
 * Protected routes: Require authentication (wrapped in ProtectedRoute + MyAppShell)
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={
        <MyAppShell>
          <Home />
        </MyAppShell>
      } />
      
      {/* Protected routes - require authentication */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MyAppShell>
              <Dashboard />
            </MyAppShell>
          </ProtectedRoute>
        }
      />
      
      {/* TODO: Add more routes as needed */}
      {/* <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <MyAppShell>
              <SettingsPage />
            </MyAppShell>
          </ProtectedRoute>
        }
      /> */}
      
      {/* Catch-all - redirect unknown paths to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * App Root Component
 * 
 * Provider hierarchy:
 * 1. ThemeProvider - Theme state (light/dark/system)
 * 2. AuthProvider - Authentication state (user, tenant, session)
 * 
 * Note: If using react-i18next, add I18nextProvider here
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
