# NFR-TEST: Testing Non-Functional Requirements

> Authoritative reference for test coverage requirements, enforcement policies, and exception processes.
> Requirements trace to REQUIREMENTS.md: NFR-TEST-001 through NFR-TEST-004.

---

## Overview

Testing is a first-class concern in DS App Developer. All code changes must maintain or improve test coverage, and all tests must pass before deployment.

| Metric | Backend Target | Frontend Target | Enforcement |
|--------|---------------|-----------------|-------------|
| Unit Test Coverage | 80% | 70% (phased) | CI fails below threshold |
| Integration Tests | All API endpoints | Critical flows | CI gate |
| E2E Tests | N/A | Critical user flows | CI gate |

---

## NFR-TEST-001: Backend Unit Test Coverage

**Requirement:** Unit test coverage > 80% for backend Go code.

### Coverage Targets by Package

| Package | Minimum | Rationale |
|---------|---------|-----------|
| `internal/auth` | 85% | Security-critical authentication/authorization |
| `internal/api` | 80% | Request handling and validation |
| `internal/middleware` | 80% | Cross-cutting concerns (logging, recovery) |
| `internal/dynamo` | 75% | Data access layer |
| `internal/models` | 70% | Domain models (mostly struct definitions) |
| `internal/session` | 80% | Session management |
| `internal/health` | 75% | Health check logic |
| **Overall** | **80%** | Aggregate target |

### Current Status (2026-03-05)

| Package | Coverage | Status |
|---------|----------|--------|
| `internal/auth` | 31.2% | ⚠️ Below target |
| `internal/health` | 72.3% | ⚠️ Below target |
| `internal/api` | 0.0% | ❌ No coverage |
| `internal/dynamo` | 0.0% | ❌ No coverage |
| `internal/middleware` | 0.0% | ❌ No coverage |
| `internal/session` | 0.0% | ❌ No coverage |

