/**
 * API Client
 * 
 * HTTP client with tenant header support for backend API calls.
 */

let currentTenant: string | null = null;

/**
 * Set the current tenant for API calls
 */
export function setTenant(tenantId: string | null): void {
  currentTenant = tenantId;
}

/**
 * Get the current tenant
 */
export function getTenant(): string | null {
  return currentTenant;
}

/**
 * Base fetch wrapper with tenant headers
 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add tenant header if set
  if (currentTenant) {
    headers['X-Tenant-ID'] = currentTenant;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error?.message || response.statusText,
      errorData.error?.code || `HTTP_${response.status}`,
      response.status
    );
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API client instance
 */
export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  setTenant,
  getTenant,
};

export default api;
