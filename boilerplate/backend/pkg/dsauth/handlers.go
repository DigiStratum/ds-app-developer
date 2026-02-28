package dsauth

import (
	"log/slog"
	"net/http"
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
// DSAccount has already set the ds_session cookie during login, so we just redirect
// to the requested URL. No token exchange or cookie setting needed.
func (h *Handlers) CallbackHandler(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	slog.Info("dsauth: SSO callback received", "has_state", state != "")

	// DSAccount already set ds_session cookie on .digistratum.com during login.
	// We just redirect to the original URL (from state) or app root.
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
	cookie := &http.Cookie{
		Name:     h.cfg.SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		MaxAge:   -1,
	}

	// Set Domain if configured (must match the domain used when setting)
	if h.cfg.CookieDomain != "" {
		cookie.Domain = h.cfg.CookieDomain
	}

	http.SetCookie(w, cookie)

	// Redirect to DSAccount logout
	logoutURL := h.cfg.SSOBaseURL + "/logout?redirect_uri=" + h.cfg.AppURL
	http.Redirect(w, r, logoutURL, http.StatusFound)
}

// LoginHandler redirects to DSAccount SSO login.
// This can be used for explicit login buttons.
// SECURITY: redirect_uri is NOT passed in URL - DSAccount uses the registered value
func (h *Handlers) LoginHandler(w http.ResponseWriter, r *http.Request) {
	// Get the intended destination from query param or referrer
	redirectAfterLogin := r.URL.Query().Get("redirect")
	if redirectAfterLogin == "" {
		redirectAfterLogin = r.Header.Get("Referer")
	}
	if redirectAfterLogin == "" {
		redirectAfterLogin = h.cfg.AppURL
	}

	// SECURITY: Only app_id is passed. redirect_uri comes from DSAccount app registration
	// to prevent open redirect vulnerabilities.
	loginURL := h.cfg.SSOBaseURL + "/api/sso/authorize?app_id=" + h.cfg.AppID +
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
	_, _ = w.Write([]byte(`{"id":"` + user.ID + `","email":"` + user.Email + `","name":"` + user.Name + `"}`))
}

// RegisterRoutes registers all auth routes on the given mux with a prefix.
// Example: RegisterRoutes(mux, "/auth") registers /auth/callback, /auth/logout, etc.
func (h *Handlers) RegisterRoutes(mux *http.ServeMux, prefix string) {
	mux.HandleFunc(prefix+"/callback", h.CallbackHandler)
	mux.HandleFunc(prefix+"/logout", h.LogoutHandler)
	mux.HandleFunc(prefix+"/login", h.LoginHandler)
	mux.HandleFunc(prefix+"/me", h.MeHandler)
}
