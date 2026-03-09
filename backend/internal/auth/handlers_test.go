package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// Tests for auth handlers [FR-AUTH-001, FR-AUTH-004]
// CallbackHandler just redirects - DSAccount handles all auth and sets the session cookie

// TestCallbackHandler_NoState_RedirectsToRoot tests default redirect
func TestCallbackHandler_NoState_RedirectsToRoot(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/auth/callback", nil)
	rr := httptest.NewRecorder()

	CallbackHandler(rr, req)

	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}
	if loc := rr.Header().Get("Location"); loc != "/" {
		t.Errorf("expected redirect to /, got %s", loc)
	}
}

// TestCallbackHandler_WithState_RedirectsToState tests state param handling
func TestCallbackHandler_WithState_RedirectsToState(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/auth/callback?state=/dashboard", nil)
	rr := httptest.NewRecorder()

	CallbackHandler(rr, req)

	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}
	if loc := rr.Header().Get("Location"); loc != "/dashboard" {
		t.Errorf("expected redirect to /dashboard, got %s", loc)
	}
}

// TestCallbackHandler_ExternalState_RedirectsToRoot tests open redirect prevention
func TestCallbackHandler_ExternalState_RedirectsToRoot(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/auth/callback?state=https://evil.com", nil)
	rr := httptest.NewRecorder()

	CallbackHandler(rr, req)

	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}
	if loc := rr.Header().Get("Location"); loc != "/" {
		t.Errorf("expected redirect to / (blocking external), got %s", loc)
	}
}

// TestLogoutHandler_ClearsCookieAndRedirects tests FR-AUTH-004
func TestLogoutHandler_ClearsCookieAndRedirects(t *testing.T) {
	t.Setenv("DSACCOUNT_SSO_URL", "https://account.example.com")
	t.Setenv("APP_URL", "https://app.example.com")

	req := httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
	rr := httptest.NewRecorder()

	LogoutHandler(rr, req)

	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}

	// Check cookie is cleared
	cookies := rr.Result().Cookies()
	var sessionCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "ds_session" {
			sessionCookie = c
			break
		}
	}
	if sessionCookie == nil {
		t.Error("expected ds_session cookie to be set")
	} else if sessionCookie.MaxAge >= 0 {
		t.Errorf("expected MaxAge < 0 (clear), got %d", sessionCookie.MaxAge)
	}

	// Check redirect to DSAccount logout
	loc := rr.Header().Get("Location")
	expected := "https://account.example.com/api/sso/logout?redirect_uri=https://app.example.com"
	if loc != expected {
		t.Errorf("expected redirect to %s, got %s", expected, loc)
	}
}

// TestLogoutHandler_DefaultURLs tests default env fallbacks
func TestLogoutHandler_DefaultURLs(t *testing.T) {
	// Clear env vars to test defaults
	t.Setenv("DSACCOUNT_SSO_URL", "")
	t.Setenv("APP_URL", "")

	req := httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
	rr := httptest.NewRecorder()

	LogoutHandler(rr, req)

	loc := rr.Header().Get("Location")
	expected := "https://account.digistratum.com/api/sso/logout?redirect_uri=https://developer.digistratum.com"
	if loc != expected {
		t.Errorf("expected redirect to %s, got %s", expected, loc)
	}
}

// TestLoginHandler_RedirectsToSSO tests FR-AUTH-001 login initiation
func TestLoginHandler_RedirectsToSSO(t *testing.T) {
	t.Setenv("DSACCOUNT_SSO_URL", "https://account.example.com")
	t.Setenv("DSACCOUNT_APP_ID", "my-app-id")

	req := httptest.NewRequest(http.MethodGet, "/auth/login?redirect=/dashboard", nil)
	rr := httptest.NewRecorder()

	LoginHandler(rr, req)

	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}

	loc := rr.Header().Get("Location")
	expected := "https://account.example.com/api/sso/authorize?app_id=my-app-id&state=%2Fdashboard"
	if loc != expected {
		t.Errorf("expected redirect to %s, got %s", expected, loc)
	}
}

// TestLoginHandler_DefaultRedirect tests default redirect when none provided
func TestLoginHandler_DefaultRedirect(t *testing.T) {
	t.Setenv("DSACCOUNT_SSO_URL", "https://account.example.com")
	t.Setenv("DSACCOUNT_APP_ID", "my-app-id")

	req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	rr := httptest.NewRecorder()

	LoginHandler(rr, req)

	loc := rr.Header().Get("Location")
	expected := "https://account.example.com/api/sso/authorize?app_id=my-app-id&state=%2F"
	if loc != expected {
		t.Errorf("expected redirect to %s, got %s", expected, loc)
	}
}

// TestLoginHandler_DefaultSSO tests default SSO URL fallback
func TestLoginHandler_DefaultSSO(t *testing.T) {
	t.Setenv("DSACCOUNT_SSO_URL", "")
	t.Setenv("DSACCOUNT_APP_ID", "test-app")

	req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	rr := httptest.NewRecorder()

	LoginHandler(rr, req)

	loc := rr.Header().Get("Location")
	expected := "https://account.digistratum.com/api/sso/authorize?app_id=test-app&state=%2F"
	if loc != expected {
		t.Errorf("expected redirect to %s, got %s", expected, loc)
	}
}
