# ds-testing-ts

Reusable TypeScript testing utilities for DigiStratum services.

## Installation

```bash
npm install @digistratum/ds-testing-ts --save-dev
```

Or with GitHub Packages:
```bash
npm install @digistratum/ds-testing-ts@latest --registry=https://npm.pkg.github.com
```

## Features

### Test Fixtures

Create reusable test data with sensible defaults:

```typescript
import { createUserFixture, createTenantFixture, TEST_USERS } from '@digistratum/ds-testing-ts';

// Create fixtures with defaults
const user = createUserFixture();
const tenant = createTenantFixture({ name: 'Acme Corp' });

// Use predefined test users
const standardUser = TEST_USERS.standard;
const multiTenantUser = TEST_USERS.multiTenant;
```

### Mock Utilities

Mock fetch and other browser APIs:

```typescript
import { mockFetch, createMockStorage, createMockSessionToken } from '@digistratum/ds-testing-ts';

// Build mock fetch responses
const fetch = mockFetch()
  .onGet('/api/users', [{ id: '1', name: 'Test' }])
  .onPost('/api/users', (body) => ({ id: '2', ...body }))
  .onError('/api/fail', 500, 'Server error')
  .build();

// Mock localStorage
const localStorage = createMockStorage();

// Create mock JWT tokens
const token = createMockSessionToken({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  tenants: ['tenant-1'],
});
```

### API Test Client

Integration test HTTP client with typed responses:

```typescript
import { createApiClient, createAuthenticatedApiClient, ApiAssert } from '@digistratum/ds-testing-ts/api';

// Basic client
const client = createApiClient('http://localhost:3000');

// Authenticated client
const authClient = createAuthenticatedApiClient(
  'http://localhost:3000',
  'test-token',
  'tenant-1'
);

// Make requests
const response = await client.get<User[]>('/api/users');
ApiAssert.ok(response);
ApiAssert.arrayLength(response, 5);

const created = await authClient.post<User>('/api/users', { name: 'New User' });
ApiAssert.status(created, 201);
ApiAssert.fieldEquals(created, 'name', 'New User');
```

### Vitest Utilities

```typescript
import { 
  flushPromises, 
  waitFor, 
  setupMockTimers,
  createDeferred,
  mockEnv
} from '@digistratum/ds-testing-ts/vitest';

// Wait for promises
await flushPromises();

// Wait for condition
await waitFor(() => someCondition === true, { timeout: 5000 });

// Mock timers
const timers = setupMockTimers();
await timers.advanceBy(1000);
timers.cleanup();

// Mock environment
const restore = mockEnv({ API_URL: 'http://test.local' });
// ... test ...
restore();

// Deferred promises for async flow testing
const { promise, resolve, reject } = createDeferred<string>();
someAsyncOperation(promise);
resolve('result');
```

### Playwright Fixtures

E2E testing with authentication:

```typescript
import { test, expect, TEST_USERS, mockApiResponse } from '@digistratum/ds-testing-ts/playwright';

test.describe('Dashboard', () => {
  test('authenticated user sees dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await expect(authenticatedPage.getByRole('heading')).toBeVisible();
  });

  test('custom user authentication', async ({ page, mockAuth }) => {
    await mockAuth(TEST_USERS.multiTenant);
    await page.goto('/dashboard');
    // ...
  });
});

// Mock API in E2E tests
test('mocked API', async ({ page }) => {
  await mockApiResponse(page, '/api/users', {
    body: [{ id: '1', name: 'Test' }],
  });
  await page.goto('/users');
});
```

### React Testing Library

```typescript
import { 
  renderWithProviders, 
  renderWithRouter,
  setupReactTestMocks,
  screen,
  userEvent
} from '@digistratum/ds-testing-ts/react';

// Setup mocks before tests
beforeAll(() => {
  setupReactTestMocks();
});

test('component renders', () => {
  renderWithRouter(<MyComponent />, {
    initialEntries: ['/dashboard'],
  });

  expect(screen.getByRole('heading')).toBeInTheDocument();
});

test('user interaction', async () => {
  const user = userEvent.setup();
  renderWithProviders(<MyForm />);

  await user.type(screen.getByLabelText('Name'), 'Test');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

## API Reference

### Fixtures (`@digistratum/ds-testing-ts`)

| Export | Description |
|--------|-------------|
| `createUserFixture(overrides?)` | Create user fixture |
| `createTenantFixture(overrides?)` | Create tenant fixture |
| `createSessionFixture(userId, overrides?)` | Create session fixture |
| `testId(prefix?)` | Generate unique test ID |
| `TEST_USERS` | Predefined test users |
| `builder(factory)` | Fluent test data builder |

### Mocks (`@digistratum/ds-testing-ts`)

| Export | Description |
|--------|-------------|
| `mockFetch()` | Mock fetch builder |
| `mockResponse(body, options?)` | Create mock Response |
| `mockErrorResponse(status, message)` | Create error Response |
| `createMockStorage()` | Mock localStorage/sessionStorage |
| `createMockJwt(payload)` | Create mock JWT token |
| `createMockSessionToken(user)` | Create DSAccount session token |

### API Client (`@digistratum/ds-testing-ts/api`)

| Export | Description |
|--------|-------------|
| `createApiClient(baseUrl, headers?)` | Create API client |
| `createAuthenticatedApiClient(baseUrl, token, tenantId?)` | Create auth client |
| `ApiAssert.ok(response)` | Assert 2xx response |
| `ApiAssert.status(response, expected)` | Assert status code |
| `ApiAssert.hasField(response, field)` | Assert field exists |
| `ApiAssert.fieldEquals(response, field, value)` | Assert field value |
| `ApiAssert.arrayLength(response, length)` | Assert array length |

### Vitest (`@digistratum/ds-testing-ts/vitest`)

| Export | Description |
|--------|-------------|
| `flushPromises()` | Wait for pending promises |
| `waitFor(condition, options?)` | Wait for condition |
| `setupMockTimers()` | Setup fake timers |
| `mockEnv(vars)` | Mock environment variables |
| `createDeferred()` | Create deferred promise |

### Playwright (`@digistratum/ds-testing-ts/playwright`)

| Export | Description |
|--------|-------------|
| `test` | Extended test with auth fixtures |
| `expect` | Playwright expect |
| `TEST_USERS` | Predefined test users |
| `createAuthTest(options?)` | Create custom auth test |
| `mockApiResponse(page, pattern, response)` | Mock API in E2E |
| `waitForAuth(page)` | Wait for auth state |
| `expectLoginRedirect(page)` | Assert login redirect |

### React (`@digistratum/ds-testing-ts/react`)

| Export | Description |
|--------|-------------|
| `renderWithProviders(ui, options?)` | Render with common providers |
| `renderWithRouter(ui, options?)` | Render with router |
| `setupReactTestMocks()` | Setup browser API mocks |
| `mockResizeObserver()` | Mock ResizeObserver |
| `mockIntersectionObserver()` | Mock IntersectionObserver |
| `mockMatchMedia(matches?)` | Mock matchMedia |

## Requirements

- Node.js 18+
- TypeScript 5.0+

### Peer Dependencies

These are optional and only needed if using specific features:

- `vitest` ^1.0.0 - For vitest utilities
- `@playwright/test` ^1.40.0 - For Playwright fixtures
- `@testing-library/react` ^14.0.0 - For React utilities
- `react` ^18.0.0 - For React utilities

## License

MIT
