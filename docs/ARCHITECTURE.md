# Architecture Patterns - DS App Developer

> This document defines canonical architecture patterns for all DigiStratum applications.
> Applications based on ds-app-developer inherit these patterns.
> Deviations require documented justification.

---

## Table of Contents
1. [Overview](#overview)
2. [Go Backend Conventions](#go-backend-conventions)
3. [React Frontend Conventions](#react-frontend-conventions)
4. [Shared Patterns](#shared-patterns)
5. [Testing Patterns](#testing-patterns)
6. [Refactoring Guidelines](#refactoring-guidelines)

> **Related Documentation:**
> - [AUTH.md](./AUTH.md) - Detailed DSAccount SSO integration, token handling, session management
> - [DATABASE.md](./DATABASE.md) - DynamoDB patterns, single-table design, GSI strategies
> - [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - AWS deployment patterns
> - [TEST-TEMPLATES.md](./TEST-TEMPLATES.md) - Test writing conventions

---

## Overview

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | UI with strict type safety |
| Styling | Tailwind CSS v3 | Utility-first CSS |
| Routing | React Router v6 | Client-side navigation |
| i18n | react-i18next | Internationalization |
| Backend | Go 1.21+ | Lambda handlers |
| Database | DynamoDB | Single-table design |
| Infrastructure | AWS CDK (TypeScript) | Infrastructure as Code |
| Auth | DSAccount SSO | Centralized authentication |

### Request Flow

```
Browser → CloudFront → API Gateway → Lambda → DynamoDB
            ↓
      S3 (Static Assets)
```

---

## Go Backend Conventions

### Folder Structure

```
backend/
├── cmd/
│   └── api/
│       └── main.go           # Lambda entry point, route registration
├── internal/
│   ├── api/
│   │   └── handlers.go       # HTTP handlers (thin, delegate to services)
│   ├── auth/
│   │   ├── handlers.go       # Auth-specific handlers (callback, logout)
│   │   └── middleware.go     # Auth middleware, context utilities
│   ├── dynamo/
│   │   └── repository.go     # Base repository, tenant key builders
│   └── models/
│       └── models.go         # Domain models with struct tags
├── go.mod
├── go.sum
└── scripts/
    └── build.sh              # Build script for Lambda
```

### Module Organization

**Rule:** One package = one responsibility.

| Package | Responsibility |
|---------|---------------|
| `cmd/api` | Entry point, route wiring, dependency injection |
| `internal/api` | HTTP handlers, request/response helpers |
| `internal/auth` | Authentication, authorization, session management |
| `internal/dynamo` | Database operations, query builders |
| `internal/models` | Domain entities, validation |

### Dependency Injection Pattern

Dependencies are injected at application startup, not imported globally.

```go
// ✅ Correct - inject dependencies
func main() {
    repo, _ := dynamo.NewRepository("AppTable")
    userService := services.NewUserService(repo)
    
    mux := http.NewServeMux()
    mux.HandleFunc("GET /api/users/{id}", userService.GetHandler)
}

// ❌ Wrong - global imports create tight coupling
import "github.com/app/internal/dynamo"

func GetUser(w http.ResponseWriter, r *http.Request) {
    repo := dynamo.GlobalRepo  // Bad: global state
    user, _ := repo.Get(...)
}
```

For the skeleton, the `init()` function creates dependencies:

```go
func init() {
    mux := http.NewServeMux()
    
    // Health check (no auth)
    mux.HandleFunc("GET /health", api.HealthHandler)
    
    // Authenticated routes
    authedMux := http.NewServeMux()
    authedMux.HandleFunc("GET /api/me", api.GetCurrentUserHandler)
    
    mux.Handle("/api/", auth.Middleware(authedMux))
}
```

### Error Handling Pattern

**Rule:** Wrap errors with context; return structured JSON errors.

```go
// Error wrapping
if err != nil {
    return fmt.Errorf("failed to get user %s: %w", userID, err)
}

// Standard error response [NFR-SEC-004]
type ErrorResponse struct {
    Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
    Code      string            `json:"code"`
    Message   string            `json:"message"`
    Details   map[string]string `json:"details,omitempty"`
    RequestID string            `json:"request_id,omitempty"`
}

// Helper function
func WriteError(w http.ResponseWriter, status int, code, message string) {
    WriteJSON(w, status, ErrorResponse{
        Error: ErrorDetail{
            Code:    code,
            Message: message,
        },
    })
}
```

### Logging Pattern

**Rule:** Use structured logging (`log/slog`) with contextual fields.

```go
import "log/slog"

// ✅ Correct - structured with context
slog.Info("user authenticated", 
    "user_id", user.ID, 
    "tenant_id", tenantID,
    "method", r.Method,
    "path", r.URL.Path)

slog.Warn("invalid token", "error", err)

// ❌ Wrong - unstructured string formatting
log.Printf("User %s authenticated for tenant %s", userID, tenantID)
```

**Log Levels:**
- `Debug` - Development diagnostics
- `Info` - Normal operations (request received, operation completed)
- `Warn` - Recoverable issues (invalid input, retry succeeded)
- `Error` - Failures requiring attention

### Context Pattern

**Rule:** Pass `context.Context` as first parameter; use for cancellation, deadlines, and request-scoped values.

```go
// Context keys are unexported typed constants
type contextKey string

const (
    userContextKey   contextKey = "user"
    tenantContextKey contextKey = "tenant"
)

// Setting context values
ctx := context.WithValue(r.Context(), userContextKey, user)
ctx = context.WithValue(ctx, tenantContextKey, tenantID)

// Getting context values with type assertion
func GetUser(ctx context.Context) *User {
    user, _ := ctx.Value(userContextKey).(*User)
    return user
}

func GetTenantID(ctx context.Context) string {
    tenant, _ := ctx.Value(tenantContextKey).(string)
    return tenant
}
```

### Repository Pattern

**Rule:** All database operations go through repositories; never access DynamoDB directly from handlers.

```go
// Repository provides base DynamoDB operations [FR-TENANT-003]
type Repository struct {
    client    *dynamodb.Client
    tableName string
}

func NewRepository(tableName string) (*Repository, error) {
    cfg, err := config.LoadDefaultConfig(context.Background())
    if err != nil {
        return nil, fmt.Errorf("failed to load AWS config: %w", err)
    }
    return &Repository{
        client:    dynamodb.NewFromConfig(cfg),
        tableName: tableName,
    }, nil
}

// Tenant-scoped key builders [FR-TENANT-003]
func BuildTenantKey(tenantID, entityType, entityID string) string {
    if tenantID == "" {
        tenantID = "PERSONAL"
    }
    return fmt.Sprintf("TENANT#%s#%s#%s", tenantID, entityType, entityID)
}
```

### Multi-Tenant Data Access

**Rule:** Every query must include tenant scope. No global data access.

```go
// ✅ Correct - tenant scoped
items, err := repo.Query(ctx, dynamo.BuildTenantPrefix(tenantID, "USER"))

// ❌ Wrong - missing tenant scope (data leak risk!)
items, err := repo.Scan(ctx)  // Never use Scan without tenant filter
```

---

## React Frontend Conventions

### Folder Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts         # HTTP client with tenant headers
│   ├── components/
│   │   ├── DSNav.tsx         # Navigation bar
│   │   ├── Footer.tsx        # Page footer
│   │   ├── Layout.tsx        # Page layout wrapper
│   │   └── index.ts          # Barrel exports
│   ├── hooks/
│   │   ├── useAuth.tsx       # Auth context and hook
│   │   └── useTheme.tsx      # Theme context and hook
│   ├── i18n/
│   │   └── config.ts         # i18next configuration
│   ├── pages/
│   │   ├── Home.tsx          # Public landing page
│   │   └── Dashboard.tsx     # Protected dashboard
│   ├── styles/
│   │   └── globals.css       # Tailwind imports, CSS variables
│   ├── __tests__/
│   │   └── auth.test.tsx     # Component tests
│   ├── App.tsx               # Route definitions
│   ├── main.tsx              # React DOM render
│   └── types.ts              # Shared TypeScript types
├── public/
│   ├── favicon.svg
│   └── locales/              # Translation JSON files
│       ├── en/translation.json
│       └── es/translation.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Module Organization

| Folder | Purpose |
|--------|---------|
| `api/` | HTTP client, API types, request helpers |
| `components/` | Reusable UI components |
| `hooks/` | Custom React hooks (state, effects, context) |
| `i18n/` | Internationalization setup |
| `pages/` | Route page components |
| `styles/` | Global CSS, Tailwind config |
| `__tests__/` | Component and integration tests |

### Component Pattern

**Rule:** Functional components with hooks. No class components.

```tsx
// ✅ Correct - functional with hooks
interface DSNavProps {
  appName?: string;
}

export function DSNav({ appName = 'DS App' }: DSNavProps) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="bg-white dark:bg-gray-800">
      {/* ... */}
    </header>
  );
}

// ❌ Wrong - class component
class DSNav extends React.Component { /* ... */ }
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component files | PascalCase | `DSNav.tsx`, `Footer.tsx` |
| Hook files | camelCase | `useAuth.tsx`, `useTheme.tsx` |
| Utility files | camelCase | `client.ts`, `config.ts` |
| Type files | camelCase | `types.ts` |
| Test files | camelCase + `.test` | `auth.test.tsx` |

### Context Pattern

**Rule:** Context for global state (auth, theme). Props for component state.

```tsx
// Create context with null default
const AuthContextInstance = createContext<AuthContext | null>(null);

// Provider wraps app
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // Provide values
  return (
    <AuthContextInstance.Provider value={{ user, login, logout }}>
      {children}
    </AuthContextInstance.Provider>
  );
}

// Hook with safety check
export function useAuth(): AuthContext {
  const context = useContext(AuthContextInstance);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### API Client Pattern

**Rule:** Centralized HTTP client handles auth headers, tenant context, error normalization.

```tsx
class ApiClient {
  private tenantId: string | null = null;

  setTenant(tenantId: string | null) {
    this.tenantId = tenantId;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add tenant header [FR-TENANT-004]
    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',  // Include cookies for session
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error.message || 'Request failed');
    }

    return response.json();
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }
  // ... post, put, delete
}

export const api = new ApiClient();
```

### Protected Routes Pattern

**Rule:** Wrap protected routes in auth check; redirect or show login prompt.

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, login } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoginPrompt onLogin={login} />;
  }

  return <>{children}</>;
}

// Usage in routes
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Layout><DashboardPage /></Layout>
    </ProtectedRoute>
  }
/>
```

### Styling Pattern

**Rule:** Tailwind utility classes. CSS variables for theme colors.

```tsx
// ✅ Correct - Tailwind classes
<button className="px-4 py-2 bg-ds-primary text-white rounded-md hover:bg-ds-primary-dark">
  Click me
</button>

// ✅ Correct - Dark mode variants
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  Content
</div>

// ❌ Wrong - Inline styles
<button style={{ padding: '1rem', backgroundColor: 'blue' }}>
  Click me
</button>
```

**CSS Variables (in `globals.css`):**

```css
:root {
  --ds-primary: #2563eb;
  --ds-primary-dark: #1d4ed8;
}

.dark {
  --ds-primary: #3b82f6;
  --ds-primary-dark: #60a5fa;
}
```

### Internationalization Pattern

**Rule:** All user-facing strings via `t()` function. JSON translation files.

```tsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('page.title')}</h1>
      <p>{t('page.description')}</p>
      <button>{t('common.submit')}</button>
    </div>
  );
}
```

**Translation file structure (`public/locales/en/translation.json`):**

```json
{
  "common": {
    "loading": "Loading...",
    "submit": "Submit",
    "cancel": "Cancel"
  },
  "auth": {
    "loginWith": "Login with DigiStratum",
    "unauthorized": "Please sign in to continue"
  },
  "nav": {
    "personal": "Personal"
  }
}
```

---

## Shared Patterns

### Type Definitions

**Rule:** Shared types in `types.ts`. Keep synchronized with backend models.

```typescript
// types.ts

