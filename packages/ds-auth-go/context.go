package dsauth

import "context"

type contextKey string

const (
	userContextKey   contextKey = "dsauth_user"
	tenantContextKey contextKey = "dsauth_tenant"
)

// WithUser adds a User to the context.
func WithUser(ctx context.Context, user *User) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

// GetUser extracts the authenticated user from the context.
// Returns nil if no user is present (request not authenticated).
func GetUser(ctx context.Context) *User {
	user, _ := ctx.Value(userContextKey).(*User)
	return user
}

// WithTenant adds a tenant ID to the context.
func WithTenant(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, tenantContextKey, tenantID)
}

// GetTenantID extracts the current tenant ID from the context.
// Returns empty string if no tenant is set (personal/default context).
func GetTenantID(ctx context.Context) string {
	tenant, _ := ctx.Value(tenantContextKey).(string)
	return tenant
}

// MustGetUser extracts the authenticated user from the context.
// Panics if no user is present - use only in handlers where auth is guaranteed.
func MustGetUser(ctx context.Context) *User {
	user := GetUser(ctx)
	if user == nil {
		panic("dsauth: MustGetUser called without authenticated user in context")
	}
	return user
}

// MustGetTenantID extracts the tenant ID from the context.
// Panics if no tenant is set - use only where tenant context is guaranteed.
func MustGetTenantID(ctx context.Context) string {
	tenant := GetTenantID(ctx)
	if tenant == "" {
		panic("dsauth: MustGetTenantID called without tenant in context")
	}
	return tenant
}
