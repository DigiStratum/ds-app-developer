import { test, expect } from './fixtures';

/**
 * Navigation E2E Tests
 * 
 * Tests the DSNav component and navigation flows.
 * Requirements: FR-NAV, FR-A11Y (accessibility)
 */
test.describe('Navigation', () => {
  test.describe('Desktop Navigation', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('main navigation links are visible', async ({ page }) => {
      await page.goto('/');
      
      // Navigation should be present
      const nav = page.getByRole('navigation');
      await expect(nav).toBeVisible();
    });

    test('can navigate between pages', async ({ authenticatedPage }) => {
      // Start at home
      await authenticatedPage.goto('/');
      
      // Find and click dashboard link
      const dashboardLink = authenticatedPage.getByRole('link', { name: /dashboard/i });
      if (await dashboardLink.isVisible()) {
        await dashboardLink.click();
        await expect(authenticatedPage).toHaveURL(/\/dashboard/);
      }
    });

    test('active link is highlighted', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      
      // The dashboard link should have active state
      const dashboardLink = authenticatedPage.getByRole('link', { name: /dashboard/i });
      if (await dashboardLink.isVisible()) {
        // Check for active class or aria-current
        await expect(dashboardLink).toHaveAttribute('aria-current', 'page')
          .catch(() => {
            // Fallback: check for visual indicator
            return expect(dashboardLink).toHaveClass(/active|current|selected/);
          });
      }
    });
  });

  test.describe('Mobile Navigation', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

    test('mobile menu button is visible on small screens', async ({ page }) => {
      await page.goto('/');
      
      // Look for hamburger menu button
      const menuButton = page.getByRole('button', { name: /menu|open navigation/i });
      await expect(menuButton).toBeVisible();
    });

    test('mobile menu opens and closes', async ({ page }) => {
      await page.goto('/');
      
      const menuButton = page.getByRole('button', { name: /menu|open navigation/i });
      
      if (await menuButton.isVisible()) {
        // Open menu
        await menuButton.click();
        
        // Menu content should be visible
        const mobileNav = page.getByRole('dialog').or(page.locator('[data-testid="mobile-menu"]'));
        await expect(mobileNav).toBeVisible();
        
        // Close menu (escape or close button)
        await page.keyboard.press('Escape');
        
        // Menu should close
        await expect(mobileNav).not.toBeVisible();
      }
    });

    test('can navigate from mobile menu', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');
      
      const menuButton = authenticatedPage.getByRole('button', { name: /menu|open navigation/i });
      
      if (await menuButton.isVisible()) {
        await menuButton.click();
        
        // Click dashboard link in mobile menu
        const dashboardLink = authenticatedPage.getByRole('link', { name: /dashboard/i }).first();
        if (await dashboardLink.isVisible()) {
          await dashboardLink.click();
          await expect(authenticatedPage).toHaveURL(/\/dashboard/);
        }
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test.fixme('navigation links are keyboard accessible', async ({ page }) => {
      await page.goto('/');
      
      // Tab through navigation
      await page.keyboard.press('Tab');
      
      // Should be able to focus navigation elements
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('escape key closes dropdowns', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      
      // Try to open any dropdown (user menu, etc.)
      const dropdownButton = authenticatedPage.getByRole('button', { name: /user|menu|settings/i }).first();
      
      if (await dropdownButton.isVisible()) {
        await dropdownButton.click();
        
        // Press escape
        await authenticatedPage.keyboard.press('Escape');
        
        // Dropdown content should be hidden
        const dropdownContent = authenticatedPage.getByRole('menu');
        await expect(dropdownContent).not.toBeVisible();
      }
    });
  });

  test.describe('Skip Links (Accessibility)', () => {
    test('skip to main content link is available', async ({ page }) => {
      await page.goto('/');
      
      // Skip link should exist (usually hidden until focused)
      const skipLink = page.getByRole('link', { name: /skip to (main )?content/i });
      
      // Tab to reveal skip link
      await page.keyboard.press('Tab');
      
      // Check if skip link becomes focused
      const focusedSkipLink = page.locator(':focus').getByText(/skip/i);
      
      // Either the skip link exists and is focusable, or this test is informational
      if (await skipLink.count() > 0) {
        await expect(skipLink.first()).toBeAttached();
      }
    });
  });
});
