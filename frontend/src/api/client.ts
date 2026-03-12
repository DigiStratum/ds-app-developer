import { ApiHttpError } from '@digistratum/ds-core';

const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private tenantId: string | null = null;
  private globalErrorHandler: ((error: ApiHttpError) => void) | null = null;

  setTenant(tenantId: string | null) {
    this.tenantId = tenantId;
  }

  /**
   * Set a global error handler for API errors.
   * Handler is called for all 4xx/5xx responses unless suppressGlobalHandler is true.
   */
  setGlobalErrorHandler(handler: (error: ApiHttpError) => void) {
    this.globalErrorHandler = handler;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { suppressGlobalHandler?: boolean }
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add tenant header [FR-TENANT-004]
    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await ApiHttpError.fromResponse(response, path);
      
      // Call global handler unless suppressed
      if (this.globalErrorHandler && !options?.suppressGlobalHandler) {
        this.globalErrorHandler(error);
      }
      
      throw error;
    }

    return response.json();
  }

  get<T>(path: string, options?: { suppressGlobalHandler?: boolean }): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body: unknown, options?: { suppressGlobalHandler?: boolean }): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  put<T>(path: string, body: unknown, options?: { suppressGlobalHandler?: boolean }): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  patch<T>(path: string, body: unknown, options?: { suppressGlobalHandler?: boolean }): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  delete<T>(path: string, options?: { suppressGlobalHandler?: boolean }): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }
}

export const api = new ApiClient();
