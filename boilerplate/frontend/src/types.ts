// Shared TypeScript types for {{APP_NAME}}

/**
 * User Tenant information
 * For multi-tenant apps, users can belong to multiple tenants
 */
export interface UserTenant {
  id: string;
  name: string;
  role?: string;
}

/**
 * User type matching DSAccount SSO user structure
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  display_name?: string;
  /** List of tenant IDs (simple) or full tenant objects */
  tenants: string[] | UserTenant[];
}

export interface Session {
  authenticated: boolean;
  user?: User;
  tenantId?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    request_id?: string;
  };
}