// User matches backend auth.User
export interface User {
  id: string;
  email: string;
  name: string;
  tenants: string[];
  preferredLanguage?: string;
  theme?: 'light' | 'dark' | 'system';
}

// API error matches backend ErrorResponse
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    request_id?: string;
  };
}
```

### Environment Configuration

**Backend (Go):**
```go
// Environment variables
os.Getenv("DSACCOUNT_SSO_URL")
os.Getenv("DSACCOUNT_APP_ID")
os.Getenv("APP_URL")
os.Getenv("DYNAMODB_TABLE")
```

**Frontend (Vite):**
```typescript
// Prefixed with VITE_ for client-side access
const API_BASE = import.meta.env.VITE_API_URL || '';
```

### Error Codes

Standard error codes across the stack:

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `TENANT_REQUIRED` | 400 | Missing tenant context |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Multi-Tenant Architecture

This section describes the complete multi-tenant data isolation and context flow.

### Design Principles

1. **Every app is tenant-aware by default** - No feature should be built without tenant scoping
2. **User session identifies user + current tenant** - Or "none" for personal view
3. **All features, access, and data are scoped to current tenant** - No cross-tenant data leakage
4. **Backend APIs require X-Tenant-ID header** - Enforced at middleware level
5. **DynamoDB queries always include tenant in PK** - No table scans without tenant prefix

### Tenant Context Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. User authenticates → receives User object with tenants[]                │
│  2. AuthProvider restores tenant from localStorage (if valid)               │
│  3. api.setTenant(tenantId) called on:                                      │
│     - Initial auth check (restore from localStorage)                        │
│     - User switches tenant via DSNav dropdown                               │
│     - Logout (clears to null)                                               │
│  4. All API requests include X-Tenant-ID header automatically               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. auth.Middleware extracts X-Tenant-ID header                             │
│  2. Tenant ID stored in request context                                     │
│  3. Handlers retrieve via auth.GetTenantID(ctx)                             │
│  4. Repository uses BuildTenantKey() for all queries                        │
│  5. Empty tenant → "PERSONAL" prefix (personal data view)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DYNAMODB                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  PK Format: TENANT#{tenantId}#{entityType}#{entityId}                       │
│  Example:   TENANT#acme-corp#USER#user-123                                  │
│  Personal:  TENANT#PERSONAL#USER#user-123                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Frontend Implementation

**AuthProvider** (`hooks/useAuth.tsx`):
- Manages `currentTenant` state
- Syncs tenant to `api.setTenant()` on every change
- Persists to localStorage for session recovery
- Provides `switchTenant()` function to components

**ApiClient** (`api/client.ts`):
- `setTenant(tenantId)` updates internal tenant state
- All requests automatically include `X-Tenant-ID` header when set

**DSNav** (`components/DSNav.tsx`):
- Displays tenant switcher dropdown when user has multiple tenants
- Shows "Personal" option for personal data view
- Calls `switchTenant()` on selection

```tsx
// Key synchronization pattern in useAuth.tsx
const switchTenant = useCallback((tenantId: string | null) => {
  setCurrentTenant(tenantId);
  api.setTenant(tenantId);  // ← Critical: sync to API client
  if (tenantId) {
    localStorage.setItem('currentTenant', tenantId);
  } else {
    localStorage.removeItem('currentTenant');
  }
}, []);
```

### Backend Implementation

**Middleware** (`auth/middleware.go`):
- Extracts `X-Tenant-ID` header from request
- Stores in context via `context.WithValue()`
- Provides `GetTenantID(ctx)` helper

```go
// Extract tenant from header [FR-TENANT-004]
tenantID := r.Header.Get("X-Tenant-ID")
ctx = context.WithValue(ctx, tenantContextKey, tenantID)
```

**Repository** (`dynamo/repository.go`):
- `BuildTenantKey()` creates partition keys with tenant prefix
- `BuildTenantPrefix()` creates prefixes for range queries
- Empty tenant ID maps to "PERSONAL"

```go
// ✅ Correct - all queries are tenant-scoped
pk := dynamo.BuildTenantKey(tenantID, "USER", userID)
result, err := repo.GetItem(ctx, pk)

