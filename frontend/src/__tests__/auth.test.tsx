import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '@digistratum/ds-core';

/**
 * Tests for FR-AUTH: Authentication & Authorization requirements
 * Updated for guest-session-first pattern
 * See REQUIREMENTS.md for full requirement descriptions
 */

// Test component that uses auth
function TestAuthConsumer() {
  const { user, isLoading, isAuthenticated, isGuest, login, logout } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <span data-testid="is-authenticated">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="is-guest">{isGuest ? 'yes' : 'no'}</span>
      {user && <span data-testid="user-email">{user.email}</span>}
      {!isAuthenticated && <button onClick={() => login()}>Sign In</button>}
      {isAuthenticated && <button onClick={logout}>Sign Out</button>}
    </div>
  );
}

function renderWithAuth(component: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AuthProvider>{component}</AuthProvider>
    </MemoryRouter>
  );
}

// Mock fetch responses
function mockFetch(sessionResponse: object, appsResponse: object = { apps: [] }) {
  return vi.fn((url: string) => {
    if (url.includes('/api/session')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sessionResponse),
      });
    }
    if (url.includes('/api/apps/available')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(appsResponse),
      });
    }
    return Promise.reject(new Error(`Unmocked URL: ${url}`));
  });
}

describe('FR-AUTH: Authentication & Authorization (Guest Session Pattern)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * Tests guest session pattern: Anonymous session on first visit
   * FR-AUTH-001: Guest sessions for anonymous users
   */
  describe('FR-AUTH-001: Guest sessions for anonymous users', () => {
    it('creates guest session on first visit', async () => {
      global.fetch = mockFetch({
        session_id: 'abc123...',
        is_authenticated: false,
        is_guest: true,
        tenant_id: null,
        user: null,
      }) as unknown as typeof fetch;

      renderWithAuth(<TestAuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('is-guest')).toHaveTextContent('yes');
      });
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('no');
    });
  });

  /**
   * Tests FR-AUTH-003: Authenticated user session
   */
  describe('FR-AUTH-003: Authenticated sessions', () => {
    it('shows authenticated user with tenant', async () => {
      global.fetch = mockFetch({
        session_id: 'xyz98765...',
        is_authenticated: true,
        is_guest: false,
        tenant_id: 'tenant-1',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          tenants: [{ id: 'tenant-1', name: 'Test Tenant' }],
        },
      }) as unknown as typeof fetch;

      renderWithAuth(<TestAuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('yes');
      });
      expect(screen.getByTestId('is-guest')).toHaveTextContent('no');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });

    it('provides logout function that redirects', async () => {
      const user = userEvent.setup();
      
      global.fetch = mockFetch({
        session_id: 'xyz98765...',
        is_authenticated: true,
        is_guest: false,
        tenant_id: 'tenant-1',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          tenants: [{ id: 'tenant-1', name: 'Test Tenant' }],
        },
      }) as unknown as typeof fetch;

      // Mock window.location.href setter
      const locationHref = vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        href: '',
      } as Location);
      
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });

      renderWithAuth(<TestAuthConsumer />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /sign out/i }));
      
      expect(window.location.href).toBe('/api/auth/logout');
      
      locationHref.mockRestore();
    });
  });
});

describe('FR-TENANT: Multi-Tenant Support', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * Tests FR-TENANT-001: User session identifies current tenant
   * User context should include tenant information
   */
  describe('FR-TENANT-001: Tenant context', () => {
    it('session includes tenant list for authenticated users', async () => {
      global.fetch = mockFetch({
        session_id: 'xyz98765...',
        is_authenticated: true,
        is_guest: false,
        tenant_id: 'tenant-1',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          tenants: [{ id: 'tenant-1', name: 'Tenant 1' }, { id: 'tenant-2', name: 'Tenant 2' }],
        },
      }) as unknown as typeof fetch;

      renderWithAuth(<TestAuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('yes');
      });
    });
  });
});
