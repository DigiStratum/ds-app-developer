import { ReactNode } from 'react';

/**
 * Loading state configuration for ContentContainer
 */
export interface LoadingConfig {
  /** Whether content is currently loading */
  isLoading: boolean;
  /** Custom loading component (defaults to spinner) */
  loadingComponent?: ReactNode;
  /** Loading text/message */
  loadingText?: string;
}

/**
 * Error state configuration for ContentContainer
 */
export interface ErrorConfig {
  /** Error object or message */
  error: Error | string | null;
  /** Custom error component */
  errorComponent?: ReactNode;
  /** Callback when user clicks retry */
  onRetry?: () => void;
  /** Whether to show retry button (default: true when onRetry provided) */
  showRetry?: boolean;
}

/**
 * Breadcrumb item for navigation trail
 */
export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Navigation path (if clickable) */
  href?: string;
  /** Click handler (alternative to href) */
  onClick?: () => void;
  /** Icon to display before label */
  icon?: ReactNode;
}

/**
 * Breadcrumb configuration for ContentContainer
 */
export interface BreadcrumbConfig {
  /** Breadcrumb items in order (first = root, last = current) */
  items: BreadcrumbItem[];
  /** Custom breadcrumb renderer (overrides default) */
  customRenderer?: (items: BreadcrumbItem[]) => ReactNode;
  /** Separator between breadcrumb items (default: '/') */
  separator?: ReactNode;
  /** Additional className for breadcrumb container */
  className?: string;
}

/**
 * ContentContainer Props
 * 
 * The main content area where apps mount their UI.
 * Provides consistent loading/error states and responsive layout.
 */
export interface ContentContainerProps {
  /** App content to render */
  children: ReactNode;
  
  /** Loading state configuration */
  loading?: LoadingConfig;
  
  /** Error state configuration */
  error?: ErrorConfig;
  
  /** Breadcrumb configuration (renders at top of container) */
  breadcrumbs?: BreadcrumbConfig;
  
  /** Additional className for the container */
  className?: string;
  
  /** Additional className for the inner content wrapper */
  contentClassName?: string;
  
  /** Max width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full' | 'none';
  
  /** Padding variant */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  
  /** Whether to center content horizontally (default: true) */
  centered?: boolean;
  
  /**
   * Enable scrollable content area
   * - 'auto': Shows scrollbar when content overflows (default)
   * - 'always': Always shows scrollbar
   * - 'none': No scrolling, content can overflow
   * - true: Alias for 'auto'
   * - false: Alias for 'none'
   */
  scrollable?: boolean | 'auto' | 'always' | 'none';
  
  /**
   * Fixed height for scrollable container
   * When set, enables vertical scrolling within fixed bounds
   * Can be a CSS value (e.g., '400px', '50vh', 'calc(100vh - 200px)')
   */
  height?: string;
  
  /**
   * Minimum height for the content area
   * Useful for ensuring consistent layout during loading states
   */
  minHeight?: string;
  
  /** Test ID for testing */
  testId?: string;
}
