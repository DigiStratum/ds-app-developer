/**
 * Remote Shell Wrapper
 * 
 * Provides the app shell loaded from CDN (or local fallback) to the application.
 */
import { ReactNode, Suspense, useContext, createContext, useMemo, ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  useRemoteShell, 
  ShellContext, 
  type ShellLayoutProps,
  type ShellLoaderConfig,
} from './useRemoteShell';

export interface RemoteShellWrapperProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  config?: ShellLoaderConfig;
}

export interface ShellLayoutContext {
  Layout: ComponentType<ShellLayoutProps>;
  Header: ComponentType<Record<string, unknown>>;
  Footer: ComponentType<Record<string, unknown>>;
  isRemote: boolean;
  loadState: 'pending' | 'loaded' | 'error' | 'fallback';
}

const ShellLayoutContext = createContext<ShellLayoutContext | null>(null);

export function useShellLayout(): ShellLayoutContext {
  const ctx = useContext(ShellLayoutContext);
  if (!ctx) {
    throw new Error('useShellLayout must be used within RemoteShellWrapper.');
  }
  return ctx;
}

function DefaultLoadingShell() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--ds-bg-margin, #f3f4f6)' }}>
      <header className="ds-container-margins bg-white dark:bg-gray-800 h-16 animate-pulse" />
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
      <footer className="ds-container-margins bg-white dark:bg-gray-800 h-24 animate-pulse" />
    </div>
  );
}

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
        {error && (
          <p className="text-sm text-gray-500 mb-4 font-mono bg-gray-200 dark:bg-gray-800 p-2 rounded">
            {error.message}
          </p>
        )}
        {onRetry && (
          <button onClick={onRetry} className="px-4 py-2 bg-ds-primary text-white rounded">
            {t('shell.error.retry', 'Try Again')}
          </button>
        )}
      </div>
    </div>
  );
}

function FallbackLayout({ children, appName = 'DS App' }: ShellLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">{appName}</h1>
        </div>
      </header>
      <main className="flex-1"><div className="max-w-7xl mx-auto px-4 py-6">{children}</div></main>
      <footer className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} DigiStratum LLC
        </div>
      </footer>
    </div>
  );
}

function FallbackHeader() { return <div className="h-16 bg-gray-200 animate-pulse" />; }
function FallbackFooter() { return <div className="h-16 bg-gray-200 animate-pulse" />; }

export function RemoteShellWrapper({ children, loadingComponent, errorComponent, config }: RemoteShellWrapperProps) {
  const shellState = useRemoteShell(config);
  
  const layoutContext = useMemo<ShellLayoutContext | null>(() => {
    const { module, state } = shellState;
    
    if (!module && state !== 'error') return null;
    
    if (state === 'error' || !module) {
      return { Layout: FallbackLayout, Header: FallbackHeader, Footer: FallbackFooter, isRemote: false, loadState: 'error' };
    }
    
    return {
      Layout: module.Layout || module.DSAppShell,
      Header: module.DSHeader || module.DeveloperHeader,
      Footer: module.DSFooter || module.DeveloperFooter,
      isRemote: state === 'loaded',
      loadState: state,
    };
  }, [shellState]);

  if (shellState.state === 'pending' || !layoutContext) {
    return <>{loadingComponent || <DefaultLoadingShell />}</>;
  }

  if (shellState.state === 'error' && !shellState.module) {
    return <>{errorComponent || <DefaultErrorShell error={shellState.error} onRetry={() => window.location.reload()} />}</>;
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

/**
 * ShellLayout - Simple passthrough to loaded shell's Layout component
 * Caller must provide all required props (auth, theme, etc)
 */
export function ShellLayout(props: ShellLayoutProps & { children: ReactNode }) {
  const { Layout } = useShellLayout();
  return <Layout {...props} />;
}

export default RemoteShellWrapper;
