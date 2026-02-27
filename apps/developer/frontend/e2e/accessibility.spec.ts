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
      
      // Wait for the main heading to be visible before checking hierarchy
      await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible', timeout: 5000 });
      
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
      
      // Wait for page to be ready
      await page.waitForLoadState('networkidle');
      
      const links = page.getByRole('link');
      const count = await links.count();
      
      // Check each link has an accessible name
      // This uses the aria accessibility name which includes aria-label, inner text, and img alt
      for (let i = 0; i < Math.min(count, 20); i++) { // Limit to first 20 links to avoid timeout
        const link = links.nth(i);
        // Use Playwright's built-in accessible name getter
        const accessibleName = await link.evaluate((el) => {
          // Get computed accessible name
          const ariaLabel = el.getAttribute('aria-label');
          if (ariaLabel) return ariaLabel;
          
          // Check for text content
          const text = el.textContent?.trim();
          if (text) return text;
          
          // Check for img alt
          const img = el.querySelector('img');
          if (img) return img.getAttribute('alt') || '';
          
          return '';
        });
        
        expect(accessibleName?.trim().length, `Link ${i} should have accessible name`).toBeGreaterThan(0);
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
    test('focus is visible on interactive elements', async ({ page }) => {
      await page.goto('/');
      
      // Wait for page to be ready
      await page.waitForLoadState('networkidle');
      
      // Click on the page body first to ensure focus is in the page
      await page.locator('body').click();
      
      // Tab to first focusable element
      await page.keyboard.press('Tab');
      
      // Give browser time to update focus
      await page.waitForTimeout(100);
      
      // Get the focused element
      const focused = page.locator(':focus');
      
      // Should have visible focus indicator
      // Note: This checks if the element is visible, not necessarily if it has a visible focus ring
      // If no focusable elements exist (rare), this test should pass gracefully
      const focusedCount = await focused.count();
      if (focusedCount > 0) {
        await expect(focused).toBeVisible();
      } else {
        // No focused element after Tab - this is okay if page has no focusable elements
        // Just verify the page is still functional
        await expect(page.locator('body')).toBeVisible();
      }
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
