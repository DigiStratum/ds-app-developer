/**
 * API Testing Client
 *
 * HTTP client for integration/API testing with convenience methods
 */

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

/**
 * API response wrapper with typed body
 */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  body: T;
  raw: Response;
}

/**
 * API test client for integration testing
 */
export class ApiTestClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.defaultHeaders = config.defaultHeaders ?? {};
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Set a default header for all requests
   */
  setHeader(key: string, value: string): this {
    this.defaultHeaders[key] = value;
    return this;
  }

  /**
   * Set authorization header
   */
  setAuth(token: string): this {
    return this.setHeader('Authorization', `Bearer ${token}`);
  }

  /**
   * Set tenant ID header
   */
  setTenant(tenantId: string): this {
    return this.setHeader('X-Tenant-ID', tenantId);
  }

  /**
   * Make a request
   */
  async request<T = unknown>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      query?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.baseUrl);
    
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        url.searchParams.set(key, value);
      }
    }

    const headers = new Headers({
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...options.headers,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type');
      let body: T;

      if (contentType?.includes('application/json')) {
        body = await response.json();
      } else {
        body = await response.text() as unknown as T;
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body,
        raw: response,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * GET request
   */
  get<T = unknown>(
    path: string,
    options?: { headers?: Record<string, string>; query?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  /**
   * POST request
   */
  post<T = unknown>(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, { body, ...options });
  }

  /**
   * PUT request
   */
  put<T = unknown>(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, { body, ...options });
  }

  /**
   * PATCH request
   */
  patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, { body, ...options });
  }

  /**
   * DELETE request
   */
  delete<T = unknown>(
    path: string,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }
}

/**
 * Create an API test client
 */
export function createApiClient(baseUrl: string, headers?: Record<string, string>): ApiTestClient {
  return new ApiTestClient({ baseUrl, defaultHeaders: headers });
}

/**
 * Create an authenticated API test client
 */
export function createAuthenticatedApiClient(
  baseUrl: string,
  token: string,
  tenantId?: string
): ApiTestClient {
  const client = createApiClient(baseUrl).setAuth(token);
  if (tenantId) {
    client.setTenant(tenantId);
  }
  return client;
}

/**
 * Assert helpers for API responses
 */
export const ApiAssert = {
  /**
   * Assert response is OK (2xx)
   */
  ok<T>(response: ApiResponse<T>): asserts response is ApiResponse<T> & { ok: true } {
    if (!response.ok) {
      throw new Error(`Expected OK response, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
  },

  /**
   * Assert response status matches expected
   */
  status<T>(response: ApiResponse<T>, expected: number): void {
    if (response.status !== expected) {
      throw new Error(`Expected status ${expected}, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
  },

  /**
   * Assert response contains expected field
   */
  hasField<T extends object>(response: ApiResponse<T>, field: keyof T): void {
    if (!(field in response.body)) {
      throw new Error(`Expected response to contain field "${String(field)}"`);
    }
  },

  /**
   * Assert response field equals expected value
   */
  fieldEquals<T extends object, K extends keyof T>(
    response: ApiResponse<T>,
    field: K,
    expected: T[K]
  ): void {
    if (response.body[field] !== expected) {
      throw new Error(`Expected ${String(field)} to equal ${expected}, got ${response.body[field]}`);
    }
  },

  /**
   * Assert response is an array with expected length
   */
  arrayLength<T>(response: ApiResponse<T[]>, expected: number): void {
    if (!Array.isArray(response.body)) {
      throw new Error('Expected response body to be an array');
    }
    if (response.body.length !== expected) {
      throw new Error(`Expected array length ${expected}, got ${response.body.length}`);
    }
  },
};
