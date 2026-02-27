// Package auth provides authentication middleware and context helpers.
// Copy the canonical dsauth package from ds-app-developer/backend/pkg/dsauth/
// for SSO integration with DSAccount.
package auth

import (
	"context"
	"net/http"
)

type contextKey string

const (
	userKey   contextKey = "user"
	tenantKey contextKey = "tenant"
)

// User represents an authenticated user.
type User struct {
	ID       string   `json:"id"`
	Email    string   `json:"email"`
	Name     string   `json:"name"`
	Tenants  []string `json:"tenants"`
}

// GetUser retrieves the authenticated user from context.
func GetUser(ctx context.Context) *User {
	if u, ok := ctx.Value(userKey).(*User); ok {
		return u
	}
	return nil
}

// GetTenantID retrieves the current tenant ID from context.
func GetTenantID(ctx context.Context) string {
	if t, ok := ctx.Value(tenantKey).(string); ok {
		return t
	}
	return ""
}

// SetUser adds the user to the context.
func SetUser(ctx context.Context, user *User) context.Context {
	return context.WithValue(ctx, userKey, user)
}

// SetTenantID adds the tenant ID to the context.
func SetTenantID(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, tenantKey, tenantID)
}

// Middleware validates authentication and sets user/tenant context.
// TODO: Implement actual SSO validation using dsauth package.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// TODO: Validate session cookie and set user context
		// See ds-app-developer/backend/pkg/dsauth for implementation
		next.ServeHTTP(w, r)
	})
}
