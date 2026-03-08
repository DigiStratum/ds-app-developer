/**
 * Remote Shell Wrapper
 * 
 * Provides the app shell loaded from CDN (or local fallback) to the application.
 * Handles loading states and error boundaries for the shell loading process.
 * 
 * Part of App Shell Architecture (#911, #913, #914)
 * 
 * @example
 * ```tsx
 * // In App.tsx
 * <RemoteShellWrapper>
 *   <AppRoutes />
 * </RemoteShellWrapper>
 * 
 * // In pages/Dashboard.tsx
 * import { useShellLayout } from '../components/RemoteShellWrapper';
 * 
 * function DashboardPage() {
 *   const { Layout } = useShellLayout();
 *   return (
 *     <Layout appName="MyApp">
 *       <DashboardContent />
 *     </Layout>
 *   );
 * }
 * ```
 */
import { ReactNode, Suspense, useContext, createContext, useMemo, ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  useRemoteShell, 
  ShellContext, 
  type ShellLayoutProps,
  type ShellLoaderConfig,
} from './useRemoteShell';

// ============================================================================
// Types
// ============================================================================

export interface RemoteShellWrapperProps {
  children: ReactNode;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Custom error component */
  errorComponent?: ReactNode;
  /** Shell loader configuration */
  config?: ShellLoaderConfig;
}

export interface ShellLayoutContext {
  Layout: ComponentType<ShellLayoutProps>;
  Header: ComponentType<Record<string, unknown>>;
  Footer: ComponentType<Record<string, unknown>>;
  isRemote: boolean;
  loadState: 'pending' | 'loaded' | 'error' | 'fallback';
}

// ============================================================================
// Context
// ============================================================================

const ShellLayoutContext = createContext<ShellLayoutContext | null>(null);

/**
 * Hook to access shell layout components
 * 
 * @returns Shell layout components (Layout, Header, Footer) and load state
 * @throws Error if used outside RemoteShellWrapper
 */
export function useShellLayout(): ShellLayoutContext {
  const ctx = useContext(ShellLayoutContext);
  if (!ctx) {
    throw new Error(
      'useShellLayout must be used within RemoteShellWrapper. ' +
      'Wrap your app with <RemoteShellWrapper> in App.tsx.'
    );
  }
  return ctx;
}

// ============================================================================
// Loading Component
// ============================================================================

function DefaultLoadingShell() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--ds-bg-margin, #f3f4f6)' }}>
      {/* Skeleton header */}
      <header className="ds-container-margins bg-white dark:bg-gray-800 h-16 animate-pulse" />
      
      {/* Skeleton content */}
      <main className="ds-container-margins flex-1 bg-white dark:bg-gray-800 my-2">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ds-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">{t('shell.loading', 'Loading...')}</p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Skeleton footer */}
      <footer className="ds-container-margins bg-white dark:bg-gray-800 h-24 animate-pulse" />
    </div>
  );
}

// ============================================================================
// Error Component
// ============================================================================

interface ErrorShellProps {
  error: Error | null;
  onRetry?: () => void;
}

function DefaultErrorShell({ error, onRetry }: ErrorShellProps) {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center p-8 max-w-md">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('shell.error.title', 'Failed to load application shell')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('shell.error.message', 'We encountered an error loading the application. Please try again.')}
        </p>
        {error && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4 font-mono bg-gray-200 dark:bg-gray-800 p-2 rounded">
            {error.message}
          </p>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-ds-primary text-white rounded hover:bg-ds-primary-dark transition-colors"
          >
            {t('shell.error.retry', 'Try Again')}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Fallback Layout (Minimal)
// ============================================================================

/**
 * Minimal fallback layout used when shell completely fails to load
 * and no local fallback is available.
 */
function FallbackLayout({ children, appName = 'DS App' }: ShellLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {appName}
          </h1>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <footer className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} DigiStratum LLC
        </div>
      </footer>
    </div>
  );
}

function FallbackHeader() {
  return <div className="h-16 bg-gray-200 animate-pulse" />;
}

function FallbackFooter() {
  return <div className="h-16 bg-gray-200 animate-pulse" />;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * RemoteShellWrapper - Provides the app shell from CDN to the application
 * 
 * Wraps the application with the shell context and handles:
 * - Loading the shell from CDN
 * - Falling back to local components in development
 * - Error handling and retry logic
 * 
 * @example
 * ```tsx
 * // In App.tsx
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <AuthProvider>
 *         <RemoteShellWrapper>
 *           <AppRoutes />
 *         </RemoteShellWrapper>
 *       </AuthProvider>
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export function RemoteShellWrapper({
  children,
  loadingComponent,
  errorComponent,
  config,
}: RemoteShellWrapperProps) {
  const shellState = useRemoteShell(config);
  
  // Build the layout context from loaded module
  const layoutContext = useMemo<ShellLayoutContext | null>(() => {
    const { module, state } = shellState;
    
    if (!module && state !== 'error') {
      return null;
    }
    
    if (state === 'error' || !module) {
      // Provide minimal fallbacks for error state
      return {
        Layout: FallbackLayout,
        Header: FallbackHeader,
        Footer: FallbackFooter,
        isRemote: false,
        loadState: 'error',
      };
    }
    
    return {
      Layout: module.Layout || module.DSAppShell,
      Header: module.DSHeader || module.DeveloperHeader,
      Footer: module.DSFooter || module.DeveloperFooter,
      isRemote: state === 'loaded',
      loadState: state,
    };
  }, [shellState]);

  // Show loading state
  if (shellState.state === 'pending' || !layoutContext) {
    return <>{loadingComponent || <DefaultLoadingShell />}</>;
  }

  // Show error state (only if we truly have no module)
  if (shellState.state === 'error' && !shellState.module) {
    return (
      <>
        {errorComponent || (
          <DefaultErrorShell 
            error={shellState.error}
            onRetry={() => window.location.reload()}
          />
        )}
      </>
    );
  }

  return (
    <ShellContext.Provider value={shellState}>
      <ShellLayoutContext.Provider value={layoutContext}>
        <Suspense fallback={loadingComponent || <DefaultLoadingShell />}>
          {children}
        </Suspense>
      </ShellLayoutContext.Provider>
    </ShellContext.Provider>
  );
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * ShellLayout - Uses the loaded shell's Layout component
 * 
 * Convenience wrapper that automatically uses the Layout from the shell context.
 * Use this instead of importing Layout directly.
 * 
 * @example
 * ```tsx
 * import { ShellLayout } from '../components/RemoteShellWrapper';
 * 
 * function MyPage() {
 *   return (
 *     <ShellLayout appName="MyApp">
 *       <PageContent />
 *     </ShellLayout>
 *   );
 * }
 * ```
 */
export function ShellLayout(props: ShellLayoutProps) {
  const { Layout } = useShellLayout();
  return <Layout {...props} />;
}

export default RemoteShellWrapper;
