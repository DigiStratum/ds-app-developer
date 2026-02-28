/**
 * @digistratum/ds-core - API Client
 * 
 * HTTP client with tenant header support for DigiStratum APIs.
 * Automatically includes X-Tenant-ID header and handles authentication.
 */

import type { ApiClientConfig, ApiError } from '../types';

/**
 * Error class for API errors with additional context
 */
export class DSApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly response?: ApiError
  ) {
    super(message);
    this.name = 'DSApiError';
  }

  /**
   * Check if the error is an authentication error (401)
   */
  isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * Check if the error is a forbidden error (403)
   */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Check if the error is a tenant-related error
   */
  isTenantError(): boolean {
    return this.code === 'TENANT_REQUIRED' || this.code === 'TENANT_FORBIDDEN';
  }
}

/**
 * HTTP client with tenant header support for DigiStratum APIs.
 * 
 * Features:
 * - Automatic X-Tenant-ID header injection
 * - Cookie-based session handling
 * - Typed request/response
 * - Error normalization
 */
export class ApiClient {
  private baseURL: string;
  private tenantId: string | null = null;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseURL = config.baseURL || '';
    this.defaultHeaders = config.defaultHeaders || {};
  }

  /**
   * Set the current tenant ID for X-Tenant-ID header
   */
  setTenant(tenantId: string | null): void {
    this.tenantId = tenantId;
  }

  /**
   * Get the current tenant ID
   */
  getTenant(): string | null {
    return this.tenantId;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
    };

    // Add tenant header if set [FR-TENANT-004]
    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Include cookies for session
    });

    if (!response.ok) {
      let error: ApiError;
      try {
        error = await response.json();
      } catch {
        error = {
          error: {
            code: `HTTP_${response.status}`,
            message: response.statusText || 'Request failed',
          },
        };
      }
      throw new DSApiError(
        error.error.message,
        error.error.code,
        response.status,
        error
      );
    }

    // Handle empty responses (e.g., 204 No Content)
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

/**
 * Create a pre-configured API client instance
 */
export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  return new ApiClient(config);
}
