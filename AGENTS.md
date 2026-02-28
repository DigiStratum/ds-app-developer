# Agentic Development Guidelines - DS App Developer

> Guidelines for AI agents (Claude, GPT, Copilot, etc.) working on this codebase.
> This document makes the codebase AI-friendly with clear patterns, naming, and workflows.

---

## DS App Factory

**This repo is the boilerplate for all DS apps.** Creating a new app is a single command:

```bash
./scripts/create-app.sh <slug>

# Example:
./scripts/create-app.sh crm
# Creates: ds-app-crm at crm.digistratum.com
```

The script does everything automatically:
1. Copies `boilerplate/` with `developer` → `<slug>` substitution
2. Creates GitHub repo (`DigiStratum/ds-app-<slug>`)
3. Pushes code
4. Creates AWS secret (placeholder)
5. Monitors CI/Deploy
6. Confirms site is live

**Target time:** < 1 hour from command to live site, zero manual intervention.

### Repository Structure

```
ds-app-developer/
├── boilerplate/           # THE app template (canonical "developer")
│   ├── .github/workflows/ # CI/CD workflows
│   ├── backend/           # Go backend (Lambda)
│   ├── frontend/          # React frontend
│   └── cdk/               # CDK infrastructure
├── packages/              # Shared npm packages
├── scripts/
│   └── create-app.sh      # App factory script
└── docs/                  # Documentation
```

The **Developer Portal** (developer.digistratum.com) deploys directly from `boilerplate/`.
New apps are forks with string substitution.

---

## Quick Start for Agents

Before making any changes:

1. **Read [REQUIREMENTS.md](./REQUIREMENTS.md)** — Source of truth for what the app must do
2. **Read this file** — How to work on the code
3. **Check `docs/ARCHITECTURE.md`** — Understand the patterns
4. **Review recent commits** — `git log --oneline -20`

### Context Loading Priority

Load these files based on task type:

