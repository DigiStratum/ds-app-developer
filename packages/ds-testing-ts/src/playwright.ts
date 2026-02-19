/**
 * Playwright Testing Utilities
 *
 * Extended fixtures and helpers for E2E testing
 */

import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Test user data structure
 */
export interface TestUser {
  id: string;
  email: string;
  name: string;
  tenants: string[];
}

/**
 * Standard test users
 */
export const TEST_USERS: Record<string, TestUser> = {
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
};

/**
 * Options for auth fixtures
 */
export interface AuthFixtureOptions {
  sessionCookieName?: string;
  tenantStorageKey?: string;
}

/**
 * Mock authentication by injecting session cookie
 */
async function mockAuthentication(
  context: BrowserContext,
  user: TestUser,
  baseURL: string,
  options: AuthFixtureOptions = {}
): Promise<void> {
  const { sessionCookieName = 'ds_session', tenantStorageKey = 'currentTenant' } = options;

  // Create mock JWT-like session token
  const mockSessionToken = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      tenants: user.tenants,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })
  ).toString('base64');

  const url = new URL(baseURL);

  await context.addCookies([
    {
      name: sessionCookieName,
      value: mockSessionToken,
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      secure: url.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);

  if (user.tenants.length > 0) {
    await context.addInitScript(
      ({ key, value }: { key: string; value: string }) => {
        localStorage.setItem(key, value);
      },
      { key: tenantStorageKey, value: user.tenants[0] }
    );
  }
}

/**
 * Clear authentication state
 */
async function clearAuthentication(
  context: BrowserContext,
  options: AuthFixtureOptions = {}
): Promise<void> {
  const { tenantStorageKey = 'currentTenant' } = options;
  await context.clearCookies();
  await context.addInitScript((key: string) => {
    localStorage.removeItem(key);
  }, tenantStorageKey);
}

/**
 * Extended test fixtures
 */
type AuthFixtures = {
  testUser: TestUser;
  authenticatedPage: Page;
  mockAuth: (user?: TestUser) => Promise<void>;
  clearAuth: () => Promise<void>;
};

/**
 * Create auth-extended test fixture
 */
export function createAuthTest(options: AuthFixtureOptions = {}) {
  return base.extend<AuthFixtures>({
    testUser: async ({}, use) => {
      await use(TEST_USERS.standard);
    },

    mockAuth: async ({ context, baseURL }, use) => {
      const auth = async (user: TestUser = TEST_USERS.standard) => {
        await mockAuthentication(context, user, baseURL || 'http://localhost:5173', options);
      };
      await use(auth);
    },

    clearAuth: async ({ context }, use) => {
      await use(async () => {
        await clearAuthentication(context, options);
      });
    },

    authenticatedPage: async ({ page, context, testUser, baseURL }, use) => {
      await mockAuthentication(context, testUser, baseURL || 'http://localhost:5173', options);
      await use(page);
    },
  });
}

/**
 * Default auth test with standard options
 */
export const test = createAuthTest();

// Re-export playwright's expect
export { expect } from '@playwright/test';

/**
 * Mock API response in E2E tests
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
 * Wait for authentication state to be ready
 */
export async function waitForAuth(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const spinner = document.querySelector('[data-testid="auth-loading"]');
    return !spinner;
  }, { timeout: 10000 });
}

/**
 * Assert user is redirected to login
 */
export async function expectLoginRedirect(page: Page): Promise<void> {
  const loginButton = page.getByRole('button', { name: /login/i });
  const ssoUrl = page.url();

  const isOnLoginPage = await loginButton.isVisible().catch(() => false);
  const isRedirectedToSSO = ssoUrl.includes('account.digistratum.com');

  expect(isOnLoginPage || isRedirectedToSSO).toBeTruthy();
}

/**
 * Take a screenshot on failure helper
 */
export async function screenshotOnFailure(
  page: Page,
  testInfo: { title: string; outputPath: (name: string) => string }
): Promise<void> {
  const screenshot = await page.screenshot();
  await testInfo.outputPath(`${testInfo.title.replace(/\s+/g, '-')}-failure.png`);
}
