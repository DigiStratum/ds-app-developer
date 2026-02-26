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
  
  /** Test ID for testing */
  testId?: string;
}
