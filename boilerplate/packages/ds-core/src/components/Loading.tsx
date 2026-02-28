/**
 * @digistratum/ds-core - Loading Component
 * 
 * Standard loading spinner/indicator for DS apps.
 */

export interface LoadingProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional loading message */
  message?: string;
  /** Full screen centered mode */
  fullScreen?: boolean;
  /** Additional CSS class names */
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

/**
 * Loading spinner component.
 * 
 * @example
 * ```tsx
 * // Inline spinner
 * <Loading size="sm" />
 * 
 * // Full page loading
 * <Loading fullScreen message="Loading your data..." />
 * ```
 */
export function Loading({
  size = 'md',
  message,
  fullScreen = false,
  className = '',
}: LoadingProps) {
  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <svg
        className={`animate-spin text-blue-600 ${sizeClasses[size]}`}
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {message && (
        <p className="text-gray-600 dark:text-gray-400 text-sm">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-50"
        role="status"
        aria-live="polite"
        aria-label={message || 'Loading'}
      >
        {spinner}
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" aria-label={message || 'Loading'}>
      {spinner}
    </div>
  );
}

/**
 * Loading skeleton for content placeholders.
 */
export interface SkeletonProps {
  /** Width (CSS value or Tailwind class) */
  width?: string;
  /** Height (CSS value or Tailwind class) */
  height?: string;
  /** Make it circular (for avatars) */
  circle?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Skeleton placeholder for loading states.
 * 
 * @example
 * ```tsx
 * // Text line skeleton
 * <Skeleton width="200px" height="20px" />
 * 
 * // Avatar skeleton
 * <Skeleton width="40px" height="40px" circle />
 * ```
 */
export function Skeleton({
  width = '100%',
  height = '20px',
  circle = false,
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${
        circle ? 'rounded-full' : 'rounded'
      } ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
