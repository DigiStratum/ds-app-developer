/**
 * @digistratum/ds-core - Shell Fallback Components
 * 
 * Fallback UI components for shell loading and error states.
 * Used with React Suspense for graceful loading UX.
 * 
 * Implements FR-SHELL-001: Handle loading/error states gracefully.
 * 
 * @example
 * ```tsx
 * import { Suspense } from 'react';
 * import { useShellLoader, ShellSkeleton, ShellErrorFallback } from '@digistratum/ds-core';
 * 
 * function App() {
 *   const { DSAppShell, error, retry } = useShellLoader();
 * 
 *   if (error) {
 *     return <ShellErrorFallback error={error} onRetry={retry} />;
 *   }
 * 
 *   return (
 *     <Suspense fallback={<ShellSkeleton />}>
 *       <DSAppShell appName="MyApp">
 *         <Content />
 *       </DSAppShell>
 *     </Suspense>
 *   );
 * }
 * ```
 */

import { Component, ReactNode } from 'react';

// =============================================================================
// Shell Skeleton (Loading State)
// =============================================================================

export interface ShellSkeletonProps {
  /** Show header skeleton (default: true) */
  showHeader?: boolean;
  /** Show footer skeleton (default: true) */
  showFooter?: boolean;
  /** Show main content skeleton (default: true) */
  showContent?: boolean;
  /** Additional className for wrapper */
  className?: string;
}

/**
 * Skeleton UI shown while shell is loading from CDN.
 * Matches the structure of DSAppShell for minimal layout shift.
 */
export function ShellSkeleton({
  showHeader = true,
  showFooter = true,
  showContent = true,
  className = '',
}: ShellSkeletonProps) {
  return (
    <div 
      className={`ds-shell-skeleton min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 ${className}`}
      role="status"
      aria-label="Loading application shell"
    >
      {/* Header skeleton */}
      {showHeader && (
        <header className="bg-white dark:bg-gray-800 shadow animate-pulse">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              {/* Logo placeholder */}
              <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              
              {/* Nav items placeholder */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              
              {/* User menu placeholder */}
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main content skeleton */}
      {showContent && (
        <main className="flex-1 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-4">
              {/* Page title placeholder */}
              <div className="h-8 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
              
              {/* Content blocks */}
              <div className="space-y-3">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              
              {/* Card placeholders */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i}
                    className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Footer skeleton */}
      {showFooter && (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="flex space-x-4">
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Screen reader announcement */}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// =============================================================================
// Shell Error Fallback
// =============================================================================

export interface ShellErrorFallbackProps {
  /** The error that occurred */
  error: Error;
  /** Callback to retry loading */
  onRetry?: () => void;
  /** Custom title text */
  title?: string;
  /** Custom description text */
  description?: string;
  /** Additional className */
  className?: string;
}

/**
 * Error UI shown when shell fails to load from CDN.
 * Provides retry button and offline-friendly fallback.
 */
export function ShellErrorFallback({
  error,
  onRetry,
  title = 'Unable to load application',
  description = 'There was a problem loading the application shell. This may be due to a network issue.',
  className = '',
}: ShellErrorFallbackProps) {
  return (
    <div 
      className={`ds-shell-error min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 ${className}`}
      role="alert"
    >
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        {/* Error icon */}
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <svg 
            className="w-8 h-8 text-red-600 dark:text-red-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {description}
        </p>

        {/* Error details (collapsed by default) */}
        <details className="text-left text-sm text-gray-500 dark:text-gray-400 mb-4">
          <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            Technical details
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto">
            {error.message}
          </pre>
        </details>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              Try again
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md font-medium transition-colors"
          >
            Refresh page
          </button>
        </div>

        {/* Offline hint */}
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          If you're offline, please check your internet connection and try again.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Shell Error Boundary
// =============================================================================

export interface ShellErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Custom fallback component or function */
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Callback to retry after error */
  onRetry?: () => void;
}

interface ShellErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for shell loading errors.
 * Catches Suspense errors and provides retry mechanism.
 * 
 * @example
 * ```tsx
 * <ShellErrorBoundary
 *   fallback={(error, retry) => (
 *     <ShellErrorFallback error={error} onRetry={retry} />
 *   )}
 * >
 *   <Suspense fallback={<ShellSkeleton />}>
 *     <DSAppShell appName="MyApp">
 *       <Content />
 *     </DSAppShell>
 *   </Suspense>
 * </ShellErrorBoundary>
 * ```
 */
export class ShellErrorBoundary extends Component<
  ShellErrorBoundaryProps,
  ShellErrorBoundaryState
> {
  constructor(props: ShellErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ShellErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ShellErrorBoundary] Shell loading failed:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      const error = this.state.error;

      // Custom fallback function
      if (typeof fallback === 'function') {
        return fallback(error, this.handleRetry);
      }

      // Custom fallback element
      if (fallback) {
        return fallback;
      }

      // Default fallback
      return (
        <ShellErrorFallback 
          error={error} 
          onRetry={this.handleRetry} 
        />
      );
    }

    return this.props.children;
  }
}
