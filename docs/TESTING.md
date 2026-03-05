# Testing Guide - DS App Developer

> Comprehensive testing patterns, conventions, and standards for the DS App Developer.
> Tests must trace to requirement IDs from REQUIREMENTS.md.

>
> **Coverage requirements & exception policy:** See [NFR-TEST.md](./NFR-TEST.md)
## Table of Contents

- [Philosophy](#philosophy)
- [Coverage Thresholds](#coverage-thresholds)
- [Test File Organization](#test-file-organization)
- [Go Testing Patterns](#go-testing-patterns)
- [React Testing Patterns](#react-testing-patterns)
- [Requirement Traceability](#requirement-traceability)
- [Mocking Patterns](#mocking-patterns)
- [Running Tests](#running-tests)

---

## Philosophy

**Tests are documentation.** Each test should clearly communicate:
1. What requirement it verifies (traceability)
2. What behavior is expected
3. Under what conditions

**Test the contract, not the implementation.** Focus on:
- Inputs and outputs
- Side effects (API calls, state changes)
- Error handling

**Fast feedback.** Tests should be:
- Fast to run (<10s for unit tests)
- Isolated (no external dependencies)
- Deterministic (same result every time)

---

## Coverage Thresholds

Per **NFR-TEST-001**: Unit test coverage > 80%

### Backend (Go)

| Package | Minimum Coverage |
|---------|------------------|
| `internal/auth` | 85% |
| `internal/api` | 80% |
| `internal/middleware` | 80% |
| `internal/dynamo` | 75% |
| `internal/models` | 70% |
| **Overall** | **80%** |

Run coverage: `go test -coverprofile=coverage.out ./...`

### Frontend (TypeScript/React)

**Current Baseline (2026-03-05):**

| Metric | Current | Threshold | Target |
|--------|---------|-----------|--------|
| Statements | 8.52% | 8% | 70% |
| Branches | 55.4% | 50% | 60% |
| Functions | 26.47% | 25% | 60% |
| Lines | 8.52% | 8% | 70% |

**Phased Coverage Targets:**

| Phase | Timeline | Target |
|-------|----------|--------|
| Phase 1 | Current | Prevent regression from baseline |
| Phase 2 | +2 sprints | 30% lines/statements |
| Phase 3 | +4 sprints | 50% lines/statements |
| Phase 4 | +6 sprints | 70% lines/statements (target state) |

Coverage is configured in `frontend/vite.config.ts` with thresholds that will fail CI on regression.

Run coverage: `npm run test:coverage` (in `frontend/`)

### CI Enforcement

Coverage is enforced in CI. PRs below threshold will fail.

```yaml
# .github/workflows/test.yml
- name: Check Go coverage
  run: |
    go test -coverprofile=coverage.out ./...
    COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80% threshold"
      exit 1
    fi
```

---

## Test File Organization

### Backend (Go)

```
backend/
├── internal/
│   ├── auth/
│   │   ├── middleware.go
│   │   ├── middleware_test.go    # Unit tests for middleware
│   │   ├── context.go
│   │   └── context_test.go       # Unit tests for context helpers
│   ├── api/
│   │   ├── handlers.go
│   │   └── handlers_test.go
│   └── dynamo/
│       ├── repository.go
│       └── repository_test.go
├── testdata/                      # Shared test fixtures
│   └── fixtures/
│       ├── users.json
│       └── tenants.json
└── integration/                   # Integration tests (separate from unit)
    ├── api_test.go
    └── auth_flow_test.go
```

**Convention:** Test files live alongside source files with `_test.go` suffix.

### Frontend (React)

```
frontend/
├── src/
│   ├── __tests__/                 # Feature/integration tests
│   │   ├── auth.test.tsx          # Auth flow tests
│   │   └── navigation.test.tsx    # Navigation tests
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx    # Component unit tests
│   │   │   └── Button.stories.tsx # Optional Storybook
│   │   └── DSNav/
│   │       ├── DSNav.tsx
│   │       └── DSNav.test.tsx
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   └── useAuth.test.tsx       # Hook tests
│   └── utils/
│       ├── format.ts
│       └── format.test.ts
├── __mocks__/                     # Global mocks
│   └── react-router-dom.ts
└── vitest.setup.ts                # Test setup file
```

**Convention:** 
- Component tests: `ComponentName.test.tsx` adjacent to component
- Feature tests: `src/__tests__/feature.test.tsx`
- Utility tests: `utility.test.ts` adjacent to source

---

## Go Testing Patterns

### Table-Driven Tests

The standard Go pattern for testing multiple scenarios:

```go
func TestBuildKey(t *testing.T) {
    tests := []struct {
        name     string       // Describes the scenario
        segments []string     // Input
        expected string       // Expected output
    }{
        {
            name:     "empty input returns empty string",
            segments: []string{},
            expected: "",
        },
        {
            name:     "single segment returns as-is",
            segments: []string{"USER"},
            expected: "USER",
        },
        {
            name:     "multiple segments joined with hash [FR-TENANT-003]",
            segments: []string{"TENANT", "acme", "USER"},
            expected: "TENANT#acme#USER",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := BuildKey(tt.segments...)
            if result != tt.expected {
                t.Errorf("BuildKey(%v) = %q, want %q", tt.segments, result, tt.expected)
            }
        })
    }
}
```

**Best Practices:**
- Use descriptive `name` fields that explain the scenario
- Include requirement ID in name when applicable: `"valid token returns user [FR-AUTH-001]"`
- Keep test data inline for clarity (external fixtures for complex data)

### HTTP Handler Tests

Use `httptest` for testing HTTP handlers:

```go
func TestMiddleware_WithoutToken_RedirectsToSSO(t *testing.T) {
    // Arrange
    t.Setenv("DSACCOUNT_SSO_URL", "https://account.example.com")
    t.Setenv("DSACCOUNT_APP_ID", "test-app")
    t.Setenv("APP_URL", "https://app.example.com")

    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        t.Error("handler should not be called for unauthenticated request")
    })

    middleware := Middleware(handler)
    req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
    rr := httptest.NewRecorder()

    // Act
    middleware.ServeHTTP(rr, req)

    // Assert
    if rr.Code != http.StatusFound {
        t.Errorf("expected status 302, got %d", rr.Code)
    }
    location := rr.Header().Get("Location")
    if !strings.Contains(location, "account.example.com") {
        t.Errorf("expected redirect to SSO, got %s", location)
    }
}
```

### Context Testing

Testing context values:

```go
func TestGetTenantID_FromContext(t *testing.T) {
    tests := []struct {
        name     string
        tenantID string
        expected string
    }{
        {name: "with tenant", tenantID: "tenant-abc", expected: "tenant-abc"},
        {name: "empty tenant", tenantID: "", expected: ""},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            ctx := context.Background()
            ctx = context.WithValue(ctx, tenantContextKey, tt.tenantID)

            result := GetTenantID(ctx)
            if result != tt.expected {
                t.Errorf("GetTenantID() = %q, want %q", result, tt.expected)
            }
        })
    }
}
```

### Panic Testing

```go
func TestMustGetUser_WithoutUser_Panics(t *testing.T) {
    defer func() {
        if r := recover(); r == nil {
            t.Error("expected panic, got none")
        }
    }()

    ctx := context.Background()
    MustGetUser(ctx) // Should panic
}
```

### Test Naming Convention

Pattern: `Test<Function>_<Condition>_<Expected>`

| Example | Meaning |
|---------|---------|
| `TestGetUser_WithValidID_ReturnsUser` | Happy path |
| `TestGetUser_WithEmptyID_ReturnsError` | Error case |
| `TestMiddleware_WithoutToken_Redirects` | Missing auth |
| `TestCreateTenant_WhenDuplicate_Returns409` | Conflict |

---

## React Testing Patterns

### Component Testing with React Testing Library

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
    it('renders primary content', () => {
        render(
            <MemoryRouter>
                <MyComponent />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument();
    });

    it('handles user interaction', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <MyComponent />
            </MemoryRouter>
        );

        await user.click(screen.getByRole('button', { name: /submit/i }));
        
        await waitFor(() => {
            expect(screen.getByText(/success/i)).toBeInTheDocument();
        });
    });
});
```

### Testing Hooks

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

describe('useAuth', () => {
    it('returns loading state initially', () => {
        const { result } = renderHook(() => useAuth());
        expect(result.current.isLoading).toBe(true);
    });

    it('returns user after session load', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.user?.email).toBe('test@example.com');
    });
});
```

### Query Priority (Best → Worst)

React Testing Library encourages queries that reflect how users interact:

1. **`getByRole`** - Accessible to everyone (preferred)
2. **`getByLabelText`** - Good for form fields
3. **`getByPlaceholderText`** - Fallback for unlabeled inputs
4. **`getByText`** - For static text content
5. **`getByDisplayValue`** - For input current values
6. **`getByAltText`** - For images
7. **`getByTitle`** - For elements with title attr
8. **`getByTestId`** - Last resort (implementation detail)

```tsx
// ✅ Good - tests what user sees
screen.getByRole('button', { name: /submit/i })

// ⚠️ Acceptable - for form fields
screen.getByLabelText(/email address/i)

// ❌ Avoid - implementation detail
screen.getByTestId('submit-button')
```

### Async Testing Patterns

```tsx
// Waiting for element to appear
await waitFor(() => {
    expect(screen.getByText(/loaded/i)).toBeInTheDocument();
});

// Waiting for element to disappear
await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});

// Using findBy (combines getBy + waitFor)
const element = await screen.findByRole('alert');
expect(element).toHaveTextContent(/error/i);
```

### Mocking API Calls

```tsx
// Mock module at top of file
vi.mock('../api/auth', () => ({
    getSession: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
}));

// Import after mock
import { getSession, login, logout } from '../api/auth';

beforeEach(() => {
    vi.clearAllMocks();
});

it('handles login', async () => {
    vi.mocked(login).mockResolvedValue({ token: 'abc' });
    // ... test
    expect(login).toHaveBeenCalledWith({ email: 'test@example.com' });
});
```

### Test Wrapper Pattern

For components requiring providers:

```tsx
function renderWithProviders(component: React.ReactNode, options = {}) {
    return render(
        <MemoryRouter initialEntries={options.route ? [options.route] : ['/']}>
            <AuthProvider>
                <ThemeProvider>
                    {component}
                </ThemeProvider>
            </AuthProvider>
        </MemoryRouter>
    );
}

// Usage
it('renders authenticated view', () => {
    renderWithProviders(<Dashboard />, { route: '/dashboard' });
    // ...
});
```

---

## Requirement Traceability

Every test MUST trace to a requirement from REQUIREMENTS.md.

### Go Traceability Pattern

```go
// File-level comment listing covered requirements
// Tests for FR-AUTH: Authentication & Authorization requirements
// See REQUIREMENTS.md for full requirement descriptions

// TestMiddleware_WithValidToken_ExtractsUserContext tests FR-AUTH-001 and FR-AUTH-003
// FR-AUTH-001: Users authenticate via DSAccount SSO
// FR-AUTH-003: Session includes user identity and tenant context
func TestMiddleware_WithValidToken_ExtractsUserContext(t *testing.T) {
    // ...
}

// Table-driven tests can embed requirement IDs in scenario names
tests := []struct {
    name     string
    // ...
}{
    {
        name: "valid tenant header accepted [FR-TENANT-004]",
        // ...
    },
}
```

### TypeScript Traceability Pattern

```tsx
/**
 * Tests for FR-AUTH: Authentication & Authorization requirements
 * See REQUIREMENTS.md for full requirement descriptions
 */
describe('FR-AUTH: Authentication & Authorization', () => {
    /**
     * Tests FR-AUTH-002: Unauthenticated requests redirect to SSO login
     */
    describe('FR-AUTH-002: Unauthenticated redirect', () => {
        it('shows login button when user is not authenticated', async () => {
            // ...
        });
    });
});
```

### Updating the Traceability Table

After adding tests, update `REQUIREMENTS.md`:

```markdown
| Requirement | Test File | Status |
|-------------|-----------|--------|
| FR-AUTH-001 | `backend/internal/auth/middleware_test.go` | ✅ |
```

**Status Legend:**
- ✅ Tested - Full coverage exists
- ⚠️ Partial - Some test coverage, needs expansion
- ❌ Not tested - No coverage yet
- 🚧 In progress - Tests being written

---

## Mocking Patterns

### Go Mocks

#### Interface-Based Mocking

Define interfaces for external dependencies:

```go
// repository.go
type UserRepository interface {
    GetByID(ctx context.Context, id string) (*User, error)
    Create(ctx context.Context, user *User) error
}

// mock_repository.go (in tests)
type MockUserRepository struct {
    GetByIDFunc func(ctx context.Context, id string) (*User, error)
    CreateFunc  func(ctx context.Context, user *User) error
}

func (m *MockUserRepository) GetByID(ctx context.Context, id string) (*User, error) {
    if m.GetByIDFunc != nil {
        return m.GetByIDFunc(ctx, id)
    }
    return nil, nil
}
```

#### Using in Tests

```go
func TestService_GetUser_ReturnsUser(t *testing.T) {
    mockRepo := &MockUserRepository{
        GetByIDFunc: func(ctx context.Context, id string) (*User, error) {
            if id == "user-123" {
                return &User{ID: "user-123", Email: "test@example.com"}, nil
            }
            return nil, ErrNotFound
        },
    }

    service := NewService(mockRepo)
    user, err := service.GetUser(context.Background(), "user-123")

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Email != "test@example.com" {
        t.Errorf("expected test@example.com, got %s", user.Email)
    }
}
```

#### Environment Variable Mocking

```go
func TestConfig_FromEnvironment(t *testing.T) {
    // t.Setenv is cleanup-safe (restored after test)
    t.Setenv("DATABASE_URL", "postgres://localhost/test")
    t.Setenv("API_KEY", "test-key")

    cfg := LoadConfig()
    
    if cfg.DatabaseURL != "postgres://localhost/test" {
        t.Errorf("unexpected database URL: %s", cfg.DatabaseURL)
    }
}
```

### TypeScript/Vitest Mocks

#### Module Mocking

```tsx
// Mock entire module
vi.mock('../api/auth', () => ({
    getSession: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
}));

// Import after mock declaration
import { getSession } from '../api/auth';

// In test
vi.mocked(getSession).mockResolvedValue({ id: 'user-1' });
```

#### Spy on Methods

```tsx
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// After test
expect(consoleSpy).toHaveBeenCalledWith('Error message');
consoleSpy.mockRestore();
```

#### Mock Timers

```tsx
beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

it('debounces search input', async () => {
    render(<SearchInput />);
    
    await userEvent.type(screen.getByRole('textbox'), 'query');
    
    // Fast-forward debounce delay
    await vi.advanceTimersByTimeAsync(300);
    
    expect(mockSearch).toHaveBeenCalledWith('query');
});
```

#### Mock Fetch/HTTP

```tsx
// Using vi.stubGlobal
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' }),
});
```

---

## Running Tests

### Backend (Go)

```bash
# Run all tests
go test ./...

# Run with verbose output
go test -v ./...

# Run specific package
go test -v ./internal/auth/...

# Run specific test
go test -v -run TestMiddleware_WithValidToken ./internal/auth/

# Run with coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out  # Open in browser

# Run with race detector
go test -race ./...
```

### Frontend (Vitest)

```bash
# Run all tests (watch mode)
npm test

# Run once (CI mode)
npm test -- --run

# Run specific file
npm test -- src/hooks/useAuth.test.tsx

# Run with coverage
npm run test:coverage

# Run tests matching pattern
npm test -- --grep "authentication"

# Update snapshots
npm test -- -u
```

### CI Pipeline

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      - run: go test -race -coverprofile=coverage.out ./...
      - run: |
          COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then exit 1; fi

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage
```

---

## Checklist for New Tests

- [ ] Test traces to a requirement ID from REQUIREMENTS.md
- [ ] Uses descriptive test name (`Test<Function>_<Condition>_<Expected>`)
- [ ] Follows Arrange-Act-Assert pattern
- [ ] Table-driven for multiple scenarios (Go)
- [ ] Uses accessible queries (React Testing Library)
- [ ] Mocks external dependencies (no real HTTP, DB)
- [ ] Covers happy path AND error cases
- [ ] REQUIREMENTS.md traceability table updated

---

*See also: [TEST-TEMPLATES.md](./TEST-TEMPLATES.md) for copy-paste templates*

*Last updated: 2026-02-19*
