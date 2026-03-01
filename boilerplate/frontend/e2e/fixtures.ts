import { test as base, expect as baseExpect, Page, BrowserContext } from '@playwright/test';

/**
 * Test users for authentication testing
 */
export const TEST_USERS = {
  valid: {
    email: 'test@digistratum.com',
    password: 'Test123!@#',
    name: 'Test User',
  },
  invalid: {
    email: 'invalid@test.com',
    password: 'wrongpassword',
  },
  multiTenant: {
    email: 'multitenant@digistratum.com',
    name: 'Multi Tenant User',
    tenants: ['tenant-1', 'tenant-2'],
  },
  noTenant: {
    email: 'notenant@digistratum.com',
    name: 'No Tenant User',
    tenants: [],
  },
};

/**
 * Mock API responses in tests
 */
export async function mockApiResponse(
  page: Page,
  url: string | RegExp,
  response: { status?: number; body?: unknown }
) {
  await page.route(url, async route => {
    await route.fulfill({
      status: response.status || 200,
      contentType: 'application/json',
      body: JSON.stringify(response.body || {}),
    });
  });
}

/**
 * Assert that page redirects to login
 */
export async function expectLoginRedirect(page: Page) {
  await page.waitForURL(/\/login|account\.digistratum\.com/);
}

interface TestUser {
  email: string;
  name?: string;
  password?: string;
  tenants?: string[];
}

/**
 * Extended test fixture with API mocking and authenticated page
 */
export const test = base.extend<{
  authenticatedPage: Page;
  testUser: TestUser;
  mockAuth: (user: TestUser) => Promise<void>;
}>({
  page: async ({ page }, use) => {
    // In CI, mock all /api/* calls to prevent ECONNREFUSED
    if (process.env.CI) {
      await page.route('**/api/**', async route => {
        const url = route.request().url();
        
        if (url.includes('/api/session')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ authenticated: false, user: null }),
          });
          return;
        }
        
        if (url.includes('/api/health')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'ok' }),
          });
          return;
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });
    }
    
    await use(page);
  },
  
  authenticatedPage: async ({ page }, use) => {
    await page.route('**/api/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          user: {
            id: 'test-user-001',
            email: TEST_USERS.valid.email,
            name: TEST_USERS.valid.name,
          },
        }),
      });
    });
    
    await page.route('**/api/**', async route => {
      if (route.request().url().includes('/api/session')) return;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    
    await use(page);
  },
  
  testUser: async ({}, use) => {
    await use(TEST_USERS.valid);
  },
  
  mockAuth: async ({ page }, use) => {
    const mockAuth = async (user: TestUser) => {
      await page.route('**/api/session', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authenticated: true,
            user: {
              id: `user-${user.email}`,
              email: user.email,
              name: user.name || 'Test User',
              tenants: user.tenants || [],
            },
          }),
        });
      });
    };
    await use(mockAuth);
  },
});

export const expect = baseExpect;
