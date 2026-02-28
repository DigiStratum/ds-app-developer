package dsauth

import (
	"context"
	"net/http"
)

// TenantValidator is a function that validates if a user has access to a tenant.
type TenantValidator func(user *User, tenantID string) bool

// DefaultTenantValidator checks if the tenant ID is in the user's tenant list.
func DefaultTenantValidator(user *User, tenantID string) bool {
	if user == nil || tenantID == "" {
		return false
	}
	for _, t := range user.Tenants {
		if t.ID == tenantID {
			return true
		}
	}
	return false
}

// RequireTenantMiddleware creates middleware that requires a valid tenant context.
// Requests without X-Tenant-ID header or with invalid tenant access are rejected.
func RequireTenantMiddleware(validator TenantValidator) func(http.Handler) http.Handler {
	if validator == nil {
		validator = DefaultTenantValidator
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUser(r.Context())
			tenantID := GetTenantID(r.Context())

			if tenantID == "" {
				http.Error(w, `{"error":{"code":"TENANT_REQUIRED","message":"X-Tenant-ID header is required"}}`, http.StatusBadRequest)
				return
			}

			if !validator(user, tenantID) {
				http.Error(w, `{"error":{"code":"TENANT_FORBIDDEN","message":"Access to this tenant is not allowed"}}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// ExtractTenantFromSubdomain extracts tenant ID from subdomain (e.g., acme.app.example.com -> acme).
// Returns empty string if no subdomain tenant is found.
func ExtractTenantFromSubdomain(r *http.Request, baseDomain string) string {
	host := r.Host
	if len(host) <= len(baseDomain) {
		return ""
	}
	// Check if it ends with base domain
	if host[len(host)-len(baseDomain):] != baseDomain {
		return ""
	}
	// Extract subdomain
	subdomain := host[:len(host)-len(baseDomain)-1] // -1 for the dot
	// Handle nested subdomains (take first part)
	for i, c := range subdomain {
		if c == '.' {
			return subdomain[:i]
		}
	}
	return subdomain
}

// TenantFromSubdomainMiddleware extracts tenant from subdomain and adds to context.
// If X-Tenant-ID header is also present, the header takes precedence.
func TenantFromSubdomainMiddleware(baseDomain string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			// Check if tenant already set (from header via auth middleware)
			if GetTenantID(ctx) == "" {
				// Try to extract from subdomain
				tenantID := ExtractTenantFromSubdomain(r, baseDomain)
				if tenantID != "" {
					ctx = WithTenant(ctx, tenantID)
				}
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// SetTenantHeader is a helper for HTTP clients to set the X-Tenant-ID header.
func SetTenantHeader(ctx context.Context, req *http.Request) {
	tenantID := GetTenantID(ctx)
	if tenantID != "" {
		req.Header.Set("X-Tenant-ID", tenantID)
	}
}
