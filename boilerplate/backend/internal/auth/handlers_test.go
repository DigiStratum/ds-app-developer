package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// Tests for auth handlers [FR-AUTH-001, FR-AUTH-004]
// Using TDD approach: tests define expected behavior

// TestCallbackHandler_MissingCode_ReturnsBadRequest tests FR-AUTH-001 error handling
func TestCallbackHandler_MissingCode_ReturnsBadRequest(t *testing.T) {
	// Arrange
	req := httptest.NewRequest(http.MethodGet, "/auth/callback", nil)
	rr := httptest.NewRecorder()

	// Act
	CallbackHandler(rr, req)

	// Assert
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rr.Code)
	}

	if body := rr.Body.String(); body != "Missing authorization code\n" {
		t.Errorf("unexpected body: %s", body)
	}
}

// TestCallbackHandler_TokenExchangeFails_ReturnsInternalError tests error handling
func TestCallbackHandler_TokenExchangeFails_ReturnsInternalError(t *testing.T) {
	// Arrange: Point to non-existent server to trigger connection error
	t.Setenv("DSACCOUNT_SSO_URL", "http://localhost:19999") // non-existent
	t.Setenv("DSACCOUNT_APP_ID", "test-app")
	t.Setenv("DSACCOUNT_APP_SECRET", "test-secret")

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=test-code", nil)
	rr := httptest.NewRecorder()

	// Act
	CallbackHandler(rr, req)

	// Assert: Should fail to connect
	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected status %d, got %d", http.StatusInternalServerError, rr.Code)
	}
}

// TestCallbackHandler_TokenExchangeSuccess_SetsCookieAndRedirects tests FR-AUTH-001 happy path
func TestCallbackHandler_TokenExchangeSuccess_SetsCookieAndRedirects(t *testing.T) {
	// Arrange: Mock DSAccount token endpoint
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/sso/token" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}

		// Return a valid token response
		response := tokenResponse{
			AccessToken: "mock-access-token",
			TokenType:   "Bearer",
			ExpiresIn:   3600,
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(response)
	}))
	defer mockServer.Close()

	t.Setenv("DSACCOUNT_SSO_URL", mockServer.URL)
	t.Setenv("DSACCOUNT_APP_ID", "test-app")
	t.Setenv("DSACCOUNT_APP_SECRET", "test-secret")

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=valid-code&state=/dashboard", nil)
	rr := httptest.NewRecorder()

	// Act
	CallbackHandler(rr, req)

	// Assert: Should redirect with cookie
	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}

	// Check cookie was set
	cookies := rr.Result().Cookies()
	var sessionCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "ds_session" {
			sessionCookie = c
			break
		}
	}
	if sessionCookie == nil {
		t.Fatal("expected ds_session cookie to be set")
	}
	if sessionCookie.Value != "mock-access-token" {
		t.Errorf("expected cookie value 'mock-access-token', got %s", sessionCookie.Value)
	}

	// Check redirect location
	location := rr.Header().Get("Location")
	if location != "/dashboard" {
		t.Errorf("expected redirect to /dashboard, got %s", location)
	}
}

// TestCallbackHandler_NoState_RedirectsToRoot tests default redirect behavior
func TestCallbackHandler_NoState_RedirectsToRoot(t *testing.T) {
	// Arrange: Mock DSAccount token endpoint
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := tokenResponse{
			AccessToken: "mock-token",
			TokenType:   "Bearer",
			ExpiresIn:   3600,
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(response)
	}))
	defer mockServer.Close()

	t.Setenv("DSACCOUNT_SSO_URL", mockServer.URL)
	t.Setenv("DSACCOUNT_APP_ID", "test-app")
	t.Setenv("DSACCOUNT_APP_SECRET", "test-secret")

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=valid-code", nil)
	rr := httptest.NewRecorder()

	// Act
	CallbackHandler(rr, req)

	// Assert: Should redirect to root
	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}

	location := rr.Header().Get("Location")
	if location != "/" {
		t.Errorf("expected redirect to /, got %s", location)
	}
}

// TestCallbackHandler_ExternalState_RedirectsToRoot tests open redirect protection
func TestCallbackHandler_ExternalState_RedirectsToRoot(t *testing.T) {
	// Arrange: Mock DSAccount token endpoint
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := tokenResponse{
			AccessToken: "mock-token",
			TokenType:   "Bearer",
			ExpiresIn:   3600,
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(response)
	}))
	defer mockServer.Close()

	t.Setenv("DSACCOUNT_SSO_URL", mockServer.URL)
	t.Setenv("DSACCOUNT_APP_ID", "test-app")
	t.Setenv("DSACCOUNT_APP_SECRET", "test-secret")

	// Try to inject an external redirect URL
	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=valid-code&state=https://evil.com", nil)
	rr := httptest.NewRecorder()

	// Act
	CallbackHandler(rr, req)

	// Assert: Should sanitize and redirect to root (not evil.com)
	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}

	location := rr.Header().Get("Location")
	if location != "/" {
		t.Errorf("expected redirect to / (sanitized), got %s", location)
	}
}

// TestCallbackHandler_BadTokenResponse_ReturnsError tests malformed response handling
func TestCallbackHandler_BadTokenResponse_ReturnsError(t *testing.T) {
	// Arrange: Mock DSAccount returning invalid JSON
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte("invalid json"))
	}))
	defer mockServer.Close()

	t.Setenv("DSACCOUNT_SSO_URL", mockServer.URL)
	t.Setenv("DSACCOUNT_APP_ID", "test-app")
	t.Setenv("DSACCOUNT_APP_SECRET", "test-secret")

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=valid-code", nil)
	rr := httptest.NewRecorder()

	// Act
	CallbackHandler(rr, req)

	// Assert: Should return internal server error
	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected status %d, got %d", http.StatusInternalServerError, rr.Code)
	}
}

