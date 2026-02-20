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
- **NFR-AVAIL-003:** Health check endpoint at /health (shallow and deep modes)
  - Shallow: Unauthenticated, fast probe for load balancers
  - Deep: Authenticated, checks all dependencies with latency metrics

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

| Requirement | Implementation | Test Coverage | Status |
|-------------|----------------|---------------|--------|
| FR-AUTH-001 | `backend/internal/auth/middleware.go`, `backend/internal/auth/handlers.go` | `backend/internal/auth/middleware_test.go`, `frontend/src/__tests__/auth.test.tsx` | ✅ |
| FR-AUTH-002 | `backend/internal/auth/middleware.go:RequireAuthMiddleware` | `backend/internal/auth/middleware_test.go:TestRequireAuthMiddleware_WithoutAuth_Redirects` | ✅ |
| FR-AUTH-003 | `backend/internal/auth/middleware.go:Middleware`, `frontend/src/hooks/useAuth.tsx` | `backend/internal/auth/middleware_test.go:TestMiddleware_WithAuthenticatedSession_ExtractsUserContext`, `frontend/src/__tests__/auth.test.tsx` | ✅ |
| FR-AUTH-004 | `backend/internal/auth/handlers.go:LogoutHandler` | `frontend/src/__tests__/auth.test.tsx:FR-AUTH-004 Logout` | ✅ |
| FR-TENANT-001 | `backend/internal/auth/middleware.go:GetTenantID`, `frontend/src/hooks/useAuth.tsx` | `backend/internal/auth/middleware_test.go:TestGetTenantID_FromContext`, `frontend/src/__tests__/auth.test.tsx:FR-TENANT-001` | ✅ |
| FR-TENANT-002 | `frontend/src/components/DSNav.tsx` (tenant switcher dropdown) | `frontend/e2e/navigation.spec.ts` (indirect) | ⚠️ |
| FR-TENANT-003 | `backend/internal/dynamo/repository.go:BuildTenantKey/BuildTenantPrefix` | - | ⚠️ |
| FR-TENANT-004 | `backend/internal/auth/middleware.go` (X-Tenant-ID header extraction) | `backend/internal/auth/middleware_test.go:TestMiddleware_ExtractsTenantFromHeader` | ✅ |
| FR-NAV-001 | `frontend/src/components/DSNav.tsx`, `frontend/src/components/Layout.tsx` | `frontend/e2e/navigation.spec.ts` | ✅ |
| FR-NAV-002 | `frontend/src/components/DSNav.tsx` (app-switcher) | `frontend/e2e/navigation.spec.ts` (indirect) | ⚠️ |
| FR-NAV-003 | `frontend/src/components/Footer.tsx` | - | ⚠️ |
| FR-NAV-004 | `frontend/src/components/DSNav.tsx` (mobile menu), `frontend/src/components/Layout.tsx` | `frontend/e2e/navigation.spec.ts:Mobile Navigation` | ✅ |
| FR-THEME-001 | `frontend/src/hooks/useTheme.tsx`, `frontend/src/styles/globals.css` | `frontend/e2e/theme-i18n.spec.ts:can toggle between light and dark mode` | ✅ |
| FR-THEME-002 | `frontend/src/hooks/useTheme.tsx` (localStorage) | `frontend/e2e/theme-i18n.spec.ts:theme preference persists across page loads` | ✅ |
| FR-THEME-003 | `frontend/src/styles/globals.css` (CSS variables) | `frontend/e2e/theme-i18n.spec.ts` (indirect) | ✅ |
| FR-I18N-001 | `frontend/src/i18n/config.ts`, `frontend/public/locales/{en,es,fr}/translation.json` | `frontend/e2e/theme-i18n.spec.ts:translations load without errors` | ✅ |
| FR-I18N-002 | - | - | ❌ Not implemented |
| FR-I18N-003 | `frontend/src/i18n/config.ts` (localStorage via LanguageDetector) | `frontend/e2e/theme-i18n.spec.ts:default language is loaded` | ⚠️ |
| NFR-PERF-001 | Infrastructure: CloudFront CDN (`cdk/lib/skeleton-stack.ts`) | - | ⚠️ No automated test |
| NFR-PERF-002 | `cdk/lib/constructs/monitoring.ts:PerformanceBaselines.apiLatencyP95Ms` (500ms target) | - | ⚠️ No automated test |
| NFR-PERF-003 | Infrastructure design (CloudFront + Lambda) | - | ⚠️ No automated test |
| NFR-AVAIL-001 | `cdk/lib/constructs/monitoring.ts:PerformanceBaselines.availabilityTarget` (99.9%) | - | ⚠️ Infra only |
| NFR-AVAIL-002 | `backend/internal/health/health.go:CalculateOverallStatus` (graceful degradation) | `backend/internal/health/health_test.go:TestCalculateOverallStatus` | ✅ |
| NFR-AVAIL-003 | `backend/internal/health/health.go`, `backend/internal/health/handler.go` | `backend/internal/health/health_test.go` (comprehensive) | ✅ |
| NFR-SEC-001 | Partial: redirect sanitization in `backend/internal/auth/handlers.go` | `backend/internal/auth/handlers_test.go` (partial) | ⚠️ |
| NFR-SEC-002 | `cdk/lib/skeleton-stack.ts`: CloudFront HTTPS_ONLY, REDIRECT_TO_HTTPS | - | ⚠️ Infra only |
| NFR-SEC-003 | `cdk/lib/skeleton-stack.ts` comment: "DSACCOUNT_APP_SECRET injected post-deploy" | - | ⚠️ Infra only |
| NFR-SEC-004 | `backend/internal/middleware/recovery.go` (standardized error response) | - | ⚠️ Partial |
| NFR-SEC-005 | `cdk/lib/skeleton-stack.ts`: API Gateway CORS configuration | - | ⚠️ Infra only |
| NFR-A11Y-001 | Frontend components use semantic HTML, aria attributes | `frontend/e2e/accessibility.spec.ts` (comprehensive) | ✅ |
| NFR-A11Y-002 | `frontend/src/components/*.tsx` (semantic elements: header, main, nav, footer) | `frontend/e2e/accessibility.spec.ts:page has proper heading hierarchy`, `main landmark is present` | ✅ |
| NFR-A11Y-003 | `frontend/src/components/DSNav.tsx` (keyboard handlers), `frontend/e2e/navigation.spec.ts` | `frontend/e2e/accessibility.spec.ts:Focus Management`, `frontend/e2e/navigation.spec.ts:Keyboard Navigation` | ✅ |
| NFR-A11Y-004 | aria-labels throughout components | `frontend/e2e/accessibility.spec.ts:buttons have accessible names`, `Live Regions` | ✅ |
| NFR-TEST-001 | Current: Backend 31% auth, 72% health; Frontend needs measurement | - | ⚠️ Below target |
| NFR-TEST-002 | `backend/test/integration/api_test.go` | Partial (health endpoint tested, others TODO) | ⚠️ |
| NFR-TEST-003 | `frontend/e2e/*.spec.ts` (auth, navigation, theme-i18n, accessibility, api-integration) | E2E tests exist for critical flows | ✅ |
| NFR-TEST-004 | `.github/workflows/*.yml` (CI/CD gates) | - | ⚠️ Infra only |
| NFR-MON-001 | `backend/internal/middleware/logging.go:LoggingMiddleware`, `backend/cmd/api/main.go` (JSON handler) | - | ✅ Impl verified |
| NFR-MON-002 | `cdk/lib/constructs/monitoring.ts:ErrorRateAlarm` | - | ✅ Impl verified |
| NFR-MON-003 | `cdk/lib/constructs/monitoring.ts` (dashboard with P95, P99 latency graphs) | - | ✅ Impl verified |
| NFR-MON-004 | `backend/internal/middleware/correlation.go:CorrelationIDMiddleware` | - | ✅ Impl verified |

