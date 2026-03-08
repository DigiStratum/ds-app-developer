import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for catching React render errors [NFR-AVAIL-002]
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <App />
 * </ErrorBoundary>
 * ```
 * 
 * With custom error handler:
 * ```tsx
 * <ErrorBoundary onError={(error, info) => logErrorToService(error, info)}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center card max-w-md p-8">
            <div className="text-red-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              An unexpected error occurred. Please try again.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-4 rounded mb-4 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="space-x-4">
              <button
                onClick={this.handleRetry}
                className="btn btn-primary"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="btn btn-secondary"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-friendly error boundary wrapper for function components
 * Resets error state when key changes (e.g., route change)
 */
interface ErrorBoundaryWithKeyProps extends ErrorBoundaryProps {
  resetKey?: string | number;
}

export class ErrorBoundaryWithKey extends Component<ErrorBoundaryWithKeyProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryWithKeyProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryWithKeyProps): void {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center card max-w-md p-8">
            <div className="text-red-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              An unexpected error occurred. Please try again.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-4 rounded mb-4 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="space-x-4">
              <button
                onClick={this.handleRetry}
                className="btn btn-primary"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="btn btn-secondary"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
