/**
 * Mock Utilities
 *
 * Helpers for mocking API responses and external services
 */

/**
 * Mock request configuration
 */
export interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * Mock response configuration
 */
export interface MockResponse<T = unknown> {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: T;
  delay?: number;
}

/**
 * Create a mock Response object
 */
export function mockResponse<T>(
  body: T,
  options: Omit<MockResponse<T>, 'body'> = {}
): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options;

  const responseHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  });

  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: responseHeaders,
  });
}

/**
 * Create a mock Response that returns an error
 */
export function mockErrorResponse(
  status: number,
  message: string,
  code?: string
): Response {
  return mockResponse(
    { error: message, code },
    { status, statusText: message }
  );
}

/**
 * Mock fetch function creator
 */
export function createMockFetch(
  handlers: Map<string, (url: string, init?: RequestInit) => Response | Promise<Response>>
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    
    for (const [pattern, handler] of handlers) {
      if (url.includes(pattern) || new RegExp(pattern).test(url)) {
        const response = handler(url, init);
        return response instanceof Promise ? response : Promise.resolve(response);
      }
    }

    return mockErrorResponse(404, `No mock handler for ${url}`);
  };
}

/**
 * Mock fetch builder for fluent API
 */
export class MockFetchBuilder {
  private handlers = new Map<string, (url: string, init?: RequestInit) => Response | Promise<Response>>();

  /**
   * Add a GET handler
   */
  onGet<T>(pattern: string, response: T | (() => T), options?: Omit<MockResponse, 'body'>): this {
    this.handlers.set(pattern, () => {
      const body = typeof response === 'function' ? (response as () => T)() : response;
      return mockResponse(body, options);
    });
    return this;
  }

  /**
   * Add a POST handler
   */
  onPost<T>(pattern: string, response: T | ((body: unknown) => T), options?: Omit<MockResponse, 'body'>): this {
    this.handlers.set(pattern, (url, init) => {
      const requestBody = init?.body ? JSON.parse(init.body as string) : undefined;
      const body = typeof response === 'function' ? (response as (b: unknown) => T)(requestBody) : response;
      return mockResponse(body, options);
    });
    return this;
  }

  /**
   * Add an error handler
   */
  onError(pattern: string, status: number, message: string): this {
    this.handlers.set(pattern, () => mockErrorResponse(status, message));
    return this;
  }

  /**
   * Add a delayed response
   */
  onDelay<T>(pattern: string, delayMs: number, response: T, options?: Omit<MockResponse, 'body'>): this {
    this.handlers.set(pattern, async () => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return mockResponse(response, options);
    });
    return this;
  }

  /**
   * Build the mock fetch function
   */
  build(): typeof fetch {
    return createMockFetch(this.handlers);
  }
}

/**
 * Create a mock fetch builder
 */
export function mockFetch(): MockFetchBuilder {
  return new MockFetchBuilder();
}

/**
 * Mock localStorage for tests
 */
export function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  };
}

/**
 * Mock sessionStorage for tests
 */
export const createMockSessionStorage = createMockStorage;

/**
 * Create mock JWT token for testing
 */
export function createMockJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload,
  };

  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/=/g, '');
  const signature = 'mock-signature';

  return `${encode(header)}.${encode(fullPayload)}.${signature}`;
}

/**
 * Create a mock session token for DSAccount
 */
export function createMockSessionToken(user: {
  id: string;
  email: string;
  name: string;
  tenants: string[];
}): string {
  return createMockJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    tenants: user.tenants,
  });
}
