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
 * NOTE: These tests should only run AFTER deployment.
 * In CI, skip unless E2E_APP_URL is set to the deployed URL.
 */

// These should be set by the deploy workflow
const APP_URL = process.env.E2E_APP_URL || process.env.VITE_APP_URL || 'http://localhost:5173';
const DSACCOUNT_URL = process.env.DSACCOUNT_URL || 'https://account.digistratum.com';
const APP_ID = process.env.DSACCOUNT_APP_ID || process.env.APP_ID;

// Skip these tests in CI unless E2E_APP_URL is explicitly set (post-deploy verification)
const isPreDeployCI = process.env.CI && !process.env.E2E_APP_URL;

test.describe('SSO Deploy Verification', () => {
  test.skip(() => isPreDeployCI, 'Skipped in CI pre-deploy. Set E2E_APP_URL for post-deploy verification.');

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
      
      let ssoRedirectUrl: string | null = null;
      
      page.on('request', request => {
        const url = request.url();
        if (url.includes('account.digistratum.com') && url.includes('sso')) {
          ssoRedirectUrl = url;
        }
      });
      
      const signInButton = page.locator('text=/sign in|login/i').first();
      if (await signInButton.isVisible()) {
        await signInButton.click();
        await page.waitForTimeout(3000);
      }
      
      const currentUrl = page.url();
      const redirectedToSSO = currentUrl.includes('account.digistratum.com');
      
      expect(
        redirectedToSSO || ssoRedirectUrl !== null,
        `Login button should redirect to DSAccount SSO. Current URL: ${currentUrl}`
      ).toBeTruthy();
    });
  });

  test.describe('DSAccount Reachability', () => {
    test('DSAccount SSO endpoint is reachable from app context', async ({ page }) => {
      const response = await page.request.get(`${DSACCOUNT_URL}/api/health`);
      
      expect(
        response.ok(),
        `Cannot reach DSAccount at ${DSACCOUNT_URL}. Status: ${response.status()}.`
      ).toBeTruthy();
    });

    test('app is registered in DSAccount', async ({ page }) => {
      test.skip(!APP_ID, 'APP_ID not set - cannot verify registration');
      
      const response = await page.request.get(
        `${DSACCOUNT_URL}/api/sso/authorize?app_id=${APP_ID}&state=test`,
        { maxRedirects: 0 }
      );
      
      expect(
        response.status(),
        `App "${APP_ID}" may not be registered. Got ${response.status()}.`
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
      
      await page.goto(APP_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const signInButton = page.locator('text=/sign in|login/i').first();
      if (await signInButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await signInButton.click();
        await page.waitForTimeout(5000);
      }
      
      expect(
        visitedUrls.length,
        `Potential redirect loop! Visited ${visitedUrls.length} URLs.`
      ).toBeLessThanOrEqual(MAX_REDIRECTS);
    });
  });

  test.describe('Backend Auth Endpoints', () => {
    test('app has /api/auth/login endpoint', async ({ page }) => {
      const response = await page.request.get(`${APP_URL}/api/auth/login`, {
        maxRedirects: 0
      });
      
      expect(response.status()).toBeLessThan(500);
      expect(response.status()).not.toBe(404);
    });

    test('app has /api/auth/sso/callback endpoint', async ({ page }) => {
      const response = await page.request.get(`${APP_URL}/api/auth/sso/callback`, {
        maxRedirects: 0
      });
      
      expect(response.status()).toBeLessThan(500);
      expect(response.status()).not.toBe(404);
    });
  });
});
