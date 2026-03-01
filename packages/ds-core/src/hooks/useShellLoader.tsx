/**
 * @digistratum/ds-core - useShellLoader Hook
 * 
 * React hook for loading the App Shell from CDN at runtime.
 * Uses dynamic import() with React.lazy for code-splitting.
 * 
 * Implements FR-SHELL-001: Load shell from CDN at runtime.
 * 
 * @see ~/.openclaw/workspace/spikes/912-app-shell-evaluation.md
 * 
 * @example
 * ```tsx
 * import { useShellLoader, ShellErrorBoundary } from '@digistratum/ds-core';
 * import { Suspense } from 'react';
 * 
 * function App() {
 *   const { DSAppShell, isLoading, error, retry } = useShellLoader();
 * 
 *   if (error) {
 *     return <button onClick={retry}>Retry loading shell</button>;
 *   }
 * 
 *   return (
 *     <Suspense fallback={<ShellSkeleton />}>
 *       <DSAppShell appName="MyApp" auth={authContext}>
 *         <MyContent />
 *       </DSAppShell>
 *     </Suspense>
 *   );
 * }
 * ```
 */

import { 
  lazy, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  type LazyExoticComponent,
  type ComponentType,
} from 'react';

import type { 
  UseShellLoaderState, 
  UseShellLoaderOptions,
  ShellLoadStatus,
  DSAppShellProps,
  DSHeaderProps,
  DSFooterProps,
  ShellModuleExports,
} from '../types/shell-loader';

import { 
  loadShellModule, 
  resetShellLoader, 
  isShellLoaded,
  getShellLoadError,
  addPreloadHint,
} from '../utils/shell-loader';

// =============================================================================
// Lazy Component Factories
// =============================================================================

/**
 * Create a lazy component that loads from the shell module promise.
 * Uses React.lazy pattern from spike recommendation.
 */
function createLazyComponent<T>(
  modulePromise: () => Promise<ShellModuleExports>,
  componentName: keyof ShellModuleExports
): LazyExoticComponent<ComponentType<T>> {
  return lazy(() => 
    modulePromise().then(module => ({
      default: module[componentName] as ComponentType<T>,
    }))
  );
}

// =============================================================================
// Singleton lazy components (created once, reused)
// =============================================================================

let cachedComponents: {
  DSAppShell: LazyExoticComponent<ComponentType<DSAppShellProps>>;
  DSHeader: LazyExoticComponent<ComponentType<DSHeaderProps>>;
  DSFooter: LazyExoticComponent<ComponentType<DSFooterProps>>;
} | null = null;

function getOrCreateLazyComponents() {
  if (!cachedComponents) {
    cachedComponents = {
      DSAppShell: createLazyComponent<DSAppShellProps>(
        loadShellModule,
        'DSAppShell'
      ),
      DSHeader: createLazyComponent<DSHeaderProps>(
        loadShellModule,
        'DSHeader'
      ),
      DSFooter: createLazyComponent<DSFooterProps>(
        loadShellModule,
        'DSFooter'
      ),
    };
  }
  return cachedComponents;
}

// =============================================================================
// useShellLoader Hook
// =============================================================================

/**
 * React hook for loading the App Shell from CDN at runtime.
 * 
 * Features:
 * - Dynamic import() for loading shell module from CDN
 * - React.lazy + Suspense pattern for code-splitting
 * - Loading and error state management
 * - Automatic retry with exponential backoff
 * - Local fallback when CDN unavailable
 * - Preload hints for faster loading
 * 
 * @param options - Configuration options
 * @returns State object with lazy components and status
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { 
 *     DSAppShell, 
 *     isReady, 
 *     isLoading, 
 *     error, 
 *     retry 
 *   } = useShellLoader();
 * 
 *   return (
 *     <Suspense fallback={<LoadingShell />}>
 *       <DSAppShell appName="MyApp">
 *         <Content />
 *       </DSAppShell>
 *     </Suspense>
 *   );
 * }
 * ```
 */
export function useShellLoader(
  options: UseShellLoaderOptions = {}
): UseShellLoaderState {
  const { skip = false, preloadStrategy = 'eager' } = options;

  // Track loading status
  const [status, setStatus] = useState<ShellLoadStatus>(() => 
    isShellLoaded() ? 'loaded' : 'idle'
  );
  const [error, setError] = useState<Error | null>(() => 
    getShellLoadError()
  );

  // Get or create lazy components (stable references)
  const lazyComponents = useMemo(() => getOrCreateLazyComponents(), []);

  // Load shell on mount (unless skipped)
  useEffect(() => {
    if (skip) {
      return;
    }

    // Add preload hint if not already loaded
    if (!isShellLoaded() && preloadStrategy === 'eager') {
      addPreloadHint();
    }

    // Already loaded? Mark ready
    if (isShellLoaded()) {
      setStatus('loaded');
      setError(null);
      return;
    }

    // Start loading
    setStatus('loading');
    
    loadShellModule(options)
      .then(() => {
        setStatus('loaded');
        setError(null);
      })
      .catch((err) => {
        setStatus('error');
        setError(err);
      });
  }, [skip, preloadStrategy, options]);

  // Retry function
  const retry = useCallback(() => {
    if (skip) return;

    // Reset state and try again
    resetShellLoader();
    cachedComponents = null; // Force recreation of lazy components
    
    setStatus('loading');
    setError(null);

    loadShellModule(options)
      .then(() => {
        setStatus('loaded');
        setError(null);
      })
      .catch((err) => {
        setStatus('error');
        setError(err);
      });
  }, [skip, options]);

  // Compute derived state
  const isReady = status === 'loaded';
  const isLoading = status === 'loading';

  return {
    status,
    error,
    isReady,
    isLoading,
    DSAppShell: lazyComponents.DSAppShell,
    DSHeader: lazyComponents.DSHeader,
    DSFooter: lazyComponents.DSFooter,
    retry,
  };
}

/**
 * Prefetch the shell module without rendering.
 * Call early in your app to start loading the shell in the background.
 * 
 * @example
 * ```tsx
 * // main.tsx
 * import { prefetchShell } from '@digistratum/ds-core';
 * 
 * // Start loading shell immediately
 * prefetchShell();
 * 
 * // Later in your app...
 * function App() {
 *   const { DSAppShell } = useShellLoader();
 *   // Shell may already be loaded!
 * }
 * ```
 */
export function prefetchShell(): void {
  addPreloadHint();
  // Fire and forget - error will be caught on actual use
  loadShellModule().catch(() => {
    // Silently ignore - error will surface when component is used
  });
}
