package auth

import "context"

// ContextKey type for auth context keys
type ContextKey string

// Exported context keys for testing
const (
	UserContextKey   ContextKey = "user"
	TenantContextKey ContextKey = "tenant"
)

// SetUser adds a user to the context (useful for testing)
func SetUser(ctx context.Context, user *User) context.Context {
	return context.WithValue(ctx, UserContextKey, user)
}

// SetTenantID adds a tenant ID to the context (useful for testing)
func SetTenantID(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, TenantContextKey, tenantID)
}
