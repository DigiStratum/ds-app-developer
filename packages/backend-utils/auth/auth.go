// Package auth provides authentication middleware and context utilities.
package auth

import (
	"context"
	"net/http"
	"os"
)

type contextKey string

const (
	userContextKey   contextKey = "user"
	tenantContextKey contextKey = "tenant"
)

// User represents an authenticated user
type User struct {
	ID      string       `json:"id"`
	Email   string       `json:"email"`
	Name    string       `json:"display_name"`
	Tenants []TenantInfo `json:"tenants"`
}

// TenantInfo represents a user's membership in a tenant/org
type TenantInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}

// UserLoader is a function that loads user data by ID
// Implement this to integrate with your user service (e.g., DSAccount)
type UserLoader func(userID string) (*User, error)

// SessionAccessor provides access to session data
// Implement this interface to integrate with your session storage
type SessionAccessor interface {
	GetUserID(ctx context.Context) (string, bool)
	GetTenantID(ctx context.Context) (string, bool)
	IsAuthenticated(ctx context.Context) bool
}

// MiddlewareConfig configures the auth middleware
type MiddlewareConfig struct {
	// LoadUser loads user data for authenticated sessions
	LoadUser UserLoader
	// Session provides access to session data
	Session SessionAccessor
}

// Middleware validates authentication and extracts user/tenant context
// This works with session middleware to support both guest and authenticated sessions.
func Middleware(cfg MiddlewareConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var user *User
			var tenantID string

			// If we have an authenticated session, load the user
			if cfg.Session != nil && cfg.Session.IsAuthenticated(r.Context()) {
				if userID, ok := cfg.Session.GetUserID(r.Context()); ok && cfg.LoadUser != nil {
					loadedUser, err := cfg.LoadUser(userID)
					if err == nil {
						user = loadedUser
					}
				}
				if tid, ok := cfg.Session.GetTenantID(r.Context()); ok {
					tenantID = tid
				}
			}

			// Extract tenant from header if not in session
			if tenantID == "" {
				tenantID = r.Header.Get("X-Tenant-ID")
			}

			// Add user and tenant to context
			ctx := r.Context()
			if user != nil {
				ctx = context.WithValue(ctx, userContextKey, user)
			}
			ctx = context.WithValue(ctx, tenantContextKey, tenantID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAuth requires an authenticated user
// Returns a middleware that redirects to SSO if user is not authenticated
func RequireAuth(ssoURL, appID string) func(http.Handler) http.Handler {
	if ssoURL == "" {
		ssoURL = os.Getenv("DSACCOUNT_SSO_URL")
		if ssoURL == "" {
			ssoURL = "https://account.digistratum.com"
		}
	}
	if appID == "" {
		appID = os.Getenv("DSACCOUNT_APP_ID")
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUser(r.Context())

			if user == nil {
				redirectURL := ssoURL + "/api/sso/authorize?app_id=" + appID
				http.Redirect(w, r, redirectURL, http.StatusFound)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// GetUser extracts user from context
func GetUser(ctx context.Context) *User {
	user, _ := ctx.Value(userContextKey).(*User)
	return user
}

// GetTenantID extracts tenant ID from context
func GetTenantID(ctx context.Context) string {
	tenant, _ := ctx.Value(tenantContextKey).(string)
	return tenant
}

// WithUser adds a user to the context
func WithUser(ctx context.Context, user *User) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

// WithTenant adds a tenant ID to the context
func WithTenant(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, tenantContextKey, tenantID)
}
