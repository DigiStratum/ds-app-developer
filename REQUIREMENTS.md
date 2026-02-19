# Requirements - DS App Skeleton

> Requirements live with code. Update iteratively as the app evolves.
> Tests trace to requirement IDs. Agents reference this document.

## Functional Requirements

### FR-AUTH: Authentication & Authorization
- **FR-AUTH-001:** Users authenticate via DSAccount SSO
- **FR-AUTH-002:** Unauthenticated requests redirect to SSO login
- **FR-AUTH-003:** Session includes user identity and tenant context
- **FR-AUTH-004:** Logout clears session and redirects to DSAccount logout

### FR-TENANT: Multi-Tenant Support
- **FR-TENANT-001:** User session identifies current tenant (or "none" for personal)
- **FR-TENANT-002:** Users with multiple tenants can switch via nav dropdown
- **FR-TENANT-003:** All data queries are scoped to current tenant
- **FR-TENANT-004:** API requests include X-Tenant-ID header

### FR-NAV: Navigation
- **FR-NAV-001:** Standard header with logo (upper-left), nav links, tenant switcher, user menu
- **FR-NAV-002:** App-switcher shows available DS ecosystem apps
- **FR-NAV-003:** Footer with copyright and standard links
- **FR-NAV-004:** Mobile-responsive layout

### FR-THEME: Theming
- **FR-THEME-001:** Light and dark theme options
- **FR-THEME-002:** Theme preference stored in user session
- **FR-THEME-003:** Theme applied via CSS variables

### FR-I18N: Internationalization
- **FR-I18N-001:** Static strings loaded from language packs
- **FR-I18N-002:** Dynamic content translated and cached on-the-fly
- **FR-I18N-003:** Language preference stored in user session

## Non-Functional Requirements

### NFR-PERF: Performance
- **NFR-PERF-001:** Page load time < 3 seconds
- **NFR-PERF-002:** API response time < 500ms (p95)
- **NFR-PERF-003:** Time to interactive < 2 seconds

### NFR-AVAIL: Availability
- **NFR-AVAIL-001:** 99.9% uptime target
- **NFR-AVAIL-002:** Graceful degradation on dependency failures
- **NFR-AVAIL-003:** Health check endpoint at /health

### NFR-SEC: Security
- **NFR-SEC-001:** OWASP Top 10 compliance
- **NFR-SEC-002:** All data encrypted in transit (TLS 1.2+)
- **NFR-SEC-003:** Secrets stored in AWS Secrets Manager
- **NFR-SEC-004:** Input validation on all endpoints
- **NFR-SEC-005:** CORS configured for allowed origins only

### NFR-A11Y: Accessibility
- **NFR-A11Y-001:** WCAG 2.1 AA compliance
- **NFR-A11Y-002:** Semantic HTML structure
- **NFR-A11Y-003:** Keyboard navigation support
- **NFR-A11Y-004:** Screen reader compatibility

### NFR-TEST: Testing
- **NFR-TEST-001:** Unit test coverage > 80%
- **NFR-TEST-002:** Integration tests for all API endpoints
- **NFR-TEST-003:** E2E tests for critical user flows
- **NFR-TEST-004:** All tests must pass for deployment

### NFR-MON: Monitoring
- **NFR-MON-001:** Structured logging to CloudWatch
- **NFR-MON-002:** Error rate alerting
- **NFR-MON-003:** Latency percentile dashboards
- **NFR-MON-004:** Request correlation IDs

## Requirement Traceability

| Requirement | Test File | Status |
|-------------|-----------|--------|
| FR-AUTH-001 | `backend/internal/auth/middleware_test.go` | ✅ |
| FR-AUTH-002 | `backend/internal/auth/middleware_test.go`, `frontend/src/__tests__/auth.test.tsx` | ✅ |
| FR-AUTH-003 | `backend/internal/auth/middleware_test.go`, `frontend/src/__tests__/auth.test.tsx` | ✅ |
| FR-AUTH-004 | `frontend/src/__tests__/auth.test.tsx` | ✅ |
| FR-TENANT-001 | `backend/internal/auth/middleware_test.go`, `frontend/src/__tests__/auth.test.tsx` | ✅ |
| FR-TENANT-002 | `frontend/src/components/DSNav.tsx`, `frontend/src/hooks/useAuth.tsx` | ⚠️ |
| FR-TENANT-003 | `backend/internal/dynamo/repository.go` | ⚠️ |
| FR-TENANT-004 | `backend/internal/auth/middleware_test.go` | ✅ |
| FR-NAV-001 | `frontend/src/components/Layout.tsx`, `frontend/src/components/DSNav.tsx` | ✅ |
| FR-NAV-002 | `frontend/src/components/DSNav.tsx` | ✅ |
| FR-NAV-003 | `frontend/src/components/Footer.tsx` | ✅ |
| FR-NAV-004 | `frontend/src/components/DSNav.tsx`, `frontend/src/components/Layout.tsx` | ✅ |
| FR-THEME-001 | `frontend/src/hooks/useTheme.tsx`, `frontend/src/styles/globals.css` | ✅ |
| FR-THEME-002 | `frontend/src/hooks/useTheme.tsx` | ✅ |
| FR-THEME-003 | `frontend/src/styles/globals.css` | ✅ |
| FR-I18N-001 | - | ❌ |
| FR-I18N-002 | - | ❌ |
| FR-I18N-003 | - | ❌ |
| NFR-PERF-001 | - | ❌ |
| NFR-PERF-002 | - | ❌ |
| NFR-PERF-003 | - | ❌ |
| NFR-AVAIL-001 | - | ❌ |
| NFR-AVAIL-002 | - | ❌ |
| NFR-AVAIL-003 | - | ❌ |
| NFR-SEC-001 | - | ❌ |
| NFR-SEC-002 | - | ❌ |
| NFR-SEC-003 | - | ❌ |
| NFR-SEC-004 | - | ❌ |
| NFR-SEC-005 | - | ❌ |
| NFR-A11Y-001 | - | ❌ |
| NFR-A11Y-002 | - | ❌ |
| NFR-A11Y-003 | - | ❌ |
| NFR-A11Y-004 | - | ❌ |
| NFR-TEST-001 | - | ❌ |
| NFR-TEST-002 | - | ❌ |
| NFR-TEST-003 | - | ❌ |
| NFR-TEST-004 | - | ❌ |
| NFR-MON-001 | - | ❌ |
| NFR-MON-002 | - | ❌ |
| NFR-MON-003 | - | ❌ |
| NFR-MON-004 | - | ❌ |

**Status Legend:**
- ✅ Tested - Test coverage exists
- ⚠️ Partial - Some test coverage, needs expansion  
- ❌ Not tested - No test coverage yet
- 🚧 In progress - Tests being written

---
*Last updated: 2026-02-19*
