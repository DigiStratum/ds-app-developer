import type { ContentContainerProps, BreadcrumbConfig, BreadcrumbItem } from './types';

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
 * Default breadcrumb separator
 */
function DefaultSeparator() {
  return (
    <svg 
      className="flex-shrink-0 h-5 w-5 text-gray-400"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
    </svg>
  );
}

/**
 * Default breadcrumb renderer
 */
function DefaultBreadcrumbs({ config }: { config: BreadcrumbConfig }) {
  const { items, separator = <DefaultSeparator />, className = '' } = config;
  
  if (items.length === 0) return null;
  
  return (
    <nav 
      className={`mb-4 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isClickable = !isLast && (item.href || item.onClick);
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 flex-shrink-0">
                  {separator}
                </span>
              )}
              <BreadcrumbItemRenderer 
                item={item} 
                isLast={isLast} 
                isClickable={!!isClickable} 
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Individual breadcrumb item renderer
 */
function BreadcrumbItemRenderer({ 
  item, 
  isLast, 
  isClickable 
}: { 
  item: BreadcrumbItem; 
  isLast: boolean;
  isClickable: boolean;
}) {
  const baseClasses = "text-sm font-medium";
  const activeClasses = "text-gray-500 dark:text-gray-400";
  const linkClasses = "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors";
  
  const content = (
    <>
      {item.icon && <span className="mr-1.5 flex-shrink-0">{item.icon}</span>}
      <span>{item.label}</span>
    </>
  );
  
  if (isLast) {
    return (
      <span 
        className={`${baseClasses} ${activeClasses} flex items-center`}
        aria-current="page"
      >
        {content}
      </span>
    );
  }
  
  if (item.href) {
    return (
      <a 
        href={item.href}
        className={`${baseClasses} ${linkClasses} flex items-center`}
      >
        {content}
      </a>
    );
  }
  
  if (item.onClick) {
    return (
      <button 
        onClick={item.onClick}
        className={`${baseClasses} ${linkClasses} flex items-center`}
        type="button"
      >
        {content}
      </button>
    );
  }
  
  return (
    <span className={`${baseClasses} ${activeClasses} flex items-center`}>
      {content}
    </span>
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
 * Get scrollable class based on scrollable prop
 */
function getScrollableClasses(scrollable: ContentContainerProps['scrollable']): string {
  if (scrollable === false || scrollable === 'none') {
    return '';
  }
  if (scrollable === 'always') {
    return 'overflow-y-scroll';
  }
  // Default: auto (or true)
  return 'overflow-y-auto';
}

/**
 * ContentContainer - Main content area for app UI mounting
 * 
 * Provides:
 * - React mount point for app-specific content
 * - Built-in loading state with customizable spinner
 * - Built-in error state with retry capability
 * - Optional breadcrumb navigation at top
 * - Scrollable content area with configurable height
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
 * @example With breadcrumbs
 * ```tsx
 * import { ContentContainer } from '@digistratum/layout';
 * 
 * function ProjectDetailPage() {
 *   return (
 *     <ContentContainer
 *       breadcrumbs={{
 *         items: [
 *           { label: 'Home', href: '/' },
 *           { label: 'Projects', href: '/projects' },
 *           { label: 'Project Alpha' },
 *         ]
 *       }}
 *     >
 *       <ProjectDetail />
 *     </ContentContainer>
 *   );
 * }
 * ```
 * 
 * @example Scrollable with fixed height
 * ```tsx
 * <ContentContainer
 *   scrollable
 *   height="calc(100vh - 200px)"
 *   padding="md"
 * >
 *   <LongContent />
 * </ContentContainer>
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
  breadcrumbs,
  className = '',
  contentClassName = '',
  maxWidth = '7xl',
  padding = 'md',
  centered = true,
  scrollable = 'auto',
  height,
  minHeight,
  testId,
}: ContentContainerProps) {
  // Build scroll classes
  const scrollClasses = getScrollableClasses(scrollable);
  
  // Build style object for height constraints
  const containerStyle: React.CSSProperties = {};
  if (height) {
    containerStyle.height = height;
  }
  if (minHeight) {
    containerStyle.minHeight = minHeight;
  }

  // Render breadcrumbs if provided
  const renderBreadcrumbs = () => {
    if (!breadcrumbs || breadcrumbs.items.length === 0) return null;
    
    if (breadcrumbs.customRenderer) {
      return breadcrumbs.customRenderer(breadcrumbs.items);
    }
    
    return <DefaultBreadcrumbs config={breadcrumbs} />;
  };

  // Render loading state
  if (loading?.isLoading) {
    return (
      <div 
        className={`ds-content-container ${scrollClasses} ${className}`}
        style={containerStyle}
        data-testid={testId}
        data-state="loading"
      >
        <div className={`
          ${maxWidthClasses[maxWidth]}
          ${centered ? 'mx-auto' : ''}
          ${paddingClasses[padding]}
          ${contentClassName}
        `}>
          {renderBreadcrumbs()}
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
        className={`ds-content-container ${scrollClasses} ${className}`}
        style={containerStyle}
        data-testid={testId}
        data-state="error"
      >
        <div className={`
          ${maxWidthClasses[maxWidth]}
          ${centered ? 'mx-auto' : ''}
          ${paddingClasses[padding]}
          ${contentClassName}
        `}>
          {renderBreadcrumbs()}
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
      className={`ds-content-container ${scrollClasses} ${className}`}
      style={containerStyle}
      data-testid={testId}
      data-state="ready"
    >
      <div className={`
        ${maxWidthClasses[maxWidth]}
        ${centered ? 'mx-auto' : ''}
        ${paddingClasses[padding]}
        ${contentClassName}
      `}>
        {renderBreadcrumbs()}
        {children}
      </div>
    </div>
  );
}
