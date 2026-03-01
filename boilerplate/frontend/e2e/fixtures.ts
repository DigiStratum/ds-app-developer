import { test as base, expect as baseExpect, Page } from '@playwright/test';

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

/**
 * Extended test fixture with API mocking and authenticated page
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  page: async ({ page }, use) => {
    // In CI, mock all /api/* calls to prevent ECONNREFUSED
    if (process.env.CI) {
      await page.route('**/api/**', async route => {
        const url = route.request().url();
        
        // Mock /api/session - return unauthenticated
        if (url.includes('/api/session')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ authenticated: false, user: null }),
          });
          return;
        }
        
        // Mock /api/health
        if (url.includes('/api/health')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'ok' }),
          });
          return;
        }
        
        // Default: return empty success for other API calls
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
    // Mock authentication state
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
    
    // Mock all other API calls
    await page.route('**/api/**', async route => {
      if (route.request().url().includes('/api/session')) {
        return; // Already handled above
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    
    await use(page);
  },
});

export const expect = baseExpect;
