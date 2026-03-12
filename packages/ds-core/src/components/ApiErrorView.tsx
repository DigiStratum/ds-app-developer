/**
 * @digistratum/ds-core - ApiErrorView
 * 
 * Error display component for API/HTTP errors.
 * Shows within the AppShell content area, displays error info,
 * and auto-redirects to app root after countdown.
 * [NFR-AVAIL-003]
 */

import { useState, useEffect, useCallback } from 'react';

export interface ApiErrorDetails {
  /** HTTP status code */
  status: number;
  /** Error message from API or default */
  message: string;
  /** Original error for logging */
  originalError?: Error;
  /** Path that triggered the error */
  path?: string;
}

export interface ApiErrorViewProps {
  /** Error details to display */
  error: ApiErrorDetails;
  /** Seconds before redirect (default: 5) */
  countdownSeconds?: number;
  /** URL to redirect to (default: '/') */
  redirectUrl?: string;
  /** Callback when redirect happens */
  onRedirect?: () => void;
  /** Allow user to cancel redirect */
  allowCancel?: boolean;
}

const STATUS_MESSAGES: Record<number, { title: string; description: string }> = {
  400: {
    title: 'Bad Request',
    description: 'The request was invalid. Please try again.',
  },
  401: {
    title: 'Session Expired',
    description: 'Your session has expired. Please sign in again.',
  },
  403: {
    title: 'Access Denied',
    description: "You don't have permission to access this resource.",
  },
  404: {
    title: 'Not Found',
    description: 'The requested resource could not be found.',
  },
  500: {
    title: 'Server Error',
    description: 'Something went wrong on our end. Please try again later.',
  },
  502: {
    title: 'Service Unavailable',
    description: 'The service is temporarily unavailable. Please try again.',
  },
  503: {
    title: 'Service Unavailable',
    description: 'The service is temporarily unavailable. Please try again.',
  },
  504: {
    title: 'Gateway Timeout',
    description: 'The request timed out. Please try again.',
  },
};

function getStatusInfo(status: number): { title: string; description: string } {
  if (STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }
  if (status >= 500) {
    return {
      title: 'Server Error',
      description: 'An unexpected server error occurred.',
    };
  }
  if (status >= 400) {
    return {
      title: 'Request Error',
      description: 'There was a problem with your request.',
    };
  }
  return {
    title: 'Error',
    description: 'An unexpected error occurred.',
  };
}

function getStatusIcon(status: number): JSX.Element {
  // 401/403 - Lock icon
  if (status === 401 || status === 403) {
    return (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    );
  }
  // 404 - Search/not found icon
  if (status === 404) {
    return (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
        />
      </svg>
    );
  }
  // 5xx - Server error icon
  if (status >= 500) {
    return (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
        />
      </svg>
    );
  }
  // Default - Warning triangle
  return (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

export function ApiErrorView({
  error,
  countdownSeconds = 5,
  redirectUrl = '/',
  onRedirect,
  allowCancel = true,
}: ApiErrorViewProps): JSX.Element {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [isPaused, setIsPaused] = useState(false);

  const statusInfo = getStatusInfo(error.status);

  const handleRedirect = useCallback(() => {
    onRedirect?.();
    window.location.href = redirectUrl;
  }, [redirectUrl, onRedirect]);

  useEffect(() => {
    if (isPaused || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, countdown, handleRedirect]);

  const handleCancel = () => {
    setIsPaused(true);
  };

  const handleGoNow = () => {
    handleRedirect();
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-lg">
        {/* Status Icon */}
        <div className="text-red-500 dark:text-red-400 mb-6 flex justify-center">
          {getStatusIcon(error.status)}
        </div>

        {/* Status Code Badge */}
        <div className="inline-block px-3 py-1 mb-4 text-sm font-mono bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
          Error {error.status}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {statusInfo.title}
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {error.message || statusInfo.description}
        </p>

        {/* Path info (if available) */}
        {error.path && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6 font-mono">
            {error.path}
          </p>
        )}

        {/* Countdown */}
        {!isPaused && countdown > 0 && (
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Redirecting in{' '}
            <span className="font-bold text-gray-700 dark:text-gray-300">
              {countdown}
            </span>{' '}
            second{countdown !== 1 ? 's' : ''}...
          </p>
        )}

        {isPaused && (
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Redirect paused
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleGoNow}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Go Home
          </button>
          {allowCancel && !isPaused && countdown > 0 && (
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Stay Here
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
