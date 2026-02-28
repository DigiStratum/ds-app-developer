import { test, expect } from '@playwright/test';

/**
 * SSO Deploy Verification Tests
 * 
 * These tests verify the app's SSO integration is correctly deployed.
 * They run against REAL DSAccount (not mocked) to catch:
 * - Missing/wrong DSACCOUNT_URL config
 * - App not registered in DSAccount
 * - Redirect URI mismatch
 * - Redirect loops
 * 
 * These tests should run on EVERY deploy as a gate.
 * They don't require user credentials - just verify the plumbing works.
 */

// These should be set by the deploy workflow
const APP_URL = process.env.E2E_APP_URL || process.env.VITE_APP_URL || 'http://localhost:5173';
const DSACCOUNT_URL = process.env.DSACCOUNT_URL || 'https://account.digistratum.com';
const APP_ID = process.env.DSACCOUNT_APP_ID || process.env.APP_ID;

test.describe('SSO Deploy Verification', () => {
  test.describe('SSO Configuration', () => {
    test('app has SSO login button/link', async ({ page }) => {
      await page.goto(APP_URL);
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for JS to hydrate
      await page.waitForTimeout(2000);
      
      const signInButton = page.locator('text=/sign in|login|sso/i').first()
        .or(page.getByRole('button', { name: /sign in|login/i }))
        .or(page.getByRole('link', { name: /sign in|login/i }));
      
      await expect(
        signInButton,
        'No login button found. App should have a way to initiate SSO.'
      ).toBeVisible({ timeout: 10000 });
    });

    test('login button initiates SSO redirect to correct DSAccount', async ({ page }) => {
      await page.goto(APP_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Track where we're redirected
      let ssoRedirectUrl: string | null = null;
      
      page.on('request', request => {
        const url = request.url();
        if (url.includes('account.digistratum.com') && url.includes('sso')) {
          ssoRedirectUrl = url;
        }
      });
      
      // Find and click login
      const signInButton = page.locator('text=/sign in|login/i').first();
      if (await signInButton.isVisible()) {
        await signInButton.click();
        await page.waitForTimeout(3000);
      }
      
      // Should have attempted to redirect to DSAccount SSO
      const currentUrl = page.url();
      const redirectedToSSO = currentUrl.includes('account.digistratum.com');
      
      expect(
        redirectedToSSO || ssoRedirectUrl !== null,
        `Login button should redirect to DSAccount SSO. ` +
        `Current URL: ${currentUrl}. Check DSACCOUNT_URL env var.`
      ).toBeTruthy();
    });
  });

  test.describe('DSAccount Reachability', () => {
    test('DSAccount SSO endpoint is reachable from app context', async ({ page }) => {
      // This verifies no network/CORS issues between app and DSAccount
      const response = await page.request.get(`${DSACCOUNT_URL}/api/health`);
      
      expect(
        response.ok(),
        `Cannot reach DSAccount at ${DSACCOUNT_URL}. ` +
        `Status: ${response.status()}. Check DSACCOUNT_URL config.`
      ).toBeTruthy();
    });

    test('app is registered in DSAccount', async ({ page }) => {
      // Skip if we don't know the app_id
      test.skip(!APP_ID, 'APP_ID not set - cannot verify registration');
      
      // Try to authorize with our app_id
      const response = await page.request.get(
        `${DSACCOUNT_URL}/api/sso/authorize?app_id=${APP_ID}&state=test`,
        { maxRedirects: 0 }  // Don't follow redirects
      );
      
      // Should get 302 redirect to login (app exists) or 200 (already logged in)
      // Should NOT get 400 (app not found) or 500 (server error)
      expect(
        response.status(),
        `App "${APP_ID}" may not be registered in DSAccount. ` +
        `Got ${response.status()}. Expected 302 redirect to login.`
      ).toBeLessThan(400);
    });
  });

  test.describe('Redirect Loop Prevention', () => {
    test('SSO flow completes without redirect loop', async ({ page }) => {
      const visitedUrls: string[] = [];
      const MAX_REDIRECTS = 6;
      
      page.on('framenavigated', frame => {
        if (frame === page.mainFrame()) {
          visitedUrls.push(frame.url());
        }
      });
      
      // Start at app, trigger login
      await page.goto(APP_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const signInButton = page.locator('text=/sign in|login/i').first();
      if (await signInButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await signInButton.click();
        
        // Wait for flow to settle (will end at DSAccount login page)
        await page.waitForTimeout(5000);
      }
      
      expect(
        visitedUrls.length,
        `Potential redirect loop detected! Visited ${visitedUrls.length} URLs. ` +
        `Chain: ${visitedUrls.slice(0, 10).join(' → ')}... ` +
        `Check app_id registration and redirect_uri config.`
      ).toBeLessThanOrEqual(MAX_REDIRECTS);
      
      // Check for duplicate URLs (definite loop)
      const urlCounts: Record<string, number> = {};
      for (const url of visitedUrls) {
        const normalized = url.split('?')[0]; // Ignore query params
        urlCounts[normalized] = (urlCounts[normalized] || 0) + 1;
      }
      
      const duplicates = Object.entries(urlCounts)
        .filter(([_, count]) => count > 2)
        .map(([url, count]) => `${url} (${count}x)`);
      
      expect(
        duplicates.length,
        `Redirect loop detected! URLs visited multiple times: ${duplicates.join(', ')}`
      ).toBe(0);
    });
  });

  test.describe('Backend Auth Endpoints', () => {
    test('app has /api/auth/login endpoint', async ({ page }) => {
      const response = await page.request.get(`${APP_URL}/api/auth/login`, {
        maxRedirects: 0
      });
      
      // Should redirect (302) or return 200 - not 404 or 500
      expect(
        response.status(),
        `App missing /api/auth/login endpoint (got ${response.status()}). ` +
        `This endpoint should redirect to DSAccount SSO.`
      ).toBeLessThan(500);
      
      expect(
        response.status(),
        `App /api/auth/login returned 404. Auth routes not configured.`
      ).not.toBe(404);
    });

    test('app has /api/auth/sso/callback endpoint', async ({ page }) => {
      // Just verify the endpoint exists (will error without proper params)
      const response = await page.request.get(`${APP_URL}/api/auth/sso/callback`, {
        maxRedirects: 0
      });
      
      // 400 is ok (missing params), 404/500 is bad
      expect(
        response.status(),
        `App missing /api/auth/sso/callback endpoint (got ${response.status()}). ` +
        `DSAccount won't be able to redirect back.`
      ).toBeLessThan(500);
      
      expect(
        response.status(),
        `App /api/auth/sso/callback returned 404. Callback route not configured.`
      ).not.toBe(404);
    });

    test('login endpoint redirects to correct DSAccount URL', async ({ page }) => {
      const response = await page.request.get(`${APP_URL}/api/auth/login`, {
        maxRedirects: 0
      });
      
      if (response.status() === 302 || response.status() === 301) {
        const location = response.headers()['location'] || '';
        
        expect(
          location,
          `Login redirect missing Location header. Got status ${response.status()}.`
        ).toBeTruthy();
        
        expect(
          location.includes('account.digistratum.com'),
          `Login redirects to wrong SSO provider: ${location}. ` +
          `Should redirect to account.digistratum.com`
        ).toBeTruthy();
        
        expect(
          location.includes('app_id=') || location.includes('client_id='),
          `Login redirect missing app_id parameter: ${location}`
        ).toBeTruthy();
      }
    });
  });
});
