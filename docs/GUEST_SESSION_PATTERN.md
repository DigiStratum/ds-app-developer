# Guest Session + Optional Auth Pattern

This document describes the "guest-session-first" authentication pattern used in DS App Skeleton.

## Overview

Traditional web apps often require authentication immediately on first visit, redirecting users to a login page before they can see any content. The guest-session-first pattern takes a different approach:

1. **Anonymous sessions are created automatically** on first visit
2. **Users can browse freely** without being forced to authenticate
3. **Authentication is optional** until the user needs protected features
4. **Sessions survive the auth flow** — they're upgraded, not replaced

## Why This Pattern?

### User Experience
- Lower friction for first-time visitors
- Users can explore before committing to an account
- Pre-auth state (cart items, preferences) is preserved through login

### Technical Benefits
- Simplified state management (session always exists)
- Consistent tracking/analytics from first page view
- Easier A/B testing for anonymous users

## Implementation

### Backend: Session Middleware

The session middleware runs on every request and ensures a session exists:

```go
// session/middleware.go
func Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        store := GetStore()
        
        // Try to get existing session
        sessionID := GetSessionIDFromRequest(r)
        session := store.Get(sessionID)
        
        // Create anonymous session if none exists
        if session == nil {
            session = store.Create("")
            SetSessionCookie(w, r, session)
        }
        
        ctx := SetSession(r.Context(), session)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### Session Model

```go
type Session struct {
    ID         string    // Unique session identifier
    TenantID   string    // Current tenant context (optional)
    UserID     string    // Empty for guest sessions
    IsGuest    bool      // True until authenticated
    CreatedAt  time.Time
    ExpiresAt  time.Time
}

func (s *Session) IsAuthenticated() bool {
    return s.UserID != ""
}
```

### Session Upgrade on Login

When a user authenticates, we upgrade their existing session rather than creating a new one:

```go
func CallbackHandler(w http.ResponseWriter, r *http.Request) {
    // ... validate OAuth callback, get userID ...
    
    store := session.GetStore()
    sessionID := session.GetSessionIDFromRequest(r)
    existingSession := store.Get(sessionID)
    
    var sess *session.Session
    if existingSession != nil {
        // Upgrade preserves the session ID
        sess = store.Upgrade(sessionID, userID)
    } else {
        sess = store.Create("")
        store.Upgrade(sess.ID, userID)
    }
    
    session.SetSessionCookie(w, r, sess)
    // redirect back to app...
}
```

### Cross-Subdomain Sessions

Sessions are scoped to the tenant's domain to allow sharing across subdomains:

```go
func getCookieDomain(host string) string {
    parts := strings.Split(host, ".")
    if len(parts) < 2 {
        return ""
    }
    // Returns ".domain.tld" for subdomain sharing
    return "." + strings.Join(parts[len(parts)-2:], ".")
}
```

### Frontend: Auth Context

The frontend auth context supports both guest and authenticated states:

```typescript
interface AuthContext {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;  // true if session has user
  isGuest: boolean;          // true if session is anonymous
  login: (redirectTo?: string) => void;
  logout: () => void;
  switchTenant: (tenantId: string | null) => void;
}
```

### API Endpoint: `/api/session`

A dedicated endpoint returns the current session state:

```json
// Guest session
{
  "session_id": "abc12345...",
  "is_authenticated": false,
  "is_guest": true,
  "tenant_id": null,
  "user": null
}

// Authenticated session
{
  "session_id": "abc12345...",
  "is_authenticated": true,
  "is_guest": false,
  "tenant_id": "tenant-1",
  "user": {
    "id": "user-123",
    "email": "demo@example.com",
    "name": "Demo User",
    "tenants": ["tenant-1", "tenant-2"]
  }
}
```

## Route Protection

### Public Routes (Guest Access)
Routes that don't require authentication:
- Landing page (`/`)
- Documentation
- Pricing page
- etc.

### Protected Routes
Routes that require authentication use the `RequireAuth` middleware:

**Backend:**
```go
// Routes that require login
authedMux := http.NewServeMux()
authedMux.HandleFunc("GET /api/me", api.GetCurrentUserHandler)
mux.Handle("/api/", session.Middleware(auth.Middleware(session.RequireAuth(authedMux))))
```

**Frontend:**
```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) {
    return <LoginPrompt onLogin={login} />;
  }
  return <>{children}</>;
}
```

## Nav Bar Behavior

The navigation bar adapts based on auth state:

| State | Left Side | Right Side |
|-------|-----------|------------|
| Guest | App switcher, Logo, App name | Theme toggle, **Sign In / Sign Up** buttons |
| Authenticated | App switcher, Logo, App name | Theme toggle, Tenant switcher, User dropdown |

## Tenant Context

Tenants are scoped to the session and survive auth:

1. Guest visits `tenant.example.com` → session created with `tenant_id`
2. Guest browses the app (tenant context preserved)
3. Guest signs in → session upgraded, tenant context preserved
4. User can switch tenants via UI (updates session)

## Testing

### Backend Tests
```go
func TestMiddleware_WithGuestSession_AllowsAccess(t *testing.T) {
    // Guest sessions should pass through without user context
}

func TestSessionUpgrade_PreservesSessionID(t *testing.T) {
    // Session ID should survive auth flow
}
```

### Frontend Tests
```typescript
it('allows access with guest session', async () => {
  api.get.mockResolvedValue({ is_guest: true, is_authenticated: false });
  // Should render without requiring login
});

it('shows sign in button for guest sessions', async () => {
  // Guest users should see auth controls in nav
});
```

## Requirements Mapping

| Requirement | Implementation |
|-------------|----------------|
| FR-AUTH-001 | SSO via DSAccount (optional) |
| FR-AUTH-002 | Redirect to login only for protected routes |
| FR-AUTH-003 | Session includes user + tenant context |
| FR-AUTH-004 | Logout clears session |
| FR-TENANT-001 | Session scoped to tenant |
| FR-TENANT-004 | X-Tenant-ID header in API requests |

## Migration Notes

If migrating from a forced-auth pattern:

1. Add session middleware before auth middleware
2. Update auth middleware to enrich context (not block)
3. Add explicit `RequireAuth` to protected routes
4. Update frontend to handle `isGuest` state
5. Update nav to show auth controls for guests
