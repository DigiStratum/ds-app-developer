package auth

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/DigiStratum/ds-app-developer/backend/internal/session"
)

type contextKey string

const (
	userContextKey   contextKey = "user"
	tenantContextKey contextKey = "tenant"
)

// User represents an authenticated user [FR-AUTH-003]
type User struct {
	ID      string       `json:"id"`
	Email   string       `json:"email"`
	Name    string       `json:"display_name"` // DSAccount uses display_name
	Tenants []TenantInfo `json:"tenants"`
}

// TenantInfo represents a user's membership in a tenant/org
type TenantInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}

// Middleware validates authentication and extracts user/tenant context [FR-AUTH-001]
// This works with the session middleware to support both guest and authenticated sessions.
//
// Guest session pattern:
// - Session middleware runs first, ensuring every request has a session
// - This middleware enriches the context with user data if session is authenticated
// - Unauthenticated sessions are allowed to pass through (guest mode)
//
// API key authentication (M2M/CLI):
// - Bearer token matching COMPONENTS_API_KEY env var creates system user
// - Used by ds-components CLI for component registry operations
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess := session.GetSession(r.Context())

		var user *User
		var tenantID string

		// Check for API key authentication (M2M/CLI access)
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			apiKey := os.Getenv("COMPONENTS_API_KEY")
			if apiKey != "" && token == apiKey {
				// API key auth - create synthetic user for M2M access
				user = &User{
					ID:    "system:cli",
					Email: "cli@digistratum.com",
					Name:  "DS Components CLI",
				}
				slog.Debug("authenticated via API key", "user_id", user.ID)
			}
		}

		// If we have an authenticated session, load the user
		if user == nil && sess != nil && sess.IsAuthenticated() {
			var err error
			user, err = loadUser(sess.UserID)
			if err != nil {
				slog.Warn("failed to load user for session", "user_id", sess.UserID, "error", err)
				// Don't fail the request - just proceed as guest
			}
			tenantID = sess.TenantID
		}

		// Extract tenant from header if not in session [FR-TENANT-004]
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

// RequireAuthMiddleware requires an authenticated user [FR-AUTH-002]
// Use this for routes that need a logged-in user (not just a session).
func RequireAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUser(r.Context())

		if user == nil {
			// Redirect to SSO login [FR-AUTH-002]
			// SECURITY: Only app_id is passed. redirect_uri comes from DSAccount app registration.
			ssoURL := os.Getenv("DSACCOUNT_SSO_URL")
			if ssoURL == "" {
				ssoURL = "https://account.digistratum.com"
			}
			redirectURL := ssoURL + "/api/sso/authorize?app_id=" + os.Getenv("DSACCOUNT_APP_ID")
			http.Redirect(w, r, redirectURL, http.StatusFound)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// GetUser extracts user from context
func GetUser(ctx context.Context) *User {
	user, _ := ctx.Value(userContextKey).(*User)
	return user
}

// GetTenantID extracts tenant ID from context [FR-TENANT-001]
func GetTenantID(ctx context.Context) string {
	tenant, _ := ctx.Value(tenantContextKey).(string)
	return tenant
}

// loadUser loads user data from DSAccount or cache
func loadUser(userID string) (*User, error) {
	// TODO: Implement actual DSAccount user lookup
	// For the boilerplate, return mock user
	return &User{
		ID:      userID,
		Email:   "demo@digistratum.com",
		Name:    "Demo User",
		Tenants: []TenantInfo{{ID: "tenant-1", Name: "Demo Tenant", Role: "member"}},
	}, nil
}
