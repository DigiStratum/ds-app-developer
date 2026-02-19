import { ReactNode } from 'react';
import { useAuth } from './AuthProvider';

interface RequireAuthProps {
  children: ReactNode;
  /** Component to show while loading auth state */
  loadingFallback?: ReactNode;
  /** Component to show when not authenticated (if not auto-redirecting) */
  unauthenticatedFallback?: ReactNode;
  /** Whether to auto-redirect to login (default: true) */
  autoRedirect?: boolean;
}

/**
 * Component that requires authentication to render children.
 * Automatically redirects to login if not authenticated.
 */
export function RequireAuth({
  children,
  loadingFallback = null,
  unauthenticatedFallback = null,
  autoRedirect = true,
}: RequireAuthProps) {
  const { user, isLoading, login } = useAuth();

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!user) {
    if (autoRedirect) {
      login();
      return <>{loadingFallback}</>;
    }
    return <>{unauthenticatedFallback}</>;
  }

  return <>{children}</>;
}

interface RequireTenantProps {
  children: ReactNode;
  /** Component to show when no tenant is selected */
  noTenantFallback?: ReactNode;
  /** Callback when no tenant is selected (e.g., show picker) */
  onNoTenant?: () => void;
}

/**
 * Component that requires a tenant to be selected to render children.
 */
export function RequireTenant({
  children,
  noTenantFallback = null,
  onNoTenant,
}: RequireTenantProps) {
  const { currentTenant, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!currentTenant) {
    if (onNoTenant) {
      onNoTenant();
    }
    return <>{noTenantFallback}</>;
  }

  return <>{children}</>;
}
