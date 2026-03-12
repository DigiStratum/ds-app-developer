/**
 * @digistratum/ds-core - Components
 * 
 * Re-exports all components.
 */

// Error handling
export { ErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps } from './ErrorBoundary';

// Feature flags
export { FeatureFlag, withFeatureFlag } from './FeatureFlag';
export type { FeatureFlagProps } from './FeatureFlag';

// Ad slots
export { AdSlot } from './AdSlot';
export type { AdSlotProps } from './AdSlot';

// Loading states
export { Loading, Skeleton } from './Loading';
export type { LoadingProps, SkeletonProps } from './Loading';

// Shell fallbacks
export { 
  ShellSkeleton, 
  ShellErrorFallback, 
  ShellErrorBoundary,
} from './ShellFallback';
export type { 
  ShellSkeletonProps, 
  ShellErrorFallbackProps,
  ShellErrorBoundaryProps,
} from './ShellFallback';

// API Error View
export { ApiErrorView } from './ApiErrorView';
export type { ApiErrorDetails, ApiErrorViewProps } from './ApiErrorView';