// TestCallbackHandler_TokenExchangeUnauthorized_ReturnsUnauthorized tests 401 from DSAccount
func TestCallbackHandler_TokenExchangeUnauthorized_ReturnsUnauthorized(t *testing.T) {
	// Arrange: Mock DSAccount returning 401
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error": "invalid_code"}`))
	}))
	defer mockServer.Close()

	t.Setenv("DSACCOUNT_SSO_URL", mockServer.URL)
	t.Setenv("DSACCOUNT_APP_ID", "test-app")
	t.Setenv("DSACCOUNT_APP_SECRET", "test-secret")

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=invalid-code", nil)
	rr := httptest.NewRecorder()

	// Act
	CallbackHandler(rr, req)

	// Assert: Should return unauthorized
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

// TestLogoutHandler_ClearsCookieAndRedirects tests FR-AUTH-004
func TestLogoutHandler_ClearsCookieAndRedirects(t *testing.T) {
	// Arrange
	t.Setenv("DSACCOUNT_SSO_URL", "https://account.example.com")
	t.Setenv("APP_URL", "https://app.example.com")

	req := httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
	rr := httptest.NewRecorder()

	// Act
	LogoutHandler(rr, req)

	// Assert: Should redirect
	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}

	// Check cookie was cleared
	cookies := rr.Result().Cookies()
	var sessionCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "ds_session" {
			sessionCookie = c
			break
		}
	}
	if sessionCookie == nil {
		t.Fatal("expected ds_session cookie to be cleared")
	}
	if sessionCookie.Value != "" {
		t.Errorf("expected empty cookie value, got %s", sessionCookie.Value)
	}
	if sessionCookie.MaxAge != -1 {
		t.Errorf("expected MaxAge -1 (delete), got %d", sessionCookie.MaxAge)
	}

	// Check redirect to DSAccount logout
	location := rr.Header().Get("Location")
	expected := "https://account.example.com/api/sso/logout?redirect_uri=https://app.example.com"
	if location != expected {
		t.Errorf("expected redirect to %s, got %s", expected, location)
	}
}

// TestLogoutHandler_DefaultURLs tests logout with default env vars
func TestLogoutHandler_DefaultURLs(t *testing.T) {
	// Arrange: Don't set env vars, use defaults

	req := httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
	rr := httptest.NewRecorder()

	// Act
	LogoutHandler(rr, req)

	// Assert: Should use default URLs
	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}

	location := rr.Header().Get("Location")
	expected := "https://account.digistratum.com/api/sso/logout?redirect_uri=https://developer.digistratum.com"
	if location != expected {
		t.Errorf("expected redirect to %s, got %s", expected, location)
	}
}

// TestLoginHandler_RedirectsToSSO tests FR-AUTH-001 login initiation
func TestLoginHandler_RedirectsToSSO(t *testing.T) {
	// Arrange
	t.Setenv("DSACCOUNT_SSO_URL", "https://account.example.com")
	t.Setenv("DSACCOUNT_APP_ID", "my-app-id")

	req := httptest.NewRequest(http.MethodGet, "/auth/login?redirect=/dashboard", nil)
	rr := httptest.NewRecorder()

	// Act
	LoginHandler(rr, req)

	// Assert: Should redirect to SSO
	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}

	location := rr.Header().Get("Location")
	// Check that it redirects to SSO with correct params
	if !containsSubstring(location, "account.example.com/api/sso/authorize") {
		t.Errorf("expected redirect to SSO authorize endpoint, got %s", location)
	}
	if !containsSubstring(location, "app_id=my-app-id") {
		t.Errorf("expected app_id param, got %s", location)
	}
	// State should contain the redirect path (URL-encoded)
	if !containsSubstring(location, "state=%2Fdashboard") {
		t.Errorf("expected state param with redirect path, got %s", location)
	}
}

// TestLoginHandler_DefaultRedirect tests login with no redirect param
func TestLoginHandler_DefaultRedirect(t *testing.T) {
	// Arrange
	t.Setenv("DSACCOUNT_SSO_URL", "https://account.example.com")
	t.Setenv("DSACCOUNT_APP_ID", "my-app-id")

	req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	rr := httptest.NewRecorder()

	// Act
	LoginHandler(rr, req)

	// Assert: Should redirect to SSO with state=/
	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}

	location := rr.Header().Get("Location")
	// Default redirect should be /
	if !containsSubstring(location, "state=%2F") {
		t.Errorf("expected default state=/ (encoded as %%2F), got %s", location)
	}
}

// TestLoginHandler_DefaultSSO tests login with default SSO URL
func TestLoginHandler_DefaultSSO(t *testing.T) {
	// Arrange: Don't set DSACCOUNT_SSO_URL
	t.Setenv("DSACCOUNT_APP_ID", "test-app")

	req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	rr := httptest.NewRecorder()

	// Act
	LoginHandler(rr, req)

	// Assert: Should use default SSO URL
	if rr.Code != http.StatusFound {
		t.Errorf("expected status %d, got %d", http.StatusFound, rr.Code)
	}

	location := rr.Header().Get("Location")
	if !containsSubstring(location, "account.digistratum.com/api/sso/authorize") {
		t.Errorf("expected default SSO URL, got %s", location)
	}
}

// Helper function
func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
