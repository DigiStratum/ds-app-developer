import { test as base } from '@playwright/test';

/**
 * Extended test fixture that mocks API calls in CI
 * Prevents ECONNREFUSED errors when backend is not running
 */
export const test = base.extend({
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
});

export { expect } from '@playwright/test';
