# ds-auth-go

DigiStratum shared authentication package for Go applications. Provides SSO integration with DSAccount and multi-tenant support.

## Installation

```bash
go get github.com/digistratum/ds-auth
```

## Quick Start

```go
package main

import (
    "net/http"
    dsauth "github.com/digistratum/ds-auth"
)

func main() {
    // Configure auth
    cfg := dsauth.Config{
        SSOBaseURL: "https://account.digistratum.com",
        AppID:      "your-app-id",
        AppURL:     "https://your-app.example.com",
    }

    // Create handlers for auth routes
    authHandlers := dsauth.NewHandlers(cfg)

    mux := http.NewServeMux()

    // Register auth endpoints
    authHandlers.RegisterRoutes(mux, "/auth")
    // This registers:
    //   /auth/callback - SSO callback
    //   /auth/logout   - Logout
    //   /auth/login    - Initiate login
    //   /auth/me       - Get current user

    // Protected routes with redirect to SSO
    mux.Handle("/dashboard", dsauth.Middleware(cfg)(dashboardHandler))

    // API routes with 401 response (no redirect)
    mux.Handle("/api/", dsauth.APIMiddleware(cfg)(apiHandler))

    // Public routes with optional auth context
    mux.Handle("/public", dsauth.OptionalAuthMiddleware(cfg)(publicHandler))

    http.ListenAndServe(":8080", mux)
}
```

## Features

### Middleware Options

#### `Middleware(cfg)` - Page Protection
For HTML pages. Redirects unauthenticated users to SSO login.

```go
mux.Handle("/dashboard", dsauth.Middleware(cfg)(handler))
```

#### `APIMiddleware(cfg)` - API Protection
For JSON APIs. Returns 401 Unauthorized instead of redirecting.

```go
mux.Handle("/api/", dsauth.APIMiddleware(cfg)(handler))
```

#### `OptionalAuthMiddleware(cfg)` - Optional Auth
Extracts auth context if present but allows anonymous access.

```go
mux.Handle("/public", dsauth.OptionalAuthMiddleware(cfg)(handler))
```

### Context Utilities

```go
func handler(w http.ResponseWriter, r *http.Request) {
    // Get authenticated user (nil if not authenticated)
    user := dsauth.GetUser(r.Context())
    
    // Get current tenant ID (empty string if none)
    tenantID := dsauth.GetTenantID(r.Context())
    
    // Panic if user not present (use in protected routes only)
    user := dsauth.MustGetUser(r.Context())
    
    // Panic if tenant not set (use where tenant is required)
    tenantID := dsauth.MustGetTenantID(r.Context())
}
```

### Multi-Tenant Support

#### Require Tenant Context
```go
// Chain with auth middleware
handler := dsauth.APIMiddleware(cfg)(
    dsauth.RequireTenantMiddleware(nil)(actualHandler),
)
```

#### Custom Tenant Validation
```go
// Custom validator that checks additional permissions
validator := func(user *dsauth.User, tenantID string) bool {
    // Check user has access AND is admin
    return dsauth.DefaultTenantValidator(user, tenantID) && 
           isAdmin(user, tenantID)
}

handler := dsauth.RequireTenantMiddleware(validator)(actualHandler)
```

#### Subdomain Tenant Extraction
```go
// Extract tenant from subdomain (e.g., acme.app.example.com -> acme)
mux.Handle("/", dsauth.TenantFromSubdomainMiddleware("app.example.com")(
    dsauth.Middleware(cfg)(handler),
))
```

### Configuration

```go
cfg := dsauth.Config{
    // Required
    SSOBaseURL: "https://account.digistratum.com",  // DSAccount URL
    AppID:      "your-app-id",                       // App ID from DSAccount
    AppURL:     "https://your-app.example.com",      // Your app's base URL

    // Optional
    SessionCookieName: "ds_session",  // Default: "ds_session"
    SessionMaxAge:     86400,          // Default: 24 hours (in seconds)
    
    // Custom token validation (optional)
    TokenValidator: func(token string) (*dsauth.User, error) {
        // Your custom validation logic
        return validateWithYourService(token)
    },
}
```

## Types

### User
```go
type User struct {
    ID       string   `json:"id"`
    Email    string   `json:"email"`
    Name     string   `json:"name"`
    Tenants  []string `json:"tenants"`  // Tenant IDs user belongs to
}
```

## Integration with HTTP Clients

When making requests to other services that require tenant context:

```go
req, _ := http.NewRequest("GET", "https://other-service/api", nil)
dsauth.SetTenantHeader(r.Context(), req)  // Sets X-Tenant-ID if present
client.Do(req)
```

## Testing

The package provides context helpers for testing:

```go
func TestHandler(t *testing.T) {
    user := &dsauth.User{ID: "test-user"}
    ctx := dsauth.WithUser(context.Background(), user)
    ctx = dsauth.WithTenant(ctx, "test-tenant")
    
    req := httptest.NewRequest("GET", "/", nil).WithContext(ctx)
    // ... test your handler
}
```

## License

MIT
