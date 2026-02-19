import { test as base, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Authentication Fixtures for E2E Tests
 * 
 * Provides reusable authentication patterns for testing protected routes.
 * Per AUTH.md: DSAccount SSO flow with session cookies
 * 
 * Requirements: FR-AUTH-001, FR-AUTH-002, FR-AUTH-003
 */

// User fixture data
export interface TestUser {
  id: string;
  email: string;
  name: string;
  tenants: string[];
}

export const TEST_USERS = {
  standard: {
    id: 'user-e2e-001',
    email: 'e2e-test@digistratum.com',
    name: 'E2E Test User',
    tenants: ['tenant-test-001'],
  },
  multiTenant: {
    id: 'user-e2e-002',
    email: 'multi-tenant@digistratum.com',
    name: 'Multi-Tenant User',
    tenants: ['tenant-test-001', 'tenant-test-002'],
  },
  noTenant: {
    id: 'user-e2e-003',
    email: 'personal@digistratum.com',
    name: 'Personal User',
    tenants: [],
  },
} as const;

/**
 * Mock authentication by injecting a session cookie
 * 
 * In E2E tests, we bypass the real SSO flow by directly setting
 * the session cookie that would be set after successful authentication.
 * 
 * This approach:
 * - Avoids coupling tests to external SSO service
 * - Makes tests faster and more reliable
 * - Still tests the authenticated behavior of the app
 */
async function mockAuthentication(
  context: BrowserContext,
  user: TestUser,
  baseURL: string
): Promise<void> {
  // Create a mock JWT-like session token
  // In production, this would be a real DSAccount token
  const mockSessionToken = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      tenants: user.tenants,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000),
    })
  ).toString('base64');

  // Parse base URL for cookie domain
  const url = new URL(baseURL);
  
  // Set the session cookie
  await context.addCookies([
    {
      name: 'ds_session',
      value: mockSessionToken,
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      secure: url.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);

  // Also set localStorage for tenant context if user has tenants
  if (user.tenants.length > 0) {
    await context.addInitScript((tenantId: string) => {
      localStorage.setItem('currentTenant', tenantId);
    }, user.tenants[0]);
  }
}

/**
 * Clear authentication state
 */
async function clearAuthentication(context: BrowserContext): Promise<void> {
  await context.clearCookies();
  await context.addInitScript(() => {
    localStorage.removeItem('currentTenant');
  });
}

/**
 * Extended test fixture with authentication helpers
 */
type AuthFixtures = {
  authenticatedPage: Page;
  testUser: TestUser;
  mockAuth: (user?: TestUser) => Promise<void>;
  clearAuth: () => Promise<void>;
};

/**
 * Base test extended with authentication fixtures
 * 
 * Usage:
 *   import { test, expect } from './fixtures/auth.fixture';
 * 
 *   test('authenticated flow', async ({ authenticatedPage }) => {
 *     // Page is already authenticated
 *     await authenticatedPage.goto('/dashboard');
 *     // ...
 *   });
 * 
 *   test('custom auth', async ({ page, mockAuth }) => {
 *     await mockAuth(TEST_USERS.multiTenant);
 *     await page.goto('/dashboard');
 *     // ...
 *   });
 */
export const test = base.extend<AuthFixtures>({
  // Default test user
  testUser: async ({}, use) => {
    await use(TEST_USERS.standard);
  },

  // Helper to mock authentication with any user
  mockAuth: async ({ context, baseURL }, use) => {
    const auth = async (user: TestUser = TEST_USERS.standard) => {
      await mockAuthentication(context, user, baseURL || 'http://localhost:5173');
    };
    await use(auth);
  },

  // Helper to clear authentication
  clearAuth: async ({ context }, use) => {
    await use(async () => {
      await clearAuthentication(context);
    });
  },

  // Pre-authenticated page fixture
  authenticatedPage: async ({ page, context, testUser, baseURL }, use) => {
    await mockAuthentication(context, testUser, baseURL || 'http://localhost:5173');
    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * API mocking utilities for E2E tests
 * 
 * Use route interception to mock API responses without needing a real backend.
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: {
    status?: number;
    body?: unknown;
    headers?: Record<string, string>;
  }
): Promise<void> {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status: response.status || 200,
      contentType: 'application/json',
      body: JSON.stringify(response.body || {}),
      headers: response.headers,
    });
  });
}

/**
 * Mock the /api/me endpoint to return a specific user
 */
export async function mockCurrentUser(page: Page, user: TestUser): Promise<void> {
  await mockApiResponse(page, '**/api/me', {
    body: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}

/**
 * Mock the /api/tenant endpoint
 */
export async function mockCurrentTenant(
  page: Page,
  tenant: { id: string; name: string } | null
): Promise<void> {
  await mockApiResponse(page, '**/api/tenant', {
    body: tenant || { id: null, name: 'Personal' },
  });
}

/**
 * Wait for authentication state to be ready
 */
export async function waitForAuth(page: Page): Promise<void> {
  // Wait for the auth loading state to complete
  await page.waitForFunction(() => {
    // Check that loading spinner is gone
    const spinner = document.querySelector('[data-testid="auth-loading"]');
    return !spinner;
  }, { timeout: 10000 });
}

/**
 * Assert that the user is redirected to login
 */
export async function expectLoginRedirect(page: Page): Promise<void> {
  // Check for either the login button or SSO redirect
  const loginButton = page.getByRole('button', { name: /login/i });
  const ssoUrl = page.url();
  
  const isOnLoginPage = await loginButton.isVisible().catch(() => false);
  const isRedirectedToSSO = ssoUrl.includes('account.digistratum.com');
  
  expect(isOnLoginPage || isRedirectedToSSO).toBeTruthy();
}