// ❌ Wrong - never query without tenant scope
result, err := repo.Scan(ctx)  // Data leak risk!
```

### Handler Pattern

Every API handler that accesses data must:

```go
func GetResourceHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    
    // 1. Get tenant from context
    tenantID := auth.GetTenantID(ctx)
    
    // 2. Validate tenant is set (if required for this endpoint)
    if tenantID == "" {
        api.WriteError(w, http.StatusBadRequest, "TENANT_REQUIRED", "Tenant context required")
        return
    }
    
    // 3. Build tenant-scoped key
    pk := dynamo.BuildTenantKey(tenantID, "RESOURCE", resourceID)
    
    // 4. Query with tenant scope
    result, err := repo.GetItem(ctx, pk)
    // ...
}
```

### Requirements Traceability

| Requirement | Implementation |
|-------------|----------------|
| FR-TENANT-001: Session identifies tenant | `useAuth.tsx` - `currentTenant` state |
| FR-TENANT-002: Tenant switcher | `DSNav.tsx` - dropdown with `switchTenant()` |
| FR-TENANT-003: Data scoped to tenant | `repository.go` - `BuildTenantKey()` |
| FR-TENANT-004: X-Tenant-ID header | `client.ts` - `setTenant()`, `middleware.go` - header extraction |

---

## Testing Patterns

### Go Backend Tests

**Rule:** Table-driven tests, descriptive names, test file adjacent to implementation.

```go
// middleware_test.go

