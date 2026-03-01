/**
 * Remote Shell Loader Hook
 * 
 * Loads the DS App Shell from a CDN at runtime, enabling shell updates
 * without requiring app rebuilds. Falls back to local components in
 * development mode or when CDN is unavailable.
 * 
 * Part of App Shell Architecture (#911, #913, #914)
 * 
 * @see https://developer.digistratum.com/docs/app-shell
 */
import { useState, useEffect, lazy, ComponentType, ReactNode } from 'react';

// Shell component types
export interface ShellLayoutProps {
  children: ReactNode;
  appName?: string;
  appLogo?: string;
  currentAppId?: string;
  menuItems?: MenuItem[];
  showAppSwitcher?: boolean;
  showThemeToggle?: boolean;
  showUserMenu?: boolean;
  showGdprBanner?: boolean;
  [key: string]: unknown;
}

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  active?: boolean;
}

// Shell module interface - what the remote module exports
export interface ShellModule {
  DSAppShell: ComponentType<ShellLayoutProps>;
  DSHeader: ComponentType<Record<string, unknown>>;
  DSFooter: ComponentType<Record<string, unknown>>;
  Layout: ComponentType<ShellLayoutProps>;
  // Additional exports can be typed as needed
  [key: string]: unknown;
}

// Loading state for the shell
export type ShellLoadState = 'pending' | 'loaded' | 'error' | 'fallback';

export interface RemoteShellState {
  state: ShellLoadState;
  module: ShellModule | null;
  error: Error | null;
}

// Configuration for the shell loader
export interface ShellLoaderConfig {
  /** CDN URL for the shell module */
  cdnUrl?: string;
  /** Shell version to load (e.g., 'v1', 'v2', 'latest') */
  version?: string;
  /** Whether to use local fallback in development */
  useLocalInDev?: boolean;
  /** Custom fallback module */
  fallbackModule?: ShellModule | null;
  /** Timeout for loading in milliseconds */
  timeout?: number;
}

// Default CDN configuration
const DEFAULT_CDN_URL = 'https://cdn.digistratum.com/shell';
const DEFAULT_VERSION = 'v1';
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Hook to load the remote shell module
 * 
 * @example
 * ```tsx
 * const { state, module, error } = useRemoteShell();
 * 
 * if (state === 'pending') return <LoadingSpinner />;
 * if (state === 'error') return <FallbackShell />;
 * 
 * const { Layout } = module;
 * return <Layout>{children}</Layout>;
 * ```
 */
export function useRemoteShell(config: ShellLoaderConfig = {}): RemoteShellState {
  const {
    cdnUrl = import.meta.env.VITE_SHELL_CDN_URL || DEFAULT_CDN_URL,
    version = import.meta.env.VITE_SHELL_VERSION || DEFAULT_VERSION,
    useLocalInDev = true,
    fallbackModule = null,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const [state, setState] = useState<RemoteShellState>({
    state: 'pending',
    module: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function loadShell() {
      // In development mode with useLocalInDev, use local components
      if (useLocalInDev && import.meta.env.DEV) {
        try {
          // Dynamic import of local shell components
          const localModule = await import('../components/LocalShellAdapter');
          if (!cancelled) {
            setState({
              state: 'fallback',
              module: localModule.localShellModule,
              error: null,
            });
          }
          return;
        } catch (err) {
          console.warn('[Shell] Failed to load local shell, attempting CDN:', err);
        }
      }

      // Set timeout for CDN loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Shell loading timed out after ${timeout}ms`));
        }, timeout);
      });

      try {
        // Construct the shell URL
        const shellUrl = `${cdnUrl}/${version}/shell.js`;
        
        // Race between loading and timeout
        const shellModule = await Promise.race([
          import(/* @vite-ignore */ shellUrl),
          timeoutPromise,
        ]) as ShellModule;

        if (!cancelled) {
          clearTimeout(timeoutId);
          setState({
            state: 'loaded',
            module: shellModule,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          clearTimeout(timeoutId!);
          const error = err instanceof Error ? err : new Error(String(err));
          console.error('[Shell] Failed to load remote shell:', error);
          
          // Try fallback if provided
          if (fallbackModule) {
            setState({
              state: 'fallback',
              module: fallbackModule,
              error,
            });
          } else {
            // Try local components as last resort
            try {
              const localModule = await import('../components/LocalShellAdapter');
              setState({
                state: 'fallback',
                module: localModule.localShellModule,
                error,
              });
            } catch {
              setState({
                state: 'error',
                module: null,
                error,
              });
            }
          }
        }
      }
    }

    loadShell();

    return () => {
      cancelled = true;
      if (timeoutId!) clearTimeout(timeoutId);
    };
  }, [cdnUrl, version, useLocalInDev, fallbackModule, timeout]);

  return state;
}

/**
 * Create lazy-loaded shell components from the remote module
 * 
 * @example
 * ```tsx
 * const { Layout, Header, Footer } = createLazyShellComponents();
 * 
 * return (
 *   <Suspense fallback={<LoadingShell />}>
 *     <Layout>
 *       <Content />
 *     </Layout>
 *   </Suspense>
 * );
 * ```
 */
export function createLazyShellComponents(config: ShellLoaderConfig = {}) {
  const {
    cdnUrl = import.meta.env.VITE_SHELL_CDN_URL || DEFAULT_CDN_URL,
    version = import.meta.env.VITE_SHELL_VERSION || DEFAULT_VERSION,
  } = config;

  // In development, use local components
  if (import.meta.env.DEV) {
    return {
      Layout: lazy(() => import('../components/Layout').then(m => ({ default: m.Layout }))),
      Header: lazy(() => import('../components/DeveloperHeader').then(m => ({ default: m.DeveloperHeader }))),
      Footer: lazy(() => import('../components/DeveloperFooter').then(m => ({ default: m.DeveloperFooter }))),
    };
  }

  // In production, load from CDN
  const shellUrl = `${cdnUrl}/${version}/shell.js`;
  const shellModulePromise = import(/* @vite-ignore */ shellUrl);

  return {
    Layout: lazy(() => shellModulePromise.then(m => ({ 
      default: m.Layout || m.DSAppShell || m.default 
    }))),
    Header: lazy(() => shellModulePromise.then(m => ({ 
      default: m.DSHeader || m.Header || m.default?.DSHeader 
    }))),
    Footer: lazy(() => shellModulePromise.then(m => ({ 
      default: m.DSFooter || m.Footer || m.default?.DSFooter 
    }))),
  };
}

/**
 * Shell context for providing shell module to children
 */
import { createContext, useContext } from 'react';

export const ShellContext = createContext<RemoteShellState | null>(null);

export function useShellContext(): RemoteShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error('useShellContext must be used within ShellProvider');
  }
  return ctx;
}
