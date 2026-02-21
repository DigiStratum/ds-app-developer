# End-to-End Testing Guide

> Comprehensive E2E testing patterns for DS App Developer using Playwright.
> E2E tests validate user journeys and integration between frontend and backend.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Test Organization](#test-organization)
- [Authentication in E2E Tests](#authentication-in-e2e-tests)
- [Writing E2E Tests](#writing-e2e-tests)
- [Page Object Model](#page-object-model)
- [API Mocking](#api-mocking)
- [CI/CD Integration](#cicd-integration)
- [Debugging Tests](#debugging-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Why Playwright?

DS App Developer uses [Playwright](https://playwright.dev/) for E2E testing because:

- **Cross-browser testing** - Test on Chromium, Firefox, WebKit
- **Auto-wait** - Built-in waiting for elements, reducing flaky tests
- **Tracing & screenshots** - Excellent debugging artifacts
- **API mocking** - Route interception for isolated tests
- **TypeScript-first** - Full type safety
- **Fast execution** - Parallel tests, browser reuse

### Test Pyramid Position

```
        /\
       /  \       Manual Testing
      /    \      (Exploratory)
     /------\
    /        \    E2E Tests ← You are here
   /    UI    \   (Critical user journeys)
  /------------\
 /              \ Integration Tests
/    Unit Tests  \ (Component + API tests)
------------------
```

E2E tests are expensive to run but provide high confidence. Focus on:
- Critical user journeys (login, core features)
- Integration between frontend and backend
- Cross-browser compatibility
- Accessibility basics

### Requirements Traceability

| Requirement | Test File | Coverage |
|-------------|-----------|----------|
| FR-AUTH-001 | `e2e/auth.spec.ts` | ✅ |
| FR-AUTH-002 | `e2e/auth.spec.ts` | ✅ |
| FR-AUTH-003 | `e2e/auth.spec.ts` | ✅ |
| FR-AUTH-004 | `e2e/auth.spec.ts` | ✅ |
| FR-NAV | `e2e/navigation.spec.ts` | ✅ |
| NFR-A11Y | `e2e/accessibility.spec.ts` | ✅ |
| FR-I18N | `e2e/theme-i18n.spec.ts` | ✅ |

---

## Quick Start

### Prerequisites

```bash
cd frontend

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Running Tests

```bash
# Run all E2E tests
npm run e2e

# Run with UI mode (interactive)
npm run e2e:ui

# Run specific test file
npm run e2e -- e2e/auth.spec.ts

# Run tests matching a pattern
npm run e2e -- --grep "authentication"

# Run in debug mode (with inspector)
npm run e2e:debug

# View last test report
npm run e2e:report
```

### Generate Tests with Codegen

Playwright can record your actions and generate tests:

```bash
npm run e2e:codegen
```

---

## Test Organization

### Directory Structure

```
frontend/
├── e2e/                          # E2E test directory
│   ├── fixtures/                 # Test fixtures and utilities
│   │   ├── index.ts             # Re-exports all fixtures
│   │   ├── auth.fixture.ts      # Authentication helpers
│   │   └── page-objects.ts      # Page Object Models
│   ├── auth.spec.ts             # Authentication tests
│   ├── navigation.spec.ts       # Navigation tests
│   ├── theme-i18n.spec.ts       # Theme and i18n tests
│   ├── accessibility.spec.ts    # Accessibility tests
│   └── api-integration.spec.ts  # API integration tests
├── playwright.config.ts          # Playwright configuration
├── playwright-report/            # HTML test reports (gitignored)
└── test-results/                 # Test artifacts (gitignored)
```

### File Naming Convention

| Pattern | Purpose | Example |
|---------|---------|---------|
| `*.spec.ts` | Test specifications | `auth.spec.ts` |
| `*.fixture.ts` | Test fixtures | `auth.fixture.ts` |
| `*.po.ts` | Page Objects (optional) | `dashboard.po.ts` |

---

## Authentication in E2E Tests

### The Challenge

DS App Developer uses DSAccount SSO for authentication (see [AUTH.md](./AUTH.md)). In E2E tests, we can't:
- Test against real DSAccount (external dependency)
- Perform actual OAuth flows (slow, flaky)
- Share credentials across tests

### The Solution: Mock Authentication

We bypass the real SSO flow by directly injecting session cookies:

```typescript
import { test, expect, TEST_USERS } from './fixtures';

// Option 1: Use the pre-authenticated fixture
test('dashboard loads for authenticated user', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  // User is already authenticated
});

// Option 2: Authenticate manually with any user
test('multi-tenant user access', async ({ page, mockAuth }) => {
  await mockAuth(TEST_USERS.multiTenant);
  await page.goto('/dashboard');
});

// Option 3: Test unauthenticated behavior
test('login prompt shown', async ({ page }) => {
  // No authentication - test redirect behavior
  await page.goto('/dashboard');
});
```

### Test Users

Pre-defined test users in `e2e/fixtures/auth.fixture.ts`:

```typescript
export const TEST_USERS = {
  standard: {
    id: 'user-e2e-001',
    email: 'e2e-test@digistratum.com',
    name: 'E2E Test User',
    tenants: ['tenant-test-001'],
  },
  multiTenant: {
    id: 'user-e2e-002',
    email: 'multi-tenant@digistratum.com',
    name: 'Multi-Tenant User',
    tenants: ['tenant-test-001', 'tenant-test-002'],
  },
  noTenant: {
    id: 'user-e2e-003',
    email: 'personal@digistratum.com',
    name: 'Personal User',
    tenants: [],
  },
};
```

### How Mock Auth Works

```typescript
// The mockAuth function:
// 1. Creates a mock session token (base64-encoded JSON)
// 2. Injects it as the ds_session cookie
// 3. Sets localStorage for tenant context

await context.addCookies([{
  name: 'ds_session',
  value: mockSessionToken,
  domain: 'localhost',
  path: '/',
  httpOnly: true,
  secure: false,  // false for localhost
  sameSite: 'Lax',
}]);
```

### Testing Real Auth Flow (Manual)

For testing the actual SSO integration, use:
- Staging DSAccount instance
- Dedicated test accounts
- Manual or semi-automated testing

---

## Writing E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from './fixtures';

test.describe('Feature Name', () => {
  // Setup runs before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange - already done in beforeEach

    // Act
    await page.click('button');

    // Assert
    await expect(page).toHaveURL('/new-page');
  });
});
```

### Locator Best Practices

Use accessible locators (priority order):

```typescript
// ✅ Best - Accessible role + name
page.getByRole('button', { name: /submit/i })

// ✅ Good - Label text (for form inputs)
page.getByLabel(/email address/i)

// ✅ Good - Placeholder (when no label)
page.getByPlaceholder(/search/i)

// ⚠️ Acceptable - Text content
page.getByText(/welcome/i)

// ⚠️ Acceptable - Test ID (last resort)
page.getByTestId('submit-button')

// ❌ Avoid - CSS selectors
page.locator('.btn-primary')
```

### Waiting Patterns

Playwright auto-waits for elements, but sometimes you need explicit waits:

```typescript
// Wait for navigation
await expect(page).toHaveURL(/dashboard/);

// Wait for element to appear
await expect(page.getByRole('alert')).toBeVisible();

// Wait for element to disappear
await expect(page.getByText(/loading/i)).not.toBeVisible();

// Wait for network idle
await page.waitForLoadState('networkidle');

// Custom wait condition
await page.waitForFunction(() => {
  return document.querySelector('.data-loaded') !== null;
});
```

### Assertions

```typescript
// Visibility
await expect(element).toBeVisible();
await expect(element).not.toBeVisible();
await expect(element).toBeHidden();

// Text content
await expect(element).toHaveText('Exact text');
await expect(element).toContainText('partial');

// Attributes
await expect(element).toHaveAttribute('disabled');
await expect(element).toHaveClass(/active/);

// URL
await expect(page).toHaveURL(/dashboard/);
await expect(page).toHaveTitle(/Home/);

// Count
await expect(page.getByRole('listitem')).toHaveCount(5);
```

---

## Page Object Model

For complex pages, use Page Objects to encapsulate selectors and actions:

### Creating a Page Object

```typescript
// e2e/fixtures/page-objects.ts
export class DashboardPO {
  constructor(private page: Page) {}

  // Locators
  get heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  get statsCards() {
    return this.page.getByRole('region', { name: /statistics/i });
  }

  // Actions
  async refreshData() {
    await this.page.getByRole('button', { name: /refresh/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  // Assertions
  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }
}
```

### Using Page Objects

```typescript
import { test, expect, createPageObjects } from './fixtures';

test('dashboard shows statistics', async ({ authenticatedPage }) => {
  const { dashboard } = createPageObjects(authenticatedPage);
  
  await authenticatedPage.goto('/dashboard');
  await dashboard.expectLoaded();
  
  await dashboard.refreshData();
  await expect(dashboard.statsCards).toBeVisible();
});
```

---

## API Mocking

### Route Interception

Mock API responses without a running backend:

```typescript
import { mockApiResponse } from './fixtures';

test('shows user data', async ({ authenticatedPage }) => {
  // Mock the /api/me endpoint
  await mockApiResponse(authenticatedPage, '**/api/me', {
    body: {
      id: 'user-123',
      email: 'test@example.com',
    },
  });

  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.getByText('test@example.com')).toBeVisible();
});
```

### Error Scenarios

```typescript
test('handles 500 error gracefully', async ({ authenticatedPage }) => {
  await mockApiResponse(authenticatedPage, '**/api/me', {
    status: 500,
    body: { error: 'Internal Server Error' },
  });

  await authenticatedPage.goto('/dashboard');
  
  // Should show error UI, not crash
  await expect(authenticatedPage.getByText(/error|try again/i)).toBeVisible();
});
```

### Delayed Responses

Test loading states:

```typescript
test('shows loading indicator', async ({ authenticatedPage }) => {
  await authenticatedPage.route('**/api/**', async (route) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await route.continue();
  });

  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.getByRole('progressbar')).toBeVisible();
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

E2E tests run in `.github/workflows/e2e.yml`:

```yaml
- name: Run E2E tests
  run: npm run e2e:ci
  env:
    CI: true
    E2E_BASE_URL: http://localhost:4173
```

### Artifacts

On failure, CI uploads:
- **playwright-report/** - HTML report with traces
- **test-results/** - Screenshots and videos

### Viewing CI Artifacts

1. Go to the failed workflow run
2. Download the `playwright-report` artifact
3. Unzip and open `index.html`

### Local CI Simulation

```bash
# Run exactly as CI does
CI=true npm run e2e:ci

# Run with preview server (built output)
npm run build
npx playwright test --config=playwright.config.ts
```

---

## Debugging Tests

### UI Mode

Interactive mode for exploring and debugging:

```bash
npm run e2e:ui
```

Features:
- Watch mode (re-runs on file change)
- Step through test execution
- Inspect DOM at each step
- Time-travel debugging

### Debug Mode

```bash
npm run e2e:debug
```

Opens the Playwright Inspector:
- Set breakpoints
- Step through actions
- Inspect selectors
- Evaluate expressions

### Traces

Enable traces for failed tests in `playwright.config.ts`:

```typescript
use: {
  trace: 'on-first-retry',
},
```

View traces:
```bash
npx playwright show-trace test-results/trace.zip
```

### Screenshots

```typescript
// Take screenshot manually
await page.screenshot({ path: 'debug.png' });

// Full page screenshot
await page.screenshot({ path: 'full.png', fullPage: true });
```

---

## Best Practices

### Test Isolation

Each test should be independent:

```typescript
// ✅ Good - each test sets up its own state
test('shows empty state', async ({ page }) => {
  await mockApiResponse(page, '**/api/items', { body: [] });
  await page.goto('/items');
  await expect(page.getByText(/no items/i)).toBeVisible();
});

// ❌ Bad - depends on previous test
test('shows items after create', async ({ page }) => {
  // This assumes previous test created an item
});
```

### Avoid Flaky Tests

```typescript
// ❌ Bad - arbitrary wait
await page.waitForTimeout(2000);

// ✅ Good - wait for specific condition
await expect(page.getByText(/loaded/i)).toBeVisible();
```

### Use Descriptive Test Names

```typescript
// ✅ Good
test('unauthenticated users see login prompt on protected routes', async () => {});

// ❌ Bad
test('test1', async () => {});
```

### Keep Tests Focused

```typescript
// ✅ Good - one assertion per behavior
test('displays username after login', async () => {});
test('shows logout button when authenticated', async () => {});

// ❌ Bad - testing multiple unrelated things
test('login flow', async () => {
  // Tests login, then profile, then logout, then...
});
```

---

## Troubleshooting

### Common Issues

#### Tests Pass Locally but Fail in CI

1. **Viewport differences** - CI may use different default size
   ```typescript
   test.use({ viewport: { width: 1280, height: 720 } });
   ```

2. **Timing issues** - CI is slower; increase timeouts
   ```typescript
   test.setTimeout(60000);
   ```

3. **Missing browser** - Ensure CI installs browsers
   ```bash
   npx playwright install --with-deps chromium
   ```

#### Element Not Found

1. **Check selector** - Use UI mode to verify
2. **Wait for visibility** - Element might be hidden initially
3. **Check viewport** - Element might be off-screen

#### Flaky Tests

1. **Add explicit waits** for async operations
2. **Mock network requests** for deterministic behavior
3. **Use `test.slow()`** for known slow tests

### Getting Help

1. Check [Playwright docs](https://playwright.dev/docs/intro)
2. Use `npx playwright codegen` to generate selectors
3. Run with `--debug` flag for step-by-step execution

---

## Appendix: Available Scripts

| Script | Description |
|--------|-------------|
| `npm run e2e` | Run all E2E tests |
| `npm run e2e:ui` | Run in interactive UI mode |
| `npm run e2e:debug` | Run with Playwright Inspector |
| `npm run e2e:report` | Open last HTML report |
| `npm run e2e:codegen` | Generate tests by recording |
| `npm run e2e:ci` | Run in CI mode (headless, JUnit output) |

---

*See also: [TESTING.md](./TESTING.md) for unit/integration testing patterns*

*Last updated: 2026-02-19*
