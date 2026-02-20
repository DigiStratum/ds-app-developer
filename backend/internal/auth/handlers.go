package auth

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/DigiStratum/ds-app-skeleton/backend/internal/session"
)

// CallbackHandler handles SSO callback [FR-AUTH-001]
// This upgrades the anonymous session to an authenticated one,
// preserving any state from before authentication.
func CallbackHandler(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}

	// TODO: Exchange code for token with DSAccount and get user info
	// For skeleton, use mock user data
	userID := "user-123" // Would come from DSAccount token exchange
	slog.Info("SSO callback received", "code_length", len(code), "user_id", userID)

	store := session.GetStore()

	// Try to upgrade existing session (preserves pre-auth state)
	sessionID := session.GetSessionIDFromRequest(r)
	existingSession := store.Get(sessionID)

	var sess *session.Session
	if existingSession != nil {
		// Upgrade the existing session - this preserves the session ID
		// so any pre-auth state (cart items, preferences, etc.) is maintained
		sess = store.Upgrade(sessionID, userID)
		slog.Info("upgraded anonymous session to authenticated",
			"session_id", sess.ID[:8]+"...",
			"user_id", userID,
		)
	} else {
		// No existing session - create a new authenticated one
		sess = store.Create("")
		store.Upgrade(sess.ID, userID)
		slog.Info("created new authenticated session",
			"session_id", sess.ID[:8]+"...",
			"user_id", userID,
		)
	}

	// Set session cookie
	session.SetSessionCookie(w, r, sess)

	// Get redirect URL from state param (how OAuth returns our original redirect)
	// or fall back to query param for backwards compatibility
	redirectURL := r.URL.Query().Get("state")
	if redirectURL == "" {
		redirectURL = r.URL.Query().Get("redirect")
	}
	if redirectURL == "" {
		redirectURL = os.Getenv("APP_URL")
		if redirectURL == "" {
			redirectURL = "/"
		}
	}

	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// LogoutHandler handles logout [FR-AUTH-004]
// This clears the session entirely (doesn't downgrade to guest).
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	store := session.GetStore()

	// Delete the session
	sessionID := session.GetSessionIDFromRequest(r)
	if sessionID != "" {
		store.Delete(sessionID)
		slog.Info("session deleted on logout", "session_id", sessionID[:8]+"...")
	}

	// Clear session cookie
	session.ClearSessionCookie(w, r)

	// Redirect to DSAccount logout
	ssoURL := os.Getenv("DSACCOUNT_SSO_URL")
	if ssoURL == "" {
		ssoURL = "https://account.digistratum.com"
	}
	http.Redirect(w, r, ssoURL+"/api/sso/logout", http.StatusFound)
}

// LoginHandler initiates the SSO login flow
// SECURITY NOTE: redirect_uri is NOT included in the URL.
// DSAccount looks up the redirect_uri from app registration only.
// This prevents open redirect attacks.
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	ssoURL := os.Getenv("DSACCOUNT_SSO_URL")
	if ssoURL == "" {
		ssoURL = "https://account.digistratum.com"
	}

	// Preserve the redirect URL through the auth flow (passed as state)
	redirectURL := r.URL.Query().Get("redirect")
	if redirectURL == "" {
		redirectURL = "/"
	}

	// SECURITY: Only app_id and state are passed. redirect_uri comes from DSAccount app registration.
	authURL := ssoURL + "/api/sso/authorize?app_id=" + os.Getenv("DSACCOUNT_APP_ID") +
		"&state=" + redirectURL

	http.Redirect(w, r, authURL, http.StatusFound)
}
