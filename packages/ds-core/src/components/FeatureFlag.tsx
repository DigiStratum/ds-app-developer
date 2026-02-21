/**
 * @digistratum/ds-core - FeatureFlag Component
 * 
 * Conditionally renders children based on feature flag state.
 * Requires FeatureFlagsProvider ancestor.
 */

import { ReactNode } from 'react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

export interface FeatureFlagProps {
  /** The feature flag key to check */
  flag: string;
  /** Content to render when the flag is enabled */
  children: ReactNode;
  /** Optional content to render when the flag is disabled */
  fallback?: ReactNode;
  /** If true, render children when flag is disabled (inverse logic) */
  inverse?: boolean;
}

/**
 * Conditionally renders children based on feature flag state.
 * 
 * @example
 * ```tsx
 * <FeatureFlag flag="new-feature">
 *   <NewFeatureComponent />
 * </FeatureFlag>
 * 
 * // With fallback
 * <FeatureFlag flag="new-dashboard" fallback={<OldDashboard />}>
 *   <NewDashboard />
 * </FeatureFlag>
 * 
 * // Inverse logic (hide when flag is enabled)
 * <FeatureFlag flag="deprecated-feature" inverse>
 *   <DeprecatedBanner />
 * </FeatureFlag>
 * ```
 */
export function FeatureFlag({
  flag,
  children,
  fallback = null,
  inverse = false,
}: FeatureFlagProps): ReactNode {
  const { isEnabled, isLoading } = useFeatureFlags();

  // Don't render anything while loading to avoid flash
  // In practice, cached flags make this instant most of the time
  if (isLoading && !isEnabled(flag)) {
    return fallback;
  }

  const enabled = isEnabled(flag);
  const shouldRender = inverse ? !enabled : enabled;

  return shouldRender ? children : fallback;
}

/**
 * Higher-order component version for class components or when needed.
 * 
 * @example
 * ```tsx
 * const ProtectedComponent = withFeatureFlag('new-feature')(MyComponent);
 * ```
 */
export function withFeatureFlag<P extends object>(
  flag: string,
  FallbackComponent?: React.ComponentType<P>
) {
  return function WithFeatureFlagWrapper(
    WrappedComponent: React.ComponentType<P>
  ) {
    return function WithFeatureFlag(props: P) {
      return (
        <FeatureFlag
          flag={flag}
          fallback={FallbackComponent ? <FallbackComponent {...props} /> : null}
        >
          <WrappedComponent {...props} />
        </FeatureFlag>
      );
    };
  };
}
