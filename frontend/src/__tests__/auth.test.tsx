import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../hooks/useAuth';

/**
 * Tests for FR-AUTH: Authentication & Authorization requirements
 * Updated for guest-session-first pattern
 * See REQUIREMENTS.md for full requirement descriptions
 */

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    setTenant: vi.fn(),
  },
}));

import { api } from '../api/client';

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

describe('FR-AUTH: Authentication & Authorization (Guest Session Pattern)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Tests guest session pattern: Anonymous session on first visit
   * Users can browse without authentication
   */
  describe('Guest Session Pattern', () => {
    it('allows access with guest session (no authentication required)', async () => {
      vi.mocked(api.get).mockResolvedValue({
        session_id: 'abc12345...',
        is_authenticated: false,
        is_guest: true,
        user: null,
      });

      renderWithAuth(<TestAuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('no');
        expect(screen.getByTestId('is-guest')).toHaveTextContent('yes');
      });
    });

    it('shows sign in button for guest sessions', async () => {
      vi.mocked(api.get).mockResolvedValue({
        session_id: 'abc12345...',
        is_authenticated: false,
        is_guest: true,
        user: null,
      });

      renderWithAuth(<TestAuthConsumer />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      });
    });
  });

  /**
   * Tests FR-AUTH-002: Login redirects to SSO
   * Guest users can initiate login flow
   */
  describe('FR-AUTH-002: Login redirect', () => {
    it('redirects to auth/login when sign in clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({
        session_id: 'abc12345...',
        is_authenticated: false,
        is_guest: true,
        user: null,
      });

      renderWithAuth(<TestAuthConsumer />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      expect(window.location.href).toContain('/api/auth/login');
    });
  });

  /**
   * Tests FR-AUTH-003: Session includes user identity and tenant context
   * When authenticated, user info should be available in context
   */
  describe('FR-AUTH-003: Session context (authenticated)', () => {
    it('provides user info when session is authenticated', async () => {
      vi.mocked(api.get).mockResolvedValue({
        session_id: 'xyz98765...',
        is_authenticated: true,
        is_guest: false,
        tenant_id: 'tenant-1',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          tenants: ['tenant-1'],
        },
      });

      renderWithAuth(<TestAuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('yes');
        expect(screen.getByTestId('is-guest')).toHaveTextContent('no');
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      });
    });

    it('shows sign out button when authenticated', async () => {
      vi.mocked(api.get).mockResolvedValue({
        session_id: 'xyz98765...',
        is_authenticated: true,
        is_guest: false,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          tenants: [],
        },
      });

      renderWithAuth(<TestAuthConsumer />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
      });
    });
  });

  /**
   * Tests FR-AUTH-004: Logout clears session and redirects to DSAccount logout
   */
  describe('FR-AUTH-004: Logout', () => {
    it('redirects to auth/logout when sign out clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({
        session_id: 'xyz98765...',
        is_authenticated: true,
        is_guest: false,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          tenants: [],
        },
      });

      renderWithAuth(<TestAuthConsumer />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /sign out/i }));
      
      expect(window.location.href).toBe('/api/auth/logout');
    });
  });
});

describe('FR-TENANT: Multi-Tenant Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Tests FR-TENANT-001: User session identifies current tenant
   * User context should include tenant information
   */
  describe('FR-TENANT-001: Tenant context', () => {
    it('session includes tenant list for authenticated users', async () => {
      vi.mocked(api.get).mockResolvedValue({
        session_id: 'xyz98765...',
        is_authenticated: true,
        is_guest: false,
        tenant_id: 'tenant-1',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          tenants: ['tenant-1', 'tenant-2'],
        },
      });

      renderWithAuth(<TestAuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('yes');
      });

      // Verify tenant was set on API client
      expect(api.setTenant).toHaveBeenCalledWith('tenant-1');
    });
  });
});