func TestMiddleware_ExtractToken(t *testing.T) {
    tests := []struct {
        name        string
        authHeader  string
        cookie      string
        wantToken   string
    }{
        {
            name:       "from_bearer_header",
            authHeader: "Bearer abc123",
            wantToken:  "abc123",
        },
        {
            name:      "from_cookie",
            cookie:    "abc123",
            wantToken: "abc123",
        },
        // ...
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest("GET", "/", nil)
            if tt.authHeader != "" {
                req.Header.Set("Authorization", tt.authHeader)
            }
            if tt.cookie != "" {
                req.AddCookie(&http.Cookie{Name: "ds_session", Value: tt.cookie})
            }
            
            got := extractToken(req)
            if got != tt.wantToken {
                t.Errorf("extractToken() = %v, want %v", got, tt.wantToken)
            }
        })
    }
}
```

### React Frontend Tests

**Rule:** Testing Library for components, test user interactions and rendered output.

```tsx
// auth.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../hooks/useAuth';

describe('Auth', () => {
  // Tests FR-AUTH-002: Unauthenticated redirect
  it('shows login prompt when not authenticated', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  // Tests FR-AUTH-004: Logout
  it('clears session on logout', async () => {
    // ...
  });
});
```

### Test File Location

```
backend/internal/auth/
├── middleware.go
├── middleware_test.go    # Adjacent test file
└── handlers.go

frontend/src/
├── hooks/useAuth.tsx
├── __tests__/
│   └── auth.test.tsx     # Test folder for integration tests
```

---

## Refactoring Guidelines

The skeleton establishes patterns. If deviating, document why.

### When Aligned (No Changes Needed)

- **Folder structure matches documented layout** ✅
- **Error handling uses standard ErrorResponse** ✅
- **Context used for request-scoped values** ✅
- **Repository pattern for database access** ✅
- **API client handles tenant headers** ✅
- **Components are functional with hooks** ✅

### Potential Improvements

1. **Service layer extraction** - As business logic grows, extract from handlers into `internal/services/` packages
2. **Custom hooks per feature** - Split `useAuth` into smaller hooks if it grows (e.g., `useTenant`, `useSession`)
3. **API response caching** - Add React Query or SWR for data fetching with caching
4. **Error boundary components** - Add React error boundaries for graceful failure handling

### Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Preferred Pattern |
|-----------------|---------------------|
| Global database client | Repository injection |
| Printf logging | Structured slog |
| Class components | Functional components |
| Inline CSS | Tailwind utilities |
| Hardcoded strings | i18n translation keys |
| Tenant-less queries | Always scope by tenant |
| Catching errors silently | Log and return error response |

---

## Appendix: Requirement Traceability

Architecture patterns trace to requirements:

| Pattern | Requirements |
|---------|-------------|
| Auth middleware | FR-AUTH-001, FR-AUTH-002 |
| Context for user/tenant | FR-AUTH-003, FR-TENANT-001 |
| Tenant header in API client | FR-TENANT-004 |
| Repository tenant keys | FR-TENANT-003 |
| Standard error format | NFR-SEC-004 |
| Structured logging | NFR-MON-001, NFR-MON-004 |
| Protected routes | FR-AUTH-002 |
| Theme context | FR-THEME-001, FR-THEME-002 |
| i18n translation | FR-I18N-001 |

---

*Document version: 1.0.0*
*Last updated: 2026-02-19*
