import type { ContentContainerProps } from './types';

/**
 * Default loading spinner component
 */
function DefaultLoadingSpinner({ text }: { text?: string }) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-12"
      role="status"
      aria-live="polite"
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
      {text && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{text}</p>
      )}
      <span className="sr-only">{text || 'Loading...'}</span>
    </div>
  );
}

/**
 * Default error display component
 */
function DefaultErrorDisplay({ 
  error, 
  onRetry, 
  showRetry 
}: { 
  error: Error | string;
  onRetry?: () => void;
  showRetry?: boolean;
}) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const shouldShowRetry = showRetry ?? !!onRetry;
  
  return (
    <div 
      className="flex flex-col items-center justify-center py-12 text-center"
      role="alert"
    >
      <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3 mb-4">
        <svg 
          className="h-6 w-6 text-red-600 dark:text-red-400" 
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
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-4">
        {errorMessage}
      </p>
      {shouldShowRetry && onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Max width class mapping
 */
const maxWidthClasses: Record<NonNullable<ContentContainerProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
  none: '',
};

/**
 * Padding class mapping
 */
const paddingClasses: Record<NonNullable<ContentContainerProps['padding']>, string> = {
  none: '',
  sm: 'px-2 py-3 sm:px-4 sm:py-4',
  md: 'px-4 py-6 sm:px-6 lg:px-8',
  lg: 'px-6 py-8 sm:px-8 lg:px-12',
};

/**
 * ContentContainer - Main content area for app UI mounting
 * 
 * Provides:
 * - React mount point for app-specific content
 * - Built-in loading state with customizable spinner
 * - Built-in error state with retry capability
 * - Responsive padding and max-width variants
 * - Dark mode support
 * 
 * @example Basic usage
 * ```tsx
 * import { ContentContainer } from '@digistratum/layout';
 * 
 * function MyPage() {
 *   return (
 *     <ContentContainer>
 *       <h1>My App Content</h1>
 *       <p>Mount your app UI here</p>
 *     </ContentContainer>
 *   );
 * }
 * ```
 * 
 * @example With loading state
 * ```tsx
 * import { ContentContainer } from '@digistratum/layout';
 * 
 * function DataPage() {
 *   const { data, isLoading, error, refetch } = useData();
 *   
 *   return (
 *     <ContentContainer
 *       loading={{ isLoading, loadingText: 'Loading data...' }}
 *       error={{ error, onRetry: refetch }}
 *     >
 *       <DataDisplay data={data} />
 *     </ContentContainer>
 *   );
 * }
 * ```
 * 
 * @example Custom layout options
 * ```tsx
 * <ContentContainer
 *   maxWidth="2xl"
 *   padding="lg"
 *   centered={false}
 *   className="custom-bg"
 * >
 *   <WideContent />
 * </ContentContainer>
 * ```
 */
export function ContentContainer({
  children,
  loading,
  error,
  className = '',
  contentClassName = '',
  maxWidth = '7xl',
  padding = 'md',
  centered = true,
  testId,
}: ContentContainerProps) {
  // Render loading state
  if (loading?.isLoading) {
    return (
      <div 
        className={`ds-content-container ${className}`}
        data-testid={testId}
        data-state="loading"
      >
        <div className={`
          ${maxWidthClasses[maxWidth]}
          ${centered ? 'mx-auto' : ''}
          ${paddingClasses[padding]}
          ${contentClassName}
        `}>
          {loading.loadingComponent || (
            <DefaultLoadingSpinner text={loading.loadingText} />
          )}
        </div>
      </div>
    );
  }

  // Render error state
  if (error?.error) {
    return (
      <div 
        className={`ds-content-container ${className}`}
        data-testid={testId}
        data-state="error"
      >
        <div className={`
          ${maxWidthClasses[maxWidth]}
          ${centered ? 'mx-auto' : ''}
          ${paddingClasses[padding]}
          ${contentClassName}
        `}>
          {error.errorComponent || (
            <DefaultErrorDisplay 
              error={error.error} 
              onRetry={error.onRetry}
              showRetry={error.showRetry}
            />
          )}
        </div>
      </div>
    );
  }

  // Render content
  return (
    <div 
      className={`ds-content-container ${className}`}
      data-testid={testId}
      data-state="ready"
    >
      <div className={`
        ${maxWidthClasses[maxWidth]}
        ${centered ? 'mx-auto' : ''}
        ${paddingClasses[padding]}
        ${contentClassName}
      `}>
        {children}
      </div>
    </div>
  );
}