| Task Type | Files to Load |
|-----------|---------------|
| **Backend work** | `REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `backend/internal/` structure |
| **Frontend work** | `REQUIREMENTS.md`, `docs/FRONTEND.md`, `frontend/src/` structure |
| **Testing** | `REQUIREMENTS.md`, `docs/TESTING.md`, `docs/TEST-TEMPLATES.md` |
| **Infrastructure** | `docs/INFRASTRUCTURE.md`, `cdk/lib/` |
| **Auth/Security** | `docs/AUTH.md`, `docs/SECURITY.md` |
| **API changes** | `docs/API-STANDARDS.md`, `docs/ARCHITECTURE.md` |

---

## Requirements Traceability

**All work must trace to requirements in [REQUIREMENTS.md](./REQUIREMENTS.md).**

### Requirement ID Format

```
FR-{DOMAIN}-{NNN}    # Functional requirements
NFR-{DOMAIN}-{NNN}   # Non-functional requirements
```

Examples:
- `FR-AUTH-001` — Users authenticate via DSAccount SSO
- `FR-TENANT-003` — All data queries scoped to current tenant
- `NFR-PERF-002` — API response time < 500ms (p95)

### Reference Requirements In:

**Commit messages:**
```
feat(auth): implement SSO redirect [FR-AUTH-002]
fix(api): add tenant validation [FR-TENANT-003]
test(auth): verify logout clears session [FR-AUTH-004]
```

**Test descriptions:**
```go
// Tests FR-AUTH-002: Unauthenticated requests redirect to SSO login
func TestMiddleware_RedirectsUnauthenticated(t *testing.T) {
```

```tsx
// Tests FR-AUTH-003: Session includes user identity and tenant context
it('provides user and tenant in context', () => {
```

**Code comments (for complex logic):**
```go
// FR-TENANT-003: All data queries are scoped to current tenant
pk := dynamo.BuildTenantKey(tenantID, "USER", userID)
```

### Update Traceability Table

After adding tests, update the traceability table in `REQUIREMENTS.md`:

```markdown
| FR-AUTH-002 | `backend/internal/auth/middleware_test.go` | ✅ |
```

---

## Project Structure

```
ds-app-developer/
├── REQUIREMENTS.md      # What the app must do (source of truth)
├── AGENTS.md           # This file - how AI agents work on the code
├── README.md           # Setup and overview for humans
├── Makefile            # Common dev commands: make test, make build
│
├── backend/            # Go Lambda handlers
│   ├── cmd/api/        # Entry point (main.go)
│   │   └── main.go     # Route registration, dependency injection
│   ├── internal/       # Private packages (not importable)
│   │   ├── api/        # HTTP handlers (thin, delegate to services)
│   │   ├── auth/       # Auth middleware, context helpers
│   │   ├── dynamo/     # Repository pattern, tenant key builders
│   │   ├── middleware/ # Shared middleware (logging, cors, etc.)
│   │   └── models/     # Domain models with struct tags
│   ├── test/           # Integration tests
│   │   └── integration/
│   └── go.mod
│
├── frontend/           # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/        # HTTP client with tenant headers
│   │   ├── components/ # Reusable UI components
│   │   ├── hooks/      # Custom hooks (useAuth, useTheme)
│   │   ├── i18n/       # Internationalization config
│   │   ├── pages/      # Route page components
│   │   ├── styles/     # Global CSS, Tailwind config
│   │   ├── __tests__/  # Test files
│   │   ├── App.tsx     # Route definitions
│   │   └── types.ts    # Shared TypeScript types
│   ├── e2e/            # Playwright E2E tests
│   └── package.json
│
├── cdk/                # AWS CDK Infrastructure as Code
│   ├── bin/            # CDK app entry point
│   └── lib/            # CDK stacks
│
├── docs/               # Detailed documentation
│   ├── ARCHITECTURE.md # System architecture, patterns
│   ├── AUTH.md         # DSAccount SSO integration
│   ├── DATABASE.md     # DynamoDB single-table design
│   ├── FRONTEND.md     # React patterns, components
│   ├── TESTING.md      # Test patterns, coverage
│   └── ...             # Other docs
│
├── infra/              # Additional infra scripts
├── packages/           # Shared packages (monorepo)
└── .github/workflows/  # CI/CD pipelines
```

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Go files** | snake_case | `middleware.go`, `handlers_test.go` |
| **Go packages** | lowercase, single word | `auth`, `dynamo`, `api` |
| **React components** | PascalCase | `DSNav.tsx`, `Footer.tsx` |
| **React hooks** | camelCase, `use` prefix | `useAuth.tsx`, `useTheme.tsx` |
| **Test files (Go)** | `*_test.go` adjacent | `middleware_test.go` |
| **Test files (React)** | `*.test.tsx` in `__tests__/` | `auth.test.tsx` |
| **Docs** | SCREAMING-CASE | `ARCHITECTURE.md`, `AUTH.md` |

### File Purpose Summary

Every file should be self-documenting. Key files:

| File | Purpose |
|------|---------|
| `backend/cmd/api/main.go` | Lambda entry, route registration |
| `backend/internal/auth/middleware.go` | Auth middleware, token extraction |
| `backend/internal/auth/context.go` | Context helpers (GetUser, GetTenantID) |
| `backend/internal/dynamo/repository.go` | DynamoDB operations, tenant key builders |
| `frontend/src/hooks/useAuth.tsx` | Auth context provider and hook |
| `frontend/src/api/client.ts` | HTTP client with tenant header injection |
| `frontend/src/components/Layout.tsx` | Page layout wrapper |
| `frontend/src/components/DSNav.tsx` | Navigation with tenant switcher |

---

## Coding Standards

### Comment Conventions: FIXME vs TODO

**Use FIXME for incomplete/broken code that must be fixed before shipping:**
```go
// FIXME: SSO callback not implemented - auth will fail
func ssoCallback(w http.ResponseWriter, r *http.Request) {
    http.Error(w, "not implemented", 501)
}
```

**Use TODO for future enhancements that are okay to ship without:**
```go
// TODO: Add pagination support for large result sets
func listItems(ctx context.Context) ([]Item, error) {
    // Current implementation returns all items
}
```

**Pre-commit hook blocks FIXME** — commits containing FIXME in source files will be rejected. This ensures incomplete implementations don't make it to production.

Run `./scripts/setup.sh` after cloning to enable git hooks.

### Go Backend

```go
// ✅ Error wrapping with context
if err != nil {
    return fmt.Errorf("failed to get user %s: %w", userID, err)
}

// ✅ Structured logging (log/slog)
slog.Info("user authenticated", 
    "user_id", user.ID, 
    "tenant_id", tenantID)

// ✅ Table-driven tests
func TestHandler_Scenarios(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        wantCode int
    }{
        {"valid_input", "abc", 200},
        {"empty_input", "", 400},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // test logic
        })
    }
}

// ✅ Tenant-scoped queries (FR-TENANT-003)
pk := dynamo.BuildTenantKey(tenantID, "USER", userID)
result, err := repo.GetItem(ctx, pk)
```

### React Frontend

```tsx
// ✅ Functional components with hooks
export function DSNav({ appName = 'DS App' }: DSNavProps) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  // ...
}

