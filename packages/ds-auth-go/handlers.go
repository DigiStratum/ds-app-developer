package dsauth

import (
	"log/slog"
	"net/http"
	"time"
)

// Handlers provides HTTP handlers for SSO authentication flow.
type Handlers struct {
	cfg Config
}

// NewHandlers creates a new Handlers instance with the given configuration.
func NewHandlers(cfg Config) *Handlers {
	if cfg.SessionCookieName == "" {
		cfg.SessionCookieName = "ds_session"
	}
	if cfg.SessionMaxAge == 0 {
		cfg.SessionMaxAge = 86400 // 24 hours
	}
	return &Handlers{cfg: cfg}
}

// CallbackHandler handles the SSO callback after successful authentication.
// It exchanges the authorization code for a session token and sets the session cookie.
func (h *Handlers) CallbackHandler(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}

	state := r.URL.Query().Get("state")
	slog.Info("dsauth: SSO callback received", "code_length", len(code), "has_state", state != "")

	// TODO: Exchange code for token with DSAccount
	// token, err := h.exchangeCodeForToken(code)
	// if err != nil {
	//     http.Error(w, "Failed to exchange code", http.StatusInternalServerError)
	//     return
	// }

	// For development, create a mock session
	sessionToken := "mock-session-token-" + code[:8]

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     h.cfg.SessionCookieName,
		Value:    sessionToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(time.Duration(h.cfg.SessionMaxAge) * time.Second),
	})

	// Redirect to the original URL (from state) or app root
	redirectURL := state
	if redirectURL == "" {
		redirectURL = h.cfg.AppURL
		if redirectURL == "" {
			redirectURL = "/"
		}
	}
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// LogoutHandler clears the session and redirects to DSAccount logout.
func (h *Handlers) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// Clear session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     h.cfg.SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		MaxAge:   -1,
	})

	// Redirect to DSAccount logout
	logoutURL := h.cfg.SSOBaseURL + "/logout?redirect_uri=" + h.cfg.AppURL
	http.Redirect(w, r, logoutURL, http.StatusFound)
}

// LoginHandler redirects to DSAccount SSO login.
// This can be used for explicit login buttons.
func (h *Handlers) LoginHandler(w http.ResponseWriter, r *http.Request) {
	// Get the intended destination from query param or referrer
	redirectAfterLogin := r.URL.Query().Get("redirect")
	if redirectAfterLogin == "" {
		redirectAfterLogin = r.Header.Get("Referer")
	}
	if redirectAfterLogin == "" {
		redirectAfterLogin = h.cfg.AppURL
	}

	loginURL := h.cfg.SSOBaseURL + "/oauth/authorize?app_id=" + h.cfg.AppID +
		"&redirect_uri=" + h.cfg.AppURL + "/auth/callback" +
		"&state=" + redirectAfterLogin

	http.Redirect(w, r, loginURL, http.StatusFound)
}

// MeHandler returns the current user's information as JSON.
// Requires authentication (use with Middleware or APIMiddleware).
func (h *Handlers) MeHandler(w http.ResponseWriter, r *http.Request) {
	user := GetUser(r.Context())
	if user == nil {
		http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"Not authenticated"}}`, http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// Using simple string formatting to avoid encoding/json import for this simple case
	// In production, use proper JSON encoding
	w.Write([]byte(`{"id":"` + user.ID + `","email":"` + user.Email + `","name":"` + user.Name + `"}`))
}

// RegisterRoutes registers all auth routes on the given mux with a prefix.
// Example: RegisterRoutes(mux, "/auth") registers /auth/callback, /auth/logout, etc.
func (h *Handlers) RegisterRoutes(mux *http.ServeMux, prefix string) {
	mux.HandleFunc(prefix+"/callback", h.CallbackHandler)
	mux.HandleFunc(prefix+"/logout", h.LogoutHandler)
	mux.HandleFunc(prefix+"/login", h.LoginHandler)
	mux.HandleFunc(prefix+"/me", h.MeHandler)
}
