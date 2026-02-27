import { Session, ApiError } from '../types';

const API_BASE = '/api';

class ApiClient {
  private tenantId: string | null = null;

  setTenant(tenantId: string) {
    this.tenantId = tenantId;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw error;
    }

    return response.json();
  }

  async getSession(): Promise<Session> {
    return this.request<Session>('/session');
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
  }

  // Add your API methods here:
  // async getItems(): Promise<Item[]> {
  //   return this.request<Item[]>('/items');
  // }
}

export const api = new ApiClient();
