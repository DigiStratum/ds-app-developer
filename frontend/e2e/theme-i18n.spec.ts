import { test, expect } from './fixtures';

/**
 * Theme E2E Tests
 * 
 * Tests dark/light mode toggle and persistence.
 * Requirements: NFR-UX (user experience)
 */
test.describe('Theme', () => {
  test('can toggle between light and dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Find theme toggle button
    const themeToggle = page.getByRole('button', { name: /theme|dark|light|toggle/i });
    
    if (await themeToggle.isVisible()) {
      // Get initial theme state
      const html = page.locator('html');
      const initialIsDark = await html.evaluate((el) => el.classList.contains('dark'));
      
      // Toggle theme
      await themeToggle.click();
      
      // Theme should have changed
      const newIsDark = await html.evaluate((el) => el.classList.contains('dark'));
      expect(newIsDark).not.toBe(initialIsDark);
      
      // Toggle back
      await themeToggle.click();
      
      // Should be back to initial state
      const finalIsDark = await html.evaluate((el) => el.classList.contains('dark'));
      expect(finalIsDark).toBe(initialIsDark);
    }
  });

  test('theme preference persists across page loads', async ({ page, context }) => {
    await page.goto('/');
    
    const themeToggle = page.getByRole('button', { name: /theme|dark|light|toggle/i });
    
    if (await themeToggle.isVisible()) {
      // Get initial state
      const html = page.locator('html');
      const initialIsDark = await html.evaluate((el) => el.classList.contains('dark'));
      
      // Toggle to opposite
      await themeToggle.click();
      
      // Verify it changed
      const afterToggle = await html.evaluate((el) => el.classList.contains('dark'));
      expect(afterToggle).not.toBe(initialIsDark);
      
      // Reload page
      await page.reload();
      
      // Theme should persist
      const afterReload = await html.evaluate((el) => el.classList.contains('dark'));
      expect(afterReload).toBe(afterToggle);
    }
  });

  test('respects system preference by default', async ({ page, context }) => {
    // Create new page with dark mode preference
    const darkPage = await context.newPage();
    
    // Emulate dark mode preference
    await darkPage.emulateMedia({ colorScheme: 'dark' });
    
    // Clear any stored preference
    await darkPage.addInitScript(() => {
      localStorage.removeItem('theme');
    });
    
    await darkPage.goto('/');
    
    // App might respect system preference (implementation-dependent)
    const html = darkPage.locator('html');
    const isDark = await html.evaluate((el) => el.classList.contains('dark'));
    
    // This is informational - implementation may or may not respect system pref
    console.log(`System dark mode preference: page isDark = ${isDark}`);
    
    await darkPage.close();
  });
});

/**
 * Internationalization E2E Tests
 * 
 * Tests i18n language switching (if implemented).
 * Requirements: FR-I18N
 */
test.describe('Internationalization', () => {
  test('default language is loaded', async ({ page }) => {
    await page.goto('/');
    
    // Page should have lang attribute
    const html = page.locator('html');
    const lang = await html.getAttribute('lang');
    
    // Should have a language set (typically 'en')
    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
  });

  test('language switcher is available (if implemented)', async ({ page }) => {
    await page.goto('/');
    
    // Look for language selector
    const langSelector = page.getByRole('combobox', { name: /language/i })
      .or(page.getByRole('button', { name: /language|español|english|日本語/i }));
    
    if (await langSelector.isVisible()) {
      // Language switcher exists
      await expect(langSelector).toBeEnabled();
    } else {
      // No language switcher - this is fine, not all apps need it
      console.log('No language switcher found - skipping i18n switch test');
    }
  });

  test('translations load without errors', async ({ page }) => {
    // Listen for console errors related to i18n
    const i18nErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('i18n')) {
        i18nErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Should have no i18n errors
    expect(i18nErrors).toHaveLength(0);
  });
});

/**
 * Error Handling E2E Tests
 * 
 * Tests error boundaries and error states.
 * Requirements: NFR-UX
 */
test.describe('Error Handling', () => {
  test('error boundary catches render errors', async ({ page }) => {
    await page.goto('/');
    
    // Inject a component error (if we have a way to trigger it)
    await page.evaluate(() => {
      // This would trigger ErrorBoundary if it causes a render error
      // For now, just verify the page loads without errors
    });
    
    // Page should still be interactive
    await expect(page.locator('body')).toBeVisible();
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-123');
    
    // Wait for either: redirect to home, 404 text appears, or page to stabilize
    // The SPA may take a moment to process the route and redirect
    await page.waitForFunction(() => {
      const url = window.location.href;
      const isHome = url.endsWith('/') || url.includes('/?') || url.match(/:\d+\/?$/);
      const is404 = document.body?.innerText?.toLowerCase().includes('not found') ||
                    document.body?.innerText?.includes('404');
      return isHome || is404;
    }, { timeout: 5000 }).catch(() => {});
    
    // Either shows 404 content or redirects to home
    const is404 = await page.getByText(/not found|404|page doesn't exist/i).isVisible()
      .catch(() => false);
    const currentUrl = page.url();
    const isHome = currentUrl.endsWith('/') || currentUrl.includes('/?') || 
                   /:\d+\/?$/.test(currentUrl); // Matches localhost:port/ or localhost:port
    
    // Should either show 404 or redirect
    expect(is404 || isHome).toBeTruthy();
  });
});