// ✅ Tailwind utility classes
<button className="px-4 py-2 bg-ds-primary text-white rounded-md hover:bg-ds-primary-dark">

// ✅ Internationalized strings
<h1>{t('page.title')}</h1>

// ✅ Type-safe props
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}
```

### Git Commits

Format: `type(scope): description [REQ-ID] (#issue)`

```
feat(auth): implement SSO redirect [FR-AUTH-002] (#255)
fix(api): validate tenant header presence [FR-TENANT-004]
test(auth): add middleware token extraction tests [FR-AUTH-001]
docs(agents): expand agentic development guidelines
refactor(dynamo): extract key builders to separate file
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

---

## Standard Prompts for Common Tasks

Use these prompts when working on common development tasks:

### Implementing a New Feature

```
Task: Implement [feature name]
Requirement: [FR-XXX-NNN from REQUIREMENTS.md]

Before coding:
1. Read REQUIREMENTS.md for the requirement details
2. Check docs/ARCHITECTURE.md for relevant patterns
3. Find similar existing code to follow patterns
4. Note: Multi-tenant - all data must be tenant-scoped

Implementation:
- Backend handler in backend/internal/api/
- Repository method in backend/internal/dynamo/
- Frontend component in frontend/src/components/ or pages/
- Update types in frontend/src/types.ts

After coding:
1. Add tests referencing [FR-XXX-NNN]
2. Update REQUIREMENTS.md traceability table
3. Commit with: feat(scope): description [FR-XXX-NNN]
```

### Adding a Test

```
Task: Add test for [component/function]
Requirement: [FR-XXX-NNN or NFR-XXX-NNN]

Test should verify: [specific behavior from requirement]

Go test template (backend/internal/*/):
- Table-driven test with descriptive names
- Mock external dependencies
- Comment: "// Tests [REQ-ID]: [requirement text]"

React test template (frontend/src/__tests__/):
- Use Testing Library
- Test user interactions
- Test rendered output
- Comment: "// Tests [REQ-ID]: [requirement text]"

After test passes, update REQUIREMENTS.md traceability table.
```

### Fixing a Bug

```
Task: Fix [bug description]
Related requirement: [FR-XXX-NNN if applicable]

Steps:
1. Reproduce the bug locally
2. Write a failing test that captures the bug
3. Fix the code to make the test pass
4. Verify no regressions: make test
5. Commit with: fix(scope): description [REQ-ID if applicable] (#issue)
```

### Adding API Endpoint

```
Task: Add API endpoint [METHOD /path]
Requirement: [FR-XXX-NNN]

Checklist:
- [ ] Handler in backend/internal/api/handlers.go
- [ ] Route registration in backend/cmd/api/main.go
- [ ] Auth middleware applied if protected
- [ ] Tenant scoping for data access
- [ ] Standard error response format
- [ ] Request/response types documented
- [ ] Tests with requirement traceability
- [ ] API client method in frontend/src/api/client.ts
```

### Adding React Component

```
Task: Add component [ComponentName]
Requirement: [FR-XXX-NNN]

Location: frontend/src/components/ComponentName.tsx

Checklist:
- [ ] Functional component with TypeScript props interface
- [ ] Use hooks for state/effects
- [ ] Tailwind CSS for styling
- [ ] Dark mode support (dark: variants)
- [ ] Internationalized strings (useTranslation)
- [ ] Accessibility (semantic HTML, ARIA)
- [ ] Test in frontend/src/__tests__/
- [ ] Export from frontend/src/components/index.ts
```

### Debugging an Issue

```
Task: Debug [issue description]

Before making changes:
1. Reproduce the issue
2. Check existing code - read before writing
3. Trace the flow from entry point to failure
4. Check logs for error messages

Debug approach:
- Add slog.Debug() statements (Go) or console.log (React)
- Use table-driven tests to isolate the case
- Check tenant context - is data properly scoped?
- Check auth context - is user session valid?

After fixing:
1. Remove debug logging
2. Add test to prevent regression
3. Document the root cause in commit message
```

---

## Issue-Driven Development Workflow

**Every change that modifies state should be tracked in an issue system.**

### When to Create an Issue First

| Create Issue | Just Do It |
|--------------|------------|
| New features | Reading/exploring code |
| Bug fixes | Status checks |
| Config changes | Quick typo fixes |
| Schema/DB changes | Documentation reads |
| API changes | Code review comments |
| Refactors | |

### Issue Workflow

```
1. Create issue with:
   - Clear title
   - Requirement reference (FR-XXX-NNN)
   - Acceptance criteria
   - State: in-progress

2. Do the work:
   - Reference issue in commits: (#123)
   - Reference requirement: [FR-XXX-NNN]

3. Close issue:
   - Update state: done
   - Summary of what was done
   - Link to PR if applicable
```

### Commit Message with Issue

```
feat(auth): implement SSO redirect [FR-AUTH-002] (#123)

- Add redirect to DSAccount login on 401
- Store return URL in session
- Update middleware to check session first

Closes #123
```

---

## Test-Driven Development (TDD) Workflow

**Every code change follows the TDD cycle: Requirements → Tests → Implementation.**

This discipline ensures:
- **Minimum viable implementation** — Build only what's needed, not speculative features
- **Robust regression suite** — Tests prevent accidental breaks
- **High coverage from the start** — Reduces risk of instability

### The TDD Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│  1. REQUIREMENTS                                                │
│     Review and update documented requirements before coding     │
├─────────────────────────────────────────────────────────────────┤
│  2. RED                                                         │
│     Write tests for the requirement                             │
│     Run tests → they MUST FAIL (expected: nothing exists yet)   │
├─────────────────────────────────────────────────────────────────┤
│  3. GREEN                                                       │
│     Write minimum code to make tests pass                       │
│     Run tests → they MUST PASS                                  │
├─────────────────────────────────────────────────────────────────┤
│  4. REFACTOR                                                    │
│     Optimize implementation without changing tests              │
│     Run tests → they MUST STILL PASS                            │
└─────────────────────────────────────────────────────────────────┘
```

### Step-by-Step TDD Process

**1. Requirements Phase**
```bash
# Before any code:
# - Read REQUIREMENTS.md
# - Identify or create the requirement (FR-XXX-NNN)
# - Update REQUIREMENTS.md if new requirement
# - Commit: docs(requirements): add FR-AUTH-005 for password reset
```

**2. Red Phase (Write Failing Tests)**
```go
// backend/internal/auth/password_test.go

// Tests FR-AUTH-005: Users can request password reset via email
func TestPasswordReset_SendsEmail(t *testing.T) {
    // Arrange
    mockMailer := &mocks.Mailer{}
    handler := NewPasswordHandler(mockMailer)
    
    // Act
    req := httptest.NewRequest("POST", "/api/auth/reset", 
        strings.NewReader(`{"email":"user@example.com"}`))
    resp := httptest.NewRecorder()
    handler.RequestReset(resp, req)
    
    // Assert
    assert.Equal(t, 200, resp.Code)
    assert.True(t, mockMailer.SendCalled)
}
```

```bash
# Run tests - MUST FAIL (function doesn't exist)
go test ./internal/auth/... -run TestPasswordReset
# Expected output: undefined: NewPasswordHandler
```

**3. Green Phase (Minimum Implementation)**
```go
// backend/internal/auth/password.go

// Implements FR-AUTH-005: Users can request password reset via email
func (h *PasswordHandler) RequestReset(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Email string `json:"email"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        api.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON")
        return
    }
    
    // Minimum implementation - just send the email
    h.mailer.SendResetEmail(r.Context(), req.Email)
    w.WriteHeader(http.StatusOK)
}
```

```bash
# Run tests - MUST PASS
go test ./internal/auth/... -run TestPasswordReset
# Expected output: PASS
```

**4. Refactor Phase (Optimize Without Breaking Tests)**
```go
// Add validation, rate limiting, better error handling
// But tests still pass without modification

func (h *PasswordHandler) RequestReset(w http.ResponseWriter, r *http.Request) {
    // ... refactored with validation, logging, etc.
}
```

```bash
# Run tests - MUST STILL PASS
go test ./internal/auth/...
# If tests fail, you broke something - revert and try again
```

### TDD Checklist for Every Change

Before starting any code change:

- [ ] **Requirement identified** — Which FR/NFR does this implement?
- [ ] **REQUIREMENTS.md updated** — If new, add it first
- [ ] **Test written FIRST** — Before any implementation code
- [ ] **Test fails (Red)** — Confirmed the test catches missing functionality
- [ ] **Implementation minimal** — Only enough to pass the test
- [ ] **Test passes (Green)** — Confirmed implementation works
- [ ] **Refactor clean** — Optimized without breaking tests
- [ ] **Traceability updated** — REQUIREMENTS.md table updated with test file

### Why TDD for Agentic Development?

| Without TDD | With TDD |
|-------------|----------|
| Speculative code that may never be used | Only code that's required |
| Regressions discovered later | Regressions caught immediately |
| "It works on my machine" | Verified by automated tests |
| Unknown test coverage | Coverage built incrementally |
| Hard to verify completion | Tests define "done" |

**For AI agents specifically:** TDD provides clear success criteria. Instead of guessing when a feature is "done," the tests define completion. Red → Green = Done.

---

## Context Files for LLM Agents

When working on this codebase, LLM agents should use these context patterns:

### Minimal Context (Quick Tasks)

```
Files to load:
- AGENTS.md (this file)
- The specific file being modified
```

### Standard Context (Feature Work)

```
Files to load:
- REQUIREMENTS.md
- AGENTS.md
- docs/ARCHITECTURE.md
- Relevant source files
```

### Full Context (Complex Tasks)

```
Files to load:
- REQUIREMENTS.md
- AGENTS.md
- docs/ARCHITECTURE.md
- docs/AUTH.md (if auth-related)
- docs/DATABASE.md (if data-related)
- docs/TESTING.md (if testing)
- All relevant source files
- Recent git log
```

### Context Window Management

If context is limited:

1. **Prioritize requirements** — Always include REQUIREMENTS.md
2. **Read structure first** — `ls` and `head` before full file reads
3. **Focused loading** — Only load files relevant to the current task
4. **Incremental reading** — Use offset/limit for large files

### Self-Documentation Pattern

Every file should be understandable without external context:

```go
// Package auth provides authentication and authorization middleware.
// It integrates with DSAccount SSO for user authentication.
//
// Key types:
//   - Middleware: HTTP middleware that validates sessions
//   - User: Authenticated user with tenant memberships
//
// Requirements implemented:
//   - FR-AUTH-001: Users authenticate via DSAccount SSO
//   - FR-AUTH-002: Unauthenticated requests redirect to SSO login
//   - FR-AUTH-003: Session includes user identity and tenant context
package auth
```

---

## Multi-Tenant Patterns

**Critical: Every database query must be tenant-scoped.**

### Backend Pattern

```go
// ✅ Correct - tenant scoped
tenantID := auth.GetTenantID(ctx)
if tenantID == "" {
    return api.Error(http.StatusBadRequest, "TENANT_REQUIRED", "Tenant context required")
}
pk := dynamo.BuildTenantKey(tenantID, "USER", userID)
result, err := repo.GetItem(ctx, pk)

// ❌ Wrong - no tenant scope (data leak risk!)
result, err := repo.Scan(ctx)
```

### Frontend Pattern

```tsx
// API client automatically includes X-Tenant-ID header
const { currentTenant, switchTenant } = useAuth();

// Tenant is set on auth and persisted
useEffect(() => {
  api.setTenant(currentTenant);
}, [currentTenant]);
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "details": {"user_id": "123"},
    "request_id": "abc-123"
  }
}
```

### Error Codes

| Code | Status | When |
|------|--------|------|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `TENANT_REQUIRED` | 400 | Missing tenant context |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Common Commands

```bash
# Build everything
make build

# Run all tests
make test

# Run unit tests only (fast)
make test-unit

# Run integration tests
make test-integration

# Start local dev
cd frontend && npm run dev  # :3000
cd backend && go run ./cmd/api  # :8080

# Lint
make lint

# Check coverage
make coverage
```

---

## When Stuck

1. **Re-read REQUIREMENTS.md** — Make sure you understand what's needed
2. **Check existing patterns** — Find similar code in the codebase
3. **Run tests** — Tests document expected behavior
4. **Check docs/** — Detailed documentation for each area
5. **Trace the flow** — Follow code from entry point to failure
6. **Document what you tried** — If still stuck, write down attempts

### Anti-Patterns to Avoid

| ❌ Don't | ✅ Do |
|----------|-------|
| Global database clients | Repository injection |
| Printf logging | Structured slog |
| Tenant-less queries | Always scope by tenant |
| Silent error catching | Log and return error response |
| Hardcoded strings | i18n translation keys |
| Class components | Functional components |
| Inline CSS | Tailwind utilities |
| Guessing without reading | Read existing code first |

---

## Document History

- **1.1.0** (2026-02-19): Expanded for agentic development - context patterns, standard prompts, issue workflow
- **1.0.0** (2026-02-18): Initial version - basic guidelines

---

*This document is AI-friendly by design. Agents: load this file at the start of every session.*
