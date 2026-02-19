package auth

import (
	"log/slog"
	"net/http"
	"os"
	"time"
)

// CallbackHandler handles SSO callback [FR-AUTH-001]
func CallbackHandler(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}

	// TODO: Exchange code for token with DSAccount
	// For skeleton, create a mock session
	slog.Info("SSO callback received", "code_length", len(code))

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "ds_session",
		Value:    "mock-session-token",
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(24 * time.Hour),
	})

	// Redirect to app
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "/"
	}
	http.Redirect(w, r, appURL, http.StatusFound)
}

// LogoutHandler handles logout [FR-AUTH-004]
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// Clear session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "ds_session",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		MaxAge:   -1,
	})

	// Redirect to DSAccount logout
	ssoURL := os.Getenv("DSACCOUNT_SSO_URL")
	if ssoURL == "" {
		ssoURL = "https://account.digistratum.com"
	}
	http.Redirect(w, r, ssoURL+"/logout", http.StatusFound)
}