**Status Legend:**
- ✅ Implementation + test coverage verified
- ⚠️ Partially implemented or tested; may need additional coverage
- ❌ Not implemented
- 🚧 In progress

## Gaps and Recommendations

### Not Implemented
1. **FR-I18N-002 (Dynamic content translation):** No implementation found for on-the-fly translation of dynamic content. Consider integrating a translation API or caching layer.

### Partial Implementation / Missing Tests
1. **FR-TENANT-002:** Tenant switcher UI exists but no dedicated unit test for switch behavior.
2. **FR-TENANT-003:** Tenant-scoped query functions exist but no test coverage for repository layer.
3. **FR-NAV-002/003:** App-switcher and Footer implemented but no dedicated tests.
4. **FR-I18N-003:** Language detection exists but no explicit test for preference persistence.
5. **NFR-PERF-*:** Performance targets defined in monitoring but no automated performance tests (consider Lighthouse CI or k6).
6. **NFR-SEC-001:** Only partial OWASP coverage (redirect sanitization). Consider security audit.
7. **NFR-SEC-004:** Input validation exists for some flows but not systematically tested.
8. **NFR-TEST-001:** Backend coverage well below 80% target. Need unit tests for: `api`, `dynamo`, `featureflags`, `session`, `theme`, `middleware`.

### Infrastructure-Only (Not Unit Testable)
- NFR-SEC-002, NFR-SEC-003, NFR-SEC-005: TLS, secrets, CORS are CDK/infrastructure concerns.
- NFR-AVAIL-001: Uptime is an operational metric, not a testable requirement.
- NFR-TEST-004: CI/CD gating is workflow configuration.

---
*Last updated: 2026-02-20*
*Verified by: AI Agent (requirements verification task)*
