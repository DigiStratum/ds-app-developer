// Shared TypeScript types for {{APP_NAME}}

export interface User {
  id: string;
  email: string;
  name: string;
  tenants: string[];
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
