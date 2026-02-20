package dsauth

import (
	"log/slog"
	"net/http"
	"strings"
)

// Middleware creates HTTP middleware that validates authentication and extracts
// user/tenant context. Unauthenticated requests are redirected to SSO login.
func Middleware(cfg Config) func(http.Handler) http.Handler {
	// Apply defaults for optional fields
	if cfg.SessionCookieName == "" {
		cfg.SessionCookieName = "ds_session"
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract token from Authorization header or cookie
			token := extractToken(r, cfg.SessionCookieName)
			if token == "" {
				// Redirect to SSO login
				redirectURL := buildLoginRedirectURL(cfg, r)
				http.Redirect(w, r, redirectURL, http.StatusFound)
				return
			}

			// Validate token
			var user *User
			var err error
			if cfg.TokenValidator != nil {
				user, err = cfg.TokenValidator(token)
			} else {
				user, err = defaultValidateToken(cfg, token)
			}

			if err != nil {
				slog.Warn("dsauth: invalid token", "error", err)
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Extract tenant from X-Tenant-ID header
			tenantID := r.Header.Get("X-Tenant-ID")

			// Add user and tenant to context
			ctx := WithUser(r.Context(), user)
			ctx = WithTenant(ctx, tenantID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// APIMiddleware creates middleware for API endpoints that returns 401 instead of
// redirecting to SSO login. Use this for JSON API routes.
func APIMiddleware(cfg Config) func(http.Handler) http.Handler {
	if cfg.SessionCookieName == "" {
		cfg.SessionCookieName = "ds_session"
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractToken(r, cfg.SessionCookieName)
			if token == "" {
				http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}`, http.StatusUnauthorized)
				return
			}

			var user *User
			var err error
			if cfg.TokenValidator != nil {
				user, err = cfg.TokenValidator(token)
			} else {
				user, err = defaultValidateToken(cfg, token)
			}

			if err != nil {
				slog.Warn("dsauth: invalid token", "error", err)
				http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"Invalid or expired token"}}`, http.StatusUnauthorized)
				return
			}

			tenantID := r.Header.Get("X-Tenant-ID")
			ctx := WithUser(r.Context(), user)
			ctx = WithTenant(ctx, tenantID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuthMiddleware extracts auth context if present but doesn't require it.
// Useful for routes that work with or without authentication.
func OptionalAuthMiddleware(cfg Config) func(http.Handler) http.Handler {
	if cfg.SessionCookieName == "" {
		cfg.SessionCookieName = "ds_session"
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			token := extractToken(r, cfg.SessionCookieName)
			if token != "" {
				var user *User
				var err error
				if cfg.TokenValidator != nil {
					user, err = cfg.TokenValidator(token)
				} else {
					user, err = defaultValidateToken(cfg, token)
				}

				if err == nil && user != nil {
					ctx = WithUser(ctx, user)
					tenantID := r.Header.Get("X-Tenant-ID")
					ctx = WithTenant(ctx, tenantID)
				}
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func extractToken(r *http.Request, cookieName string) string {
	// Check Authorization header first (Bearer token)
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}

	// Check session cookie
	cookie, err := r.Cookie(cookieName)
	if err == nil && cookie.Value != "" {
		return cookie.Value
	}

	return ""
}

func buildLoginRedirectURL(cfg Config, r *http.Request) string {
	// Build the current URL to preserve in state for post-auth redirect
	scheme := "https"
	if r.TLS == nil {
		scheme = "http"
	}
	currentURL := scheme + "://" + r.Host + r.RequestURI

	// SECURITY: Only app_id is passed. redirect_uri comes from DSAccount app registration
	// to prevent open redirect vulnerabilities.
	return cfg.SSOBaseURL + "/oauth/authorize?app_id=" + cfg.AppID +
		"&state=" + currentURL
}

func defaultValidateToken(cfg Config, token string) (*User, error) {
	// TODO: Implement actual DSAccount token validation
	// This would make an HTTP request to DSAccount to validate the token
	// For now, return a mock user for development
	return &User{
		ID:      "user-mock",
		Email:   "mock@digistratum.com",
		Name:    "Mock User",
		Tenants: []string{"tenant-1"},
	}, nil
}
