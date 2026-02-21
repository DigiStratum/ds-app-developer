# Authentication & SSO Integration

> This document describes the DSAccount SSO integration pattern for DS App Developer.
> All DigiStratum applications follow this pattern for centralized authentication.

---

## Table of Contents
1. [Overview](#overview)
2. [DSAccount SSO Flow](#dsaccount-sso-flow)
3. [Token Handling](#token-handling)
4. [Session Management](#session-management)
5. [Logout Flow](#logout-flow)
6. [Multi-Tenant Context](#multi-tenant-context)
7. [Backend Implementation](#backend-implementation)
8. [Frontend Implementation](#frontend-implementation)
9. [Environment Configuration](#environment-configuration)
10. [Security Considerations](#security-considerations)
11. [Production Checklist](#production-checklist)

---

## Overview

### Authentication Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Browser   │────▶│  DS App (this)  │────▶│  DSAccount   │
│             │◀────│                 │◀────│  SSO Server  │
└─────────────┘     └─────────────────┘     └──────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   DynamoDB    │
                    │  (user data)  │
                    └───────────────┘
```

### Key Principles

1. **Centralized Authentication** - All auth through DSAccount SSO
2. **Stateless Backend** - Session tokens validated on each request
3. **Secure Cookies** - HttpOnly, Secure, SameSite=Lax
4. **Multi-Tenant Aware** - Every session includes tenant context

### Requirements Traceability

| Requirement | Description | Status |
|-------------|-------------|--------|
| FR-AUTH-001 | Users authenticate via DSAccount SSO | ✅ Implemented |
| FR-AUTH-002 | Unauthenticated requests redirect to SSO login | ✅ Implemented |
| FR-AUTH-003 | Session includes user identity and tenant context | ✅ Implemented |
| FR-AUTH-004 | Logout clears session and redirects to DSAccount | ✅ Implemented |

---

## DSAccount SSO Flow

### Login Sequence

```
┌────────┐     ┌───────────┐     ┌────────────┐
│Browser │     │  DS App   │     │ DSAccount  │
└───┬────┘     └─────┬─────┘     └─────┬──────┘
    │                │                 │
    │ GET /api/*     │                 │
    │───────────────▶│                 │
    │                │                 │
    │ No token found │                 │
    │                │                 │
    │ 302 Redirect   │                 │
    │◀───────────────│                 │
    │                │                 │
    │ GET /oauth/authorize?app_id=xxx&redirect_uri=xxx
    │─────────────────────────────────▶│
    │                │                 │
    │                │   User Login    │
    │                │   (if needed)   │
    │                │                 │
    │ 302 Redirect with code           │
    │◀─────────────────────────────────│
    │                │                 │
    │ GET /auth/callback?code=xxx      │
    │───────────────▶│                 │
    │                │                 │
    │                │ Exchange code   │
    │                │───────────────▶│
    │                │                 │
    │                │ Token response  │
    │                │◀───────────────│
    │                │                 │
    │ Set-Cookie:    │                 │
    │ ds_session=xxx │                 │
    │ 302 → /        │                 │
    │◀───────────────│                 │
    │                │                 │
```

### SSO Redirect URL Format

```
https://account.digistratum.com/oauth/authorize
  ?app_id=<DSACCOUNT_APP_ID>
  &redirect_uri=<APP_URL>/auth/callback
  &response_type=code
  &scope=openid+profile+email
```

---

## Token Handling

### Token Sources

The backend accepts tokens from two sources (in priority order):

1. **Authorization Header** (for API clients)
   ```
   Authorization: Bearer <token>
   ```

2. **Session Cookie** (for browser sessions)
   ```
   Cookie: ds_session=<token>
   ```

### Token Extraction (Go)

```go
func extractToken(r *http.Request) string {
    // Check Authorization header first
    auth := r.Header.Get("Authorization")
    if strings.HasPrefix(auth, "Bearer ") {
        return strings.TrimPrefix(auth, "Bearer ")
    }
    
    // Check cookie
    cookie, err := r.Cookie("ds_session")
    if err == nil {
        return cookie.Value
    }
    
    return ""
}
```

### Token Validation

**Current State (Skeleton):** Mock validation returns a demo user.

**Production Implementation Required:**

```go
func validateToken(token string) (*User, error) {
    // 1. Validate JWT signature with DSAccount public key
    // 2. Check token expiration (exp claim)
    // 3. Verify audience (aud) matches this app
    // 4. Extract user claims (sub, email, name, tenants)
    
    // TODO: Implement actual DSAccount token validation
    // See: https://account.digistratum.com/docs/api/token-validation
}
```

### Token Refresh

For long-lived sessions, implement refresh token flow:

```go
// Check token expiration before processing request
if tokenExpiresWithin(token, 5*time.Minute) {
    newToken, err := refreshToken(token)
    if err != nil {
        // Token expired and can't refresh - redirect to SSO
        redirectToSSO(w, r)
        return
    }
    // Update session cookie with new token
    setSessionCookie(w, newToken)
}
```

---

## Session Management

### Session Cookie Configuration

```go
http.SetCookie(w, &http.Cookie{
    Name:     "ds_session",
    Value:    token,
    Path:     "/",
    HttpOnly: true,      // Prevent XSS access
    Secure:   true,      // HTTPS only
    SameSite: http.SameSiteLaxMode,  // CSRF protection
    Expires:  time.Now().Add(24 * time.Hour),
})
```

### Cookie Security Attributes

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `HttpOnly` | true | Prevents JavaScript access (XSS mitigation) |
| `Secure` | true | HTTPS only (prevents MITM) |
| `SameSite` | Lax | CSRF protection while allowing SSO redirects |
| `Path` | "/" | Available to all routes |

### Session Lifetime

- **Default:** 24 hours
- **Sliding expiration:** Refresh cookie on successful requests
- **Absolute expiration:** Re-authenticate after max lifetime

---

## Logout Flow

### Logout Sequence

```
┌────────┐     ┌───────────┐     ┌────────────┐
│Browser │     │  DS App   │     │ DSAccount  │
└───┬────┘     └─────┬─────┘     └─────┬──────┘
    │                │                 │
    │ GET /auth/logout                 │
    │───────────────▶│                 │
    │                │                 │
    │ Clear ds_session cookie          │
    │ (MaxAge: -1)   │                 │
    │                │                 │
    │ 302 Redirect   │                 │
    │◀───────────────│                 │
    │                │                 │
    │ GET /logout    │                 │
    │─────────────────────────────────▶│
    │                │                 │
    │                │  Global logout  │
    │                │  (all DS apps)  │
    │                │                 │
```

### Logout Implementation (Go)

```go
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
    // Clear local session cookie
    http.SetCookie(w, &http.Cookie{
        Name:     "ds_session",
        Value:    "",
        Path:     "/",
        HttpOnly: true,
        Secure:   true,
        MaxAge:   -1,  // Delete cookie
    })

    // Redirect to DSAccount for global logout
    ssoURL := os.Getenv("DSACCOUNT_SSO_URL")
    if ssoURL == "" {
        ssoURL = "https://account.digistratum.com"
    }
    http.Redirect(w, r, ssoURL+"/logout", http.StatusFound)
}
```

### Frontend Logout

```typescript
const logout = () => {
    localStorage.removeItem('currentTenant');
    window.location.href = '/auth/logout';
};
```

---

## Multi-Tenant Context

### Tenant Header Pattern

All authenticated API requests include tenant context via header:

```
X-Tenant-ID: <tenant-id>
```

Empty or missing header = personal/no-tenant context.

### Middleware Implementation

```go
func Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // ... token validation ...
        
        // Extract tenant from header [FR-TENANT-004]
        tenantID := r.Header.Get("X-Tenant-ID")
        
        // Add to context
        ctx := context.WithValue(r.Context(), tenantContextKey, tenantID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### Tenant Context Helpers

```go
// Get tenant from context
func GetTenantID(ctx context.Context) string {
    tenant, _ := ctx.Value(tenantContextKey).(string)
    return tenant
}

// In handlers - validate tenant when required
func GetResourceHandler(w http.ResponseWriter, r *http.Request) {
    tenantID := auth.GetTenantID(r.Context())
    if tenantID == "" {
        WriteError(w, http.StatusBadRequest, "TENANT_REQUIRED", "...")
        return
    }
    // Use tenantID for scoped queries
}
```

### Frontend Tenant Sync

```typescript
// ApiClient syncs tenant for all requests
class ApiClient {
    private tenantId: string | null = null;

    setTenant(tenantId: string | null) {
        this.tenantId = tenantId;
    }

    private async request<T>(...): Promise<T> {
        const headers: Record<string, string> = { ... };
        if (this.tenantId) {
            headers['X-Tenant-ID'] = this.tenantId;
        }
        // ...
    }
}
```

---

## Backend Implementation

### File Structure

```
backend/internal/auth/
├── middleware.go      # Auth middleware, context utilities
├── middleware_test.go # Test coverage
└── handlers.go        # SSO callback, logout handlers
```

### Middleware (`middleware.go`)

Key responsibilities:
- Extract token from header/cookie
- Validate token with DSAccount
- Inject user + tenant into request context
- Redirect unauthenticated requests to SSO

### Handlers (`handlers.go`)

| Endpoint | Handler | Purpose |
|----------|---------|---------|
| `GET /auth/callback` | `CallbackHandler` | SSO OAuth callback |
| `GET /auth/logout` | `LogoutHandler` | Session logout |

### Route Registration (`main.go`)

```go
// Health check (no auth required)
mux.HandleFunc("GET /health", api.HealthHandler)

// API routes (auth required)
authedMux := http.NewServeMux()
authedMux.HandleFunc("GET /api/me", api.GetCurrentUserHandler)
authedMux.HandleFunc("GET /api/tenant", api.GetCurrentTenantHandler)
mux.Handle("/api/", auth.Middleware(authedMux))

// SSO callbacks (no auth middleware)
mux.HandleFunc("GET /auth/callback", auth.CallbackHandler)
mux.HandleFunc("GET /auth/logout", auth.LogoutHandler)
```

---

## Frontend Implementation

### File Structure

```
frontend/src/
├── api/client.ts           # HTTP client with tenant headers
├── hooks/useAuth.tsx       # Auth context and hook
└── __tests__/auth.test.tsx # Test coverage
```

### Auth Context (`useAuth.tsx`)

Provides:
- `user` - Current authenticated user (null if unauthenticated)
- `currentTenant` - Current tenant ID (null for personal)
- `isLoading` - Auth check in progress
- `login()` - Redirect to SSO
- `logout()` - Clear session and redirect
- `switchTenant(tenantId)` - Change tenant context

### Protected Routes

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading, login } = useAuth();

    if (isLoading) return <LoadingSpinner />;
    if (!user) return <LoginPrompt onLogin={login} />;
    return <>{children}</>;
}
```

---

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DSACCOUNT_SSO_URL` | DSAccount base URL | `https://account.digistratum.com` |
| `DSACCOUNT_APP_ID` | App identifier for SSO | `ds-app-developer` |
| `APP_URL` | This app's base URL | `https://app.digistratum.com` |
| `DYNAMODB_TABLE` | Table name override | `AppTable-prod` |

### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | API base URL | `/api` or `https://api.example.com` |

---

## Security Considerations

### OWASP Compliance (NFR-SEC-001)

| Threat | Mitigation |
|--------|------------|
| **XSS** | HttpOnly cookies, CSP headers |
| **CSRF** | SameSite=Lax cookies |
| **Injection** | Input validation, parameterized queries |
| **Session Hijacking** | Secure cookies, short expiration |
| **Broken Auth** | Centralized DSAccount SSO |

### Cookie Security

- ✅ `HttpOnly` - Prevents XSS token theft
- ✅ `Secure` - HTTPS only in production
- ✅ `SameSite=Lax` - CSRF protection

### Token Security

- Validate signature against DSAccount public key
- Check expiration before processing
- Verify audience claim matches this app
- Never log token values

### Tenant Isolation

- All data queries scoped to tenant
- Never use table scans without tenant filter
- Validate tenant membership before access

---

## Production Checklist

### Before Deployment

- [ ] **Token Validation** - Replace mock validation with actual DSAccount JWT validation
- [ ] **Token Refresh** - Implement refresh token flow for long sessions
- [ ] **Error Handling** - Add retry logic for DSAccount API calls
- [ ] **Rate Limiting** - Protect auth endpoints from brute force
- [ ] **Logging** - Log auth events (without sensitive data)
- [ ] **Monitoring** - Alert on high auth failure rates

### Configuration

- [ ] `DSACCOUNT_SSO_URL` set for environment
- [ ] `DSACCOUNT_APP_ID` registered with DSAccount
- [ ] `APP_URL` matches actual deployment URL
- [ ] Session cookie expiration tuned for use case

### Testing

- [ ] SSO login flow end-to-end
- [ ] Token validation with expired tokens
- [ ] Logout from app clears session
- [ ] Logout from DSAccount clears all apps
- [ ] Multi-tenant switching updates context
- [ ] Unauthenticated API access returns 401/redirect

---

## Implementation Status

### Completed ✅

- Auth middleware with token extraction
- SSO redirect for unauthenticated requests
- Session cookie management
- Logout handler with DSAccount redirect
- Tenant context extraction from header
- Frontend auth provider with tenant sync
- Protected route pattern
- Test coverage for auth flows

### Production TODOs 🚧

1. **Token Validation** - `validateToken()` in `middleware.go` needs actual DSAccount integration
2. **Token Refresh** - Implement refresh flow before token expiration
3. **Callback Handler** - `CallbackHandler` needs actual code-to-token exchange

---

*Document version: 1.0.0*
*Last updated: 2026-02-19*
