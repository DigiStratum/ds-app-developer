package dsauth

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Tests: NewHandlers sets default cookie name
func TestNewHandlers_DefaultCookieName(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "test-app",
	}

	h := NewHandlers(cfg)

	if h.cfg.SessionCookieName != "ds_session" {
		t.Errorf("expected SessionCookieName 'ds_session', got %q", h.cfg.SessionCookieName)
	}
}

// Tests: NewHandlers sets default session max age
func TestNewHandlers_DefaultSessionMaxAge(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
	}

	h := NewHandlers(cfg)

	if h.cfg.SessionMaxAge != 86400 {
		t.Errorf("expected SessionMaxAge 86400, got %d", h.cfg.SessionMaxAge)
	}
}

// Tests: NewHandlers preserves custom cookie name
func TestNewHandlers_CustomCookieName(t *testing.T) {
	cfg := Config{
		SessionCookieName: "custom_session",
	}

	h := NewHandlers(cfg)

	if h.cfg.SessionCookieName != "custom_session" {
		t.Errorf("expected SessionCookieName 'custom_session', got %q", h.cfg.SessionCookieName)
	}
}

// Tests: CallbackHandler redirects to state URL
func TestCallbackHandler_WithState_Redirects(t *testing.T) {
	cfg := Config{
		AppURL: "https://app.example.com",
	}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/callback?state=https://app.example.com/dashboard", nil)
	w := httptest.NewRecorder()

	h.CallbackHandler(w, r)

	if w.Code != http.StatusFound {
		t.Errorf("expected status 302, got %d", w.Code)
	}
	location := w.Header().Get("Location")
	if location != "https://app.example.com/dashboard" {
		t.Errorf("expected redirect to dashboard, got %q", location)
	}
}

// Tests: CallbackHandler redirects to AppURL when no state
func TestCallbackHandler_NoState_RedirectsToAppURL(t *testing.T) {
	cfg := Config{
		AppURL: "https://app.example.com",
	}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/callback", nil)
	w := httptest.NewRecorder()

	h.CallbackHandler(w, r)

	if w.Code != http.StatusFound {
		t.Errorf("expected status 302, got %d", w.Code)
	}
	location := w.Header().Get("Location")
	if location != "https://app.example.com" {
		t.Errorf("expected redirect to AppURL, got %q", location)
	}
}

// Tests: CallbackHandler redirects to root when no state and no AppURL
func TestCallbackHandler_NoStateNoAppURL_RedirectsToRoot(t *testing.T) {
	cfg := Config{}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/callback", nil)
	w := httptest.NewRecorder()

	h.CallbackHandler(w, r)

	if w.Code != http.StatusFound {
		t.Errorf("expected status 302, got %d", w.Code)
	}
	location := w.Header().Get("Location")
	if location != "/" {
		t.Errorf("expected redirect to /, got %q", location)
	}
}

// Tests: LogoutHandler clears session cookie
func TestLogoutHandler_ClearsSessionCookie(t *testing.T) {
	cfg := Config{
		SSOBaseURL:        "https://sso.example.com",
		AppURL:            "https://app.example.com",
		SessionCookieName: "ds_session",
	}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
	w := httptest.NewRecorder()

	h.LogoutHandler(w, r)

	// Check that cookie is cleared (MaxAge = -1)
	cookies := w.Result().Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == "ds_session" {
			found = true
			if c.MaxAge != -1 {
				t.Errorf("expected MaxAge -1 (clear cookie), got %d", c.MaxAge)
			}
		}
	}
	if !found {
		t.Error("expected ds_session cookie to be set (for clearing)")
	}
}

// Tests: LogoutHandler redirects to DSAccount logout
func TestLogoutHandler_RedirectsToDSAccount(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppURL:     "https://app.example.com",
	}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
	w := httptest.NewRecorder()

	h.LogoutHandler(w, r)

	if w.Code != http.StatusFound {
		t.Errorf("expected status 302, got %d", w.Code)
	}
	location := w.Header().Get("Location")
	if !strings.HasPrefix(location, "https://sso.example.com/logout") {
		t.Errorf("expected redirect to SSO logout, got %q", location)
	}
}

// Tests: LogoutHandler includes redirect_uri
func TestLogoutHandler_IncludesRedirectURI(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppURL:     "https://app.example.com",
	}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
	w := httptest.NewRecorder()

	h.LogoutHandler(w, r)

	location := w.Header().Get("Location")
	if !strings.Contains(location, "redirect_uri=https://app.example.com") {
		t.Errorf("expected redirect_uri in Location, got %q", location)
	}
}