**Action Required:** Backend coverage is below the 80% target. See [Gap Remediation](#gap-remediation) below.

### Measurement

```bash
# Generate coverage report
cd backend && go test -coverprofile=coverage.out ./...

# View overall coverage
go tool cover -func=coverage.out | grep total

# View per-package coverage
go tool cover -func=coverage.out

# HTML report for detailed analysis
go tool cover -html=coverage.out -o coverage.html
```

---

## NFR-TEST-002: Frontend Unit Test Coverage

**Requirement:** Frontend test coverage with phased targets reaching 70%.

### Phased Coverage Targets

Given the current low coverage baseline, targets are phased to allow incremental improvement:

| Phase | Timeline | Statements | Lines | Branches | Functions |
|-------|----------|------------|-------|----------|-----------|
| **Phase 1** (Current) | Baseline | 8% | 8% | 50% | 25% |
| **Phase 2** | +2 sprints | 30% | 30% | 55% | 40% |
| **Phase 3** | +4 sprints | 50% | 50% | 58% | 50% |
| **Phase 4** (Target) | +6 sprints | 70% | 70% | 60% | 60% |

### Current Status (2026-03-05)

| Metric | Current | Threshold | Gap |
|--------|---------|-----------|-----|
| Statements | 8.52% | 8% | ✅ At baseline |
| Branches | 55.4% | 50% | ✅ Above baseline |
| Functions | 26.47% | 25% | ✅ Above baseline |
| Lines | 8.52% | 8% | ✅ At baseline |

### Priority Test Areas

Focus new test coverage on these high-value areas:

1. **Hooks** (`src/hooks/`) - Core application logic
   - `useAuth.tsx` - Authentication state
   - `useTheme.tsx` - Theme management
   - `useConsent.tsx` - Cookie consent

2. **API Client** (`src/api/`) - Backend integration

3. **Critical Components** (`src/components/`)
   - `ErrorBoundary.tsx` - Error handling
   - `CookieConsent.tsx` - GDPR compliance
   - `DSNav.tsx` - Navigation

### Measurement

```bash
cd frontend

# Run tests with coverage
npm run test:coverage

# Coverage report output to terminal and coverage/ directory
```

### Vite Configuration

Coverage thresholds are enforced in `frontend/vite.config.ts`:

```typescript
test: {
  coverage: {
    thresholds: {
      statements: 8,
      branches: 50,
      functions: 25,
      lines: 8,
    }
  }
}
```

---

## NFR-TEST-003: Integration Tests

**Requirement:** Integration tests for all API endpoints.

### Scope

Integration tests verify end-to-end behavior with real (or simulated) dependencies:

- DynamoDB operations via DynamoDB Local
- Authentication flows with mocked DSAccount
- Health check endpoint dependencies

### Location

```
backend/test/integration/
├── api_test.go       # API endpoint tests
└── fixtures.go       # Test data builders
```

### Running Integration Tests

```bash
# Start DynamoDB Local
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
cd backend && go test -v ./test/integration/...
```

---

## NFR-TEST-004: E2E Tests

**Requirement:** E2E tests for critical user flows.

### Critical Flows Covered

| Flow | Spec File | Status |
|------|-----------|--------|
| Authentication | `auth.spec.ts` | ✅ |
| Navigation | `navigation.spec.ts` | ✅ |
| Theme/i18n | `theme-i18n.spec.ts` | ✅ |
| Accessibility | `accessibility.spec.ts` | ✅ |
| API Integration | `api-integration.spec.ts` | ✅ |

### Location

```
frontend/e2e/
├── auth.spec.ts
├── navigation.spec.ts
├── theme-i18n.spec.ts
├── accessibility.spec.ts
└── api-integration.spec.ts
```

### Running E2E Tests

```bash
cd frontend

# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run in headed mode
npx playwright test --headed
```

---

## CI Enforcement

### Backend Coverage Gate

Coverage is enforced in `.github/workflows/ci.yml`:

```yaml
- name: Check Go coverage
  run: |
    go test -coverprofile=coverage.out ./...
    COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80% threshold"
      exit 1
    fi
```

### Frontend Coverage Gate

Coverage thresholds configured in `vite.config.ts` cause test failure on regression.

### All Tests Must Pass

**NFR-TEST-004:** PRs cannot merge if any test fails. CI runs:
1. Backend unit tests (`go test ./...`)
2. Frontend unit tests (`npm test`)
3. E2E tests (`npx playwright test`)

---

## Exception Process

When coverage requirements cannot be met, the following exception process applies:

### 1. Document the Exception

Add a comment in the relevant test file or create a tracking issue:

```go
// COVERAGE-EXCEPTION: Repository methods use DynamoDB, tested via integration tests
// See: docs/NFR-TEST.md#exception-process
// Tracking: #ISSUE-NUMBER
```

### 2. Acceptable Exception Reasons

| Reason | Example | Mitigation |
|--------|---------|------------|
| **External Dependencies** | DynamoDB client wrappers | Integration tests |
| **Generated Code** | CDK outputs, type definitions | Exclude from coverage |
| **Infrastructure Code** | CDK constructs | CDK synth validation |
| **Trivial Code** | Struct definitions, constants | N/A |

### 3. Request Exception Approval

1. Create a DSKanban issue with:
   - Package/file affected
   - Current vs. required coverage
   - Exception reason from table above
   - Mitigation plan (e.g., integration tests)

2. Assign to tech lead for review

3. If approved, update coverage exclusion:

   **Go (coverprofile):**
   ```go
   //go:build !coverage
   ```

   **Vitest (vite.config.ts):**
   ```typescript
   coverage: {
     exclude: ['**/generated/**']
   }
   ```

### 4. Review Exceptions Quarterly

All coverage exceptions are reviewed quarterly. Exceptions that can be remediated should be converted to regular test coverage.

---

## Gap Remediation

### Backend Priority (Current: ~20% → Target: 80%)

1. **Week 1-2:** `internal/auth` (31% → 85%)
   - Add tests for token extraction edge cases
   - Test middleware with malformed tokens

2. **Week 3-4:** `internal/middleware` (0% → 80%)
   - Test logging middleware
   - Test recovery middleware panic handling
   - Test correlation ID propagation

3. **Week 5-6:** `internal/session` (0% → 80%)
   - Test session creation/upgrade flows
   - Test cookie handling
   - Test expiration logic

4. **Week 7-8:** `internal/api` (0% → 80%)
   - Test handlers with mocked repositories
   - Test error response formatting

5. **Week 9-10:** `internal/dynamo` (0% → 75%)
   - Test key builders
   - Integration tests for CRUD operations

### Frontend Priority (Current: 8% → Target: 70%)

Following phased approach with priorities:

1. **Phase 2 Focus:** Hooks (highest value)
2. **Phase 3 Focus:** API client + critical components
3. **Phase 4 Focus:** Remaining components + pages

---

## Traceability

| Requirement | This Document | Implementation |
|-------------|---------------|----------------|
| NFR-TEST-001 | [Backend Coverage](#nfr-test-001-backend-unit-test-coverage) | `go test -cover` |
| NFR-TEST-002 | [Integration Tests](#nfr-test-003-integration-tests) | `backend/test/integration/` |
| NFR-TEST-003 | [E2E Tests](#nfr-test-004-e2e-tests) | `frontend/e2e/` |
| NFR-TEST-004 | [CI Enforcement](#ci-enforcement) | `.github/workflows/` |

---

## Related Documentation

- [TESTING.md](./TESTING.md) - Testing patterns and conventions
- [TEST-TEMPLATES.md](./TEST-TEMPLATES.md) - Copy-paste test templates
- [NFR-CHECKLIST.md](./NFR-CHECKLIST.md) - Overall NFR verification
- [REQUIREMENTS.md](../REQUIREMENTS.md) - Source of truth for requirements

---

*Last updated: 2026-03-05*
*Created for: Issue #1109*
