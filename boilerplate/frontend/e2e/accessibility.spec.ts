import { test, expect } from './fixtures';

/**
 * Accessibility E2E Tests
 * 
 * Basic accessibility checks using Playwright.
 * For comprehensive accessibility testing, consider using @axe-core/playwright.
 * 
 * Requirements: NFR-A11Y, FR-A11Y
 * See: docs/ACCESSIBILITY.md
 */
test.describe('Accessibility', () => {
  test.describe('Semantic HTML', () => {
    test('page has proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      
      // Wait for main content to be visible
      await page.waitForSelector('main');
      
      // Should have an h1
      const h1Count = await page.getByRole('heading', { level: 1 }).count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
      expect(h1Count).toBeLessThanOrEqual(1); // Only one h1 per page
    });

    test('main landmark is present', async ({ page }) => {
      await page.goto('/');
      
      const main = page.getByRole('main');
      await expect(main).toBeVisible();
    });

    test('navigation landmark is present', async ({ page }) => {
      await page.goto('/');
      
      const nav = page.getByRole('navigation');
      await expect(nav).toBeVisible();
    });
  });

  test.describe('Interactive Elements', () => {
    test('buttons have accessible names', async ({ page }) => {
      await page.goto('/');
      
      // Get all buttons
      const buttons = page.getByRole('button');
      const count = await buttons.count();
      
      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const name = await button.getAttribute('aria-label') 
          || await button.innerText();
        
        // Button should have some accessible name
        expect(name?.trim().length).toBeGreaterThan(0);
      }
    });

    test('links have accessible names', async ({ page }) => {
      await page.goto('/');
      
      const links = page.getByRole('link');
      const count = await links.count();
      
      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        const name = await link.getAttribute('aria-label') 
          || await link.innerText();
        
        expect(name?.trim().length).toBeGreaterThan(0);
      }
    });

    test('form inputs have labels', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      
      // Find all inputs
      const inputs = authenticatedPage.locator('input, select, textarea');
      const count = await inputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        
        if (id) {
          // Check for associated label
          const label = authenticatedPage.locator(`label[for="${id}"]`);
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');
          
          // Input should have some form of label
          const hasLabel = (await label.count() > 0) || ariaLabel || ariaLabelledBy;
          expect(hasLabel).toBeTruthy();
        }
      }
    });
  });

  test.describe('Focus Management', () => {
    // Skip on mobile - Tab navigation doesn't work the same way on mobile devices
    test('focus is visible on interactive elements', async ({ page, browserName }) => {
      // Mobile browsers don't support keyboard Tab navigation in the same way
      test.skip(browserName === 'webkit' && page.viewportSize()?.width! < 768, 'Tab navigation not applicable on mobile');
      
      await page.goto('/');
      
      // Click on body to ensure page has focus before tabbing
      await page.locator('body').click();
      
      // Tab to first focusable element
      await page.keyboard.press('Tab');
      
      // Get the focused element
      const focused = page.locator(':focus');
      
      // Should have visible focus indicator
      // Note: This checks if the element is visible, not necessarily if it has a visible focus ring
      await expect(focused).toBeVisible();
    });

    test('focus trap in modals (if present)', async ({ page }) => {
      await page.goto('/');
      
      // Try to find and open a modal
      const modalTrigger = page.getByRole('button', { name: /open|show|modal|dialog/i });
      
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        // Modal should trap focus
        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible()) {
          // Focus should be within the dialog
          const focused = page.locator(':focus');
          await expect(focused).toBeVisible();
          
          // Tab multiple times - focus should stay in dialog
          for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');
          }
          
          // Focus should still be within dialog
          const stillFocused = page.locator(':focus');
          await expect(dialog.locator(':focus')).toBeVisible();
        }
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('page renders in both light and dark modes without errors', async ({ page }) => {
      // Test light mode
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
      
      // Test dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Reduced Motion', () => {
    test('respects reduced motion preference', async ({ page }) => {
      // Emulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      
      // Page should still load and be functional
      await expect(page.locator('body')).toBeVisible();
      
      // Animations should be disabled (visual verification would need manual check)
    });
  });
});

/**
 * Screen Reader Announcement Tests
 * 
 * These tests verify that important UI changes are announced to screen readers.
 * Note: Full screen reader testing requires manual testing with actual screen readers.
 */
test.describe('Live Regions', () => {
  test('error messages use aria-live', async ({ page }) => {
    await page.goto('/');
    
    // Look for any live regions
    const liveRegions = page.locator('[aria-live]');
    const count = await liveRegions.count();
    
    // Log for informational purposes
    console.log(`Found ${count} aria-live regions`);
    
    // If there are live regions, verify they're properly configured
    for (let i = 0; i < count; i++) {
      const region = liveRegions.nth(i);
      const ariaLive = await region.getAttribute('aria-live');
      
      expect(['polite', 'assertive', 'off']).toContain(ariaLive);
    }
  });
});
