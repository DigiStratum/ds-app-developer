/**
 * Remote Shell Loader Hook
 * 
 * Loads the DS App Shell from a CDN at runtime via script tag injection.
 * The shell is IIFE format and assigns to window.DSLayout.
 * Falls back to local components in development mode or when CDN is unavailable.
 * 
 * Part of App Shell Architecture (#911, #913, #914)
 */
import { useState, useEffect, ComponentType, ReactNode, createContext, useContext } from 'react';

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
  cdnUrl?: string;
  version?: string;
  useLocalInDev?: boolean;
  fallbackModule?: ShellModule | null;
  timeout?: number;
}

// Default CDN configuration
const DEFAULT_CDN_URL = 'https://apps.digistratum.com/shell';
const DEFAULT_VERSION = 'v1';
const DEFAULT_TIMEOUT = 10000;

// Declare DSLayout on window
declare global {
  interface Window {
    DSLayout?: ShellModule;
  }
}

/**
 * Load shell via script tag injection (IIFE format)
 */
async function loadShellViaScript(url: string, timeout: number): Promise<ShellModule> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Shell loading timed out after ${timeout}ms`));
    }, timeout);

    // Check if already loaded
    if (window.DSLayout) {
      clearTimeout(timeoutId);
      resolve(window.DSLayout);
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    
    script.onload = () => {
      clearTimeout(timeoutId);
      const module = window.DSLayout;
      if (module) {
        console.log('[Shell] Remote shell loaded successfully');
        resolve(module);
      } else {
        reject(new Error('Shell loaded but DSLayout not found on window'));
      }
    };
    
    script.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load shell script: ${url}`));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Hook to load the remote shell module
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

    async function loadShell() {
      // In development, try local components first
      if (useLocalInDev && import.meta.env.DEV) {
        try {
          const localModule = await import('./LocalShellAdapter');
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

      try {
        const shellUrl = `${cdnUrl}/${version}/shell.js`;
        console.log('[Shell] Loading from:', shellUrl);
        
        const shellModule = await loadShellViaScript(shellUrl, timeout);

        if (!cancelled) {
          setState({
            state: 'loaded',
            module: shellModule,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
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
              const localModule = await import('./LocalShellAdapter');
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
    };
  }, [cdnUrl, version, useLocalInDev, fallbackModule, timeout]);

  return state;
}

/**
 * Create a lazy-loaded component from the shell
 */
export function createShellComponent<T extends keyof ShellModule>(
  componentName: T,
  config?: ShellLoaderConfig
): ComponentType<ShellModule[T] extends ComponentType<infer P> ? P : never> {
  // This is a simplified version - the actual implementation would use React.lazy
  // with a custom loader that waits for the shell to load
  return (() => null) as unknown as ComponentType<any>;
}

// Re-export types for consumers
export type { ShellLoaderConfig as RemoteShellConfig };

// ============================================================================
// Context for sharing shell state across components
// ============================================================================


export const ShellContext = createContext<RemoteShellState | null>(null);

export function useShellContext(): RemoteShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error('useShellContext must be used within ShellProvider');
  }
  return ctx;
}

/**
 * Create lazy-loaded shell components
 */
export function createLazyShellComponents(_config: ShellLoaderConfig = {}) {
  // Placeholder - actual implementation would create lazy components
  return {
    Layout: null as unknown as ComponentType<ShellLayoutProps>,
    Header: null as unknown as ComponentType<Record<string, unknown>>,
    Footer: null as unknown as ComponentType<Record<string, unknown>>,
  };
}
