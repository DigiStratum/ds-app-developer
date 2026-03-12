/**
 * @digistratum/ds-core - useApiError
 * 
 * Global API error handling context and hook.
 * Catches API errors and displays them via ApiErrorView.
 * [NFR-AVAIL-003]
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ApiErrorDetails, ApiErrorView } from '../components/ApiErrorView';

interface ApiErrorContextValue {
  /** Current error (null if none) */
  error: ApiErrorDetails | null;
  /** Set an API error to display */
  setApiError: (error: ApiErrorDetails) => void;
  /** Clear the current error */
  clearError: () => void;
  /** Check if there's an active error */
  hasError: boolean;
}

const ApiErrorContext = createContext<ApiErrorContextValue | null>(null);

export interface ApiErrorProviderProps {
  children: ReactNode;
  /** Seconds before redirect (default: 5) */
  countdownSeconds?: number;
  /** URL to redirect to (default: '/') */
  redirectUrl?: string;
  /** Callback when error is set */
  onError?: (error: ApiErrorDetails) => void;
}

/**
 * Provider for global API error handling.
 * Wrap your app (inside the shell) to catch and display API errors.
 * 
 * @example
 * ```tsx
 * <ApiErrorProvider>
 *   <DashboardPage />
 * </ApiErrorProvider>
 * ```
 */
export function ApiErrorProvider({
  children,
  countdownSeconds = 5,
  redirectUrl = '/',
  onError,
}: ApiErrorProviderProps): JSX.Element {
  const [error, setError] = useState<ApiErrorDetails | null>(null);

  const setApiError = useCallback((newError: ApiErrorDetails) => {
    setError(newError);
    onError?.(newError);
  }, [onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: ApiErrorContextValue = {
    error,
    setApiError,
    clearError,
    hasError: error !== null,
  };

  return (
    <ApiErrorContext.Provider value={value}>
      {error ? (
        <ApiErrorView
          error={error}
          countdownSeconds={countdownSeconds}
          redirectUrl={redirectUrl}
          onRedirect={clearError}
        />
      ) : (
        children
      )}
    </ApiErrorContext.Provider>
  );
}

/**
 * Hook to access API error handling.
 * 
 * @example
 * ```tsx
 * const { setApiError } = useApiError();
 * 
 * try {
 *   await api.get('/projects');
 * } catch (err) {
 *   if (err instanceof ApiHttpError) {
 *     setApiError({ status: err.status, message: err.message });
 *   }
 * }
 * ```
 */
export function useApiError(): ApiErrorContextValue {
  const context = useContext(ApiErrorContext);
  if (!context) {
    throw new Error('useApiError must be used within an ApiErrorProvider');
  }
  return context;
}

/**
 * Safe version of useApiError that returns no-op functions if outside provider.
 * Useful for components that may be rendered outside the error provider.
 */
export function useApiErrorSafe(): ApiErrorContextValue {
  const context = useContext(ApiErrorContext);
  if (!context) {
    return {
      error: null,
      setApiError: () => {},
      clearError: () => {},
      hasError: false,
    };
  }
  return context;
}
