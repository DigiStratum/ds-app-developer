package dsauth

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"
)

// tokenCache provides a simple in-memory cache for validated tokens.
// This reduces load on DSAccount by caching successful validations.
var tokenCache = struct {
	sync.RWMutex
	entries map[string]cacheEntry
}{
	entries: make(map[string]cacheEntry),
}

type cacheEntry struct {
	user      *User
	expiresAt time.Time
}

const tokenCacheTTL = 60 * time.Second

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

// defaultValidateToken validates a token by calling DSAccount's userinfo endpoint.
// Results are cached for 60 seconds to reduce load on DSAccount.
func defaultValidateToken(cfg Config, token string) (*User, error) {
	// Check cache first
	tokenCache.RLock()
	if entry, ok := tokenCache.entries[token]; ok && time.Now().Before(entry.expiresAt) {
		tokenCache.RUnlock()
		return entry.user, nil
	}
	tokenCache.RUnlock()

	// Call DSAccount userinfo endpoint
	userInfoURL := cfg.SSOBaseURL + "/api/sso/userinfo"

	req, err := http.NewRequest("GET", userInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create userinfo request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("userinfo request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("token invalid or expired")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read userinfo response: %w", err)
	}

	var user User
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, fmt.Errorf("parse userinfo response: %w", err)
	}

	// Cache the result
	tokenCache.Lock()
	tokenCache.entries[token] = cacheEntry{
		user:      &user,
		expiresAt: time.Now().Add(tokenCacheTTL),
	}
	tokenCache.Unlock()

	return &user, nil
}

// ClearTokenCache clears all cached token validations.
// Useful for testing or when tokens are revoked.
func ClearTokenCache() {
	tokenCache.Lock()
	tokenCache.entries = make(map[string]cacheEntry)
	tokenCache.Unlock()
}

// InvalidateToken removes a specific token from the cache.
// Call this when a user logs out to ensure re-validation on next request.
func InvalidateToken(token string) {
	tokenCache.Lock()
	delete(tokenCache.entries, token)
	tokenCache.Unlock()
}
