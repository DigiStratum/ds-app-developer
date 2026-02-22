import { test as baseTest, expect } from '@playwright/test';
import { test as authTest, TEST_USERS } from './auth.fixture';

/**
 * Page Object Models for E2E Tests
 * 
 * POM pattern encapsulates page-specific selectors and actions,
 * making tests more readable and maintainable.
 */

export { expect } from '@playwright/test';
export { test, TEST_USERS } from './auth.fixture';

/**
 * Navigation Page Object
 * 
 * Encapsulates DSNav component interactions
 */
export class NavigationPO {
  constructor(private page: Awaited<ReturnType<typeof baseTest['page']>>) {}

  // Locators
  get nav() {
    return this.page.getByRole('navigation');
  }

  get menuButton() {
    return this.page.getByRole('button', { name: /menu/i });
  }

  get userMenu() {
    return this.page.getByRole('button', { name: /user menu/i });
  }

  get themeToggle() {
    return this.page.getByRole('button', { name: /toggle theme/i });
  }

  get tenantSelector() {
    return this.page.getByRole('combobox', { name: /tenant/i });
  }

  // Actions
  async openMobileMenu() {
    await this.menuButton.click();
    await this.page.waitForSelector('[data-testid="mobile-menu"]', { state: 'visible' });
  }

  async closeMobileMenu() {
    // Click outside or press Escape
    await this.page.keyboard.press('Escape');
  }

  async openUserMenu() {
    await this.userMenu.click();
  }

  async toggleTheme() {
    await this.themeToggle.click();
  }

  async selectTenant(tenantName: string) {
    await this.tenantSelector.click();
    await this.page.getByRole('option', { name: tenantName }).click();
  }

  async logout() {
    await this.openUserMenu();
    await this.page.getByRole('menuitem', { name: /logout/i }).click();
  }

  async navigateTo(linkName: string) {
    await this.page.getByRole('link', { name: new RegExp(linkName, 'i') }).click();
  }
}

/**
 * Dashboard Page Object
 */
export class DashboardPO {
  constructor(private page: Awaited<ReturnType<typeof baseTest['page']>>) {}

  // Locators
  get heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  get welcomeMessage() {
    return this.page.getByText(/welcome/i);
  }

  get statsSection() {
    return this.page.getByRole('region', { name: /statistics/i });
  }

  // Assertions
  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.welcomeMessage).toBeVisible();
  }
}

/**
 * Home Page Object
 */
export class HomePO {
  constructor(private page: Awaited<ReturnType<typeof baseTest['page']>>) {}

  // Locators
  get heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  get loginButton() {
    return this.page.getByRole('button', { name: /login/i });
  }

  get dashboardLink() {
    return this.page.getByRole('link', { name: /dashboard/i });
  }

  // Actions
  async login() {
    await this.loginButton.click();
  }

  async goToDashboard() {
    await this.dashboardLink.click();
  }
}

/**
 * Auth Page Object - for login/unauthorized states
 */
export class AuthPO {
  constructor(private page: Awaited<ReturnType<typeof baseTest['page']>>) {}

  // Locators
  get loginPrompt() {
    return this.page.getByText(/authentication required|please log in|sign in/i);
  }

  get loginButton() {
    return this.page.getByRole('button', { name: /login|sign in/i });
  }

  get loadingSpinner() {
    return this.page.getByTestId('auth-loading');
  }

  // Assertions
  async expectUnauthenticated() {
    await expect(this.loginButton).toBeVisible();
  }

  async expectLoading() {
    await expect(this.loadingSpinner).toBeVisible();
  }

  async expectNotLoading() {
    await expect(this.loadingSpinner).not.toBeVisible();
  }
}

/**
 * Create all page objects for a test
 */
export function createPageObjects(page: Awaited<ReturnType<typeof baseTest['page']>>) {
  return {
    navigation: new NavigationPO(page),
    dashboard: new DashboardPO(page),
    home: new HomePO(page),
    auth: new AuthPO(page),
  };
}

/**
 * Test fixture with page objects
 */
export const testWithPO = authTest.extend<{
  po: ReturnType<typeof createPageObjects>;
}>({
  po: async ({ page }, use) => {
    await use(createPageObjects(page));
  },
});
