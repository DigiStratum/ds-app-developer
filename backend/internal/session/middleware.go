// Package session middleware provides guest-session-first authentication.
// See session.go for the session model and store.
package session

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/DigiStratum/ds-app-developer/backend/pkg/dsauth"
)

// dsauthConfig holds the SSO configuration, initialized on first use
var dsauthConfig *dsauth.Config

// getDSAuthConfig returns the dsauth configuration, initializing from env vars on first call
func getDSAuthConfig() *dsauth.Config {
	if dsauthConfig != nil {
		return dsauthConfig
	}

	ssoURL := os.Getenv("DSACCOUNT_SSO_URL")
	appID := os.Getenv("DSACCOUNT_APP_ID")
	appSecret := os.Getenv("DSACCOUNT_APP_SECRET")

	if ssoURL == "" || appID == "" {
		slog.Warn("DSAccount SSO not configured - session validation will use local store only",
			"has_url", ssoURL != "", "has_app_id", appID != "")
		return nil
	}

	dsauthConfig = &dsauth.Config{
		SSOBaseURL:        ssoURL,
		AppID:             appID,
		AppSecret:         appSecret,
		SessionCookieName: "ds_session",
		CookieDomain:      ".digistratum.com",
	}

	slog.Info("DSAccount SSO configured", "url", ssoURL, "app_id", appID)
	return dsauthConfig
}

// Middleware ensures every request has a session (anonymous or authenticated).
// This is the core of the guest-session-first pattern:
// - First, check if ds_session cookie is a valid DSAccount session
// - If valid DSAccount session, create/update local session with user info
// - If no valid DSAccount session, check local session store
// - If no local session exists, create an anonymous one
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		store := GetStore()
		tenantID := r.Header.Get("X-Tenant-ID")

		// Try to get session ID from request
		sessionID := GetSessionIDFromRequest(r)

		// First: try to validate against DSAccount if we have a session ID
		if sessionID != "" {
			if cfg := getDSAuthConfig(); cfg != nil {
				dsauthUser, err := dsauth.ValidateToken(*cfg, sessionID)
				if err == nil && dsauthUser != nil {
					// Valid DSAccount session! Create/update local session
					session := store.GetOrCreate(sessionID, tenantID)
					session.UserID = dsauthUser.ID
					session.IsGuest = false
					store.Save(session)

					slog.Info("authenticated via DSAccount SSO",
						"session_id", sessionID[:8]+"...",
						"user_id", dsauthUser.ID,
						"email", dsauthUser.Email,
					)

					// Add session and dsauth user to context
					ctx := SetSession(r.Context(), session)
					ctx = dsauth.WithUser(ctx, dsauthUser)
					if tenantID != "" {
						ctx = dsauth.WithTenant(ctx, tenantID)
					}

					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
				// DSAccount validation failed - session might be local-only or invalid
				slog.Debug("DSAccount session validation failed, trying local store", "error", err)
			}
		}

		// Second: try local session store
		session := store.Get(sessionID)

		// Create anonymous session if none exists or expired
		if session == nil {
			session = store.Create(tenantID)

			// Set cookie for new session
			SetSessionCookie(w, r, session)

			slog.Info("created anonymous session",
				"session_id", session.ID[:8]+"...",
				"tenant_id", tenantID,
			)
		}

		// Add session to context
		ctx := SetSession(r.Context(), session)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireAuth is middleware that requires an authenticated session.
// Use this for routes that need a logged-in user.
// Anonymous sessions get a 401 response (for API) or redirect (for browser).
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := GetSession(r.Context())

		if session == nil || !session.IsAuthenticated() {
			// Check if this is an API request or browser request
			if isAPIRequest(r) {
				http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}`, http.StatusUnauthorized)
			} else {
				// Redirect to login page with return URL
				loginURL := "/api/auth/login?redirect=" + r.URL.Path
				http.Redirect(w, r, loginURL, http.StatusFound)
			}
			return
		}

		next.ServeHTTP(w, r)
	})
}

// isAPIRequest checks if the request is for the API (vs browser navigation)
func isAPIRequest(r *http.Request) bool {
	accept := r.Header.Get("Accept")
	contentType := r.Header.Get("Content-Type")

	// API requests typically want JSON
	if accept == "application/json" || contentType == "application/json" {
		return true
	}

	// API requests usually come from fetch/XHR
	if r.Header.Get("X-Requested-With") == "XMLHttpRequest" {
		return true
	}

	return false
}