// Tests: LoginHandler redirects to SSO
func TestLoginHandler_RedirectsToSSO(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "test-app",
		AppURL:     "https://app.example.com",
	}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	w := httptest.NewRecorder()

	h.LoginHandler(w, r)

	if w.Code != http.StatusFound {
		t.Errorf("expected status 302, got %d", w.Code)
	}
	location := w.Header().Get("Location")
	if !strings.HasPrefix(location, "https://sso.example.com/api/sso/authorize") {
		t.Errorf("expected redirect to SSO authorize, got %q", location)
	}
}

// Tests: LoginHandler includes app_id
func TestLoginHandler_IncludesAppID(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "my-app-id",
		AppURL:     "https://app.example.com",
	}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	w := httptest.NewRecorder()

	h.LoginHandler(w, r)

	location := w.Header().Get("Location")
	if !strings.Contains(location, "app_id=my-app-id") {
		t.Errorf("expected app_id in Location, got %q", location)
	}
}

// Tests: LoginHandler uses redirect query param
func TestLoginHandler_UsesRedirectParam(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "test-app",
		AppURL:     "https://app.example.com",
	}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/login?redirect=/custom/path", nil)
	w := httptest.NewRecorder()

	h.LoginHandler(w, r)

	location := w.Header().Get("Location")
	if !strings.Contains(location, "state=/custom/path") {
		t.Errorf("expected custom redirect in state, got %q", location)
	}
}

// Tests: LoginHandler uses referer as fallback
func TestLoginHandler_UsesRefererAsFallback(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "test-app",
		AppURL:     "https://app.example.com",
	}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	r.Header.Set("Referer", "https://app.example.com/previous")
	w := httptest.NewRecorder()

	h.LoginHandler(w, r)

	location := w.Header().Get("Location")
	if !strings.Contains(location, "state=https://app.example.com/previous") {
		t.Errorf("expected referer in state, got %q", location)
	}
}

// Tests: MeHandler returns 401 when no user
func TestMeHandler_NoUser_Returns401(t *testing.T) {
	cfg := Config{}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	w := httptest.NewRecorder()

	h.MeHandler(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// Tests: MeHandler returns user JSON when authenticated
func TestMeHandler_WithUser_ReturnsJSON(t *testing.T) {
	cfg := Config{}
	h := NewHandlers(cfg)

	user := &User{ID: "user-123", Email: "test@example.com", Name: "Test User"}
	r := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	ctx := WithUser(r.Context(), user)
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()

	h.MeHandler(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
	body := w.Body.String()
	if !strings.Contains(body, "user-123") {
		t.Errorf("expected user ID in response, got %s", body)
	}
}

// Tests: MeHandler sets Content-Type
func TestMeHandler_SetsContentType(t *testing.T) {
	cfg := Config{}
	h := NewHandlers(cfg)

	user := &User{ID: "user-123", Email: "test@example.com"}
	r := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	ctx := WithUser(r.Context(), user)
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()

	h.MeHandler(w, r)

	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", contentType)
	}
}

// Tests: RegisterRoutes registers all auth routes
func TestRegisterRoutes_RegistersAllRoutes(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppURL:     "https://app.example.com",
	}
	h := NewHandlers(cfg)
	mux := http.NewServeMux()

	h.RegisterRoutes(mux, "/auth")

	// Test callback route exists
	r := httptest.NewRequest(http.MethodGet, "/auth/callback", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code == http.StatusNotFound {
		t.Error("expected /auth/callback to be registered")
	}

	// Test logout route exists
	r = httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code == http.StatusNotFound {
		t.Error("expected /auth/logout to be registered")
	}

	// Test login route exists
	r = httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code == http.StatusNotFound {
		t.Error("expected /auth/login to be registered")
	}

	// Test me route exists
	r = httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code == http.StatusNotFound {
		t.Error("expected /auth/me to be registered")
	}
}

// Tests: LogoutHandler sets cookie domain when configured

// Tests: LogoutHandler sets cookie domain when configured
func TestLogoutHandler_SetsCookieDomain(t *testing.T) {
	cfg := Config{
		SSOBaseURL:   "https://sso.example.com",
		AppURL:       "https://app.example.com",
		CookieDomain: ".example.com",
	}
	h := NewHandlers(cfg)

	r := httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
	w := httptest.NewRecorder()

	h.LogoutHandler(w, r)

	cookies := w.Result().Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == "ds_session" {
			found = true
			// Go may strip leading dot from domain
			if c.Domain != ".example.com" && c.Domain != "example.com" {
				t.Errorf("expected cookie domain with example.com, got %q", c.Domain)
			}
		}
	}
	if !found {
		t.Error("expected ds_session cookie")
	}
}
