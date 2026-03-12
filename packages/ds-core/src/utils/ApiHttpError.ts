/**
 * @digistratum/ds-core - ApiHttpError
 * 
 * Typed error class for HTTP/API errors.
 * Carries status code, message, and optional path for error display.
 * [NFR-AVAIL-003]
 */

export class ApiHttpError extends Error {
  public readonly status: number;
  public readonly path?: string;
  public readonly originalResponse?: Response;

  constructor(
    status: number,
    message: string,
    path?: string,
    originalResponse?: Response
  ) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.path = path;
    this.originalResponse = originalResponse;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiHttpError);
    }
  }

  /**
   * Create from a fetch Response object.
   */
  static async fromResponse(response: Response, path?: string): Promise<ApiHttpError> {
    let message = response.statusText || 'Request failed';

    try {
      const body = await response.json();
      if (body.error?.message) {
        message = body.error.message;
      } else if (body.message) {
        message = body.message;
      } else if (typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // Body wasn't JSON, use statusText
    }

    return new ApiHttpError(response.status, message, path, response);
  }

  /**
   * Check if this is an authentication error (401/403).
   */
  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /**
   * Check if this is a server error (5xx).
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if this is a client error (4xx).
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Convert to ApiErrorDetails for display.
   */
  toErrorDetails(): { status: number; message: string; path?: string } {
    return {
      status: this.status,
      message: this.message,
      path: this.path,
    };
  }
}
