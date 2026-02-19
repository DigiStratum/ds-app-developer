package auth

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
)

type contextKey string

const (
	userContextKey   contextKey = "user"
	tenantContextKey contextKey = "tenant"
)

// User represents an authenticated user [FR-AUTH-003]
type User struct {
	ID       string   `json:"id"`
	Email    string   `json:"email"`
	Name     string   `json:"name"`
	Tenants  []string `json:"tenants"`
}

// Middleware validates authentication and extracts user/tenant context [FR-AUTH-001]
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get session token from cookie or Authorization header
		token := extractToken(r)
		if token == "" {
			// Redirect to SSO login [FR-AUTH-002]
			ssoURL := os.Getenv("DSACCOUNT_SSO_URL")
			if ssoURL == "" {
				ssoURL = "https://account.digistratum.com"
			}
			redirectURL := ssoURL + "/oauth/authorize?app_id=" + os.Getenv("DSACCOUNT_APP_ID") + 
				"&redirect_uri=" + os.Getenv("APP_URL") + "/auth/callback"
			http.Redirect(w, r, redirectURL, http.StatusFound)
			return
		}

		// Validate token with DSAccount (simplified for skeleton)
		user, err := validateToken(token)
		if err != nil {
			slog.Warn("invalid token", "error", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Extract tenant from header [FR-TENANT-004]
		tenantID := r.Header.Get("X-Tenant-ID")

		// Add user and tenant to context
		ctx := context.WithValue(r.Context(), userContextKey, user)
		ctx = context.WithValue(ctx, tenantContextKey, tenantID)

		next.ServeHTTP(w, r.WithContext(ctx))
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

func validateToken(token string) (*User, error) {
	// TODO: Implement actual DSAccount token validation
	// For skeleton, return mock user
	return &User{
		ID:      "user-123",
		Email:   "demo@digistratum.com",
		Name:    "Demo User",
		Tenants: []string{"tenant-1", "tenant-2"},
	}, nil
}
