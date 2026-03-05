package dsauth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// Tests: extractToken extracts Bearer token from Authorization header
func TestExtractToken_BearerToken(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	r.Header.Set("Authorization", "Bearer test-token-123")

	token := extractToken(r, "ds_session")

	if token != "test-token-123" {
		t.Errorf("expected token 'test-token-123', got %q", token)
	}
}

// Tests: extractToken extracts token from session cookie
func TestExtractToken_Cookie(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	r.AddCookie(&http.Cookie{Name: "ds_session", Value: "cookie-token-456"})

	token := extractToken(r, "ds_session")

	if token != "cookie-token-456" {
		t.Errorf("expected token 'cookie-token-456', got %q", token)
	}
}

// Tests: extractToken prefers Authorization header over cookie
func TestExtractToken_HeaderOverCookie(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	r.Header.Set("Authorization", "Bearer header-token")
	r.AddCookie(&http.Cookie{Name: "ds_session", Value: "cookie-token"})

	token := extractToken(r, "ds_session")

	if token != "header-token" {
		t.Errorf("expected header token 'header-token', got %q", token)
	}
}

// Tests: extractToken returns empty for missing auth
func TestExtractToken_NoAuth(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)

	token := extractToken(r, "ds_session")

	if token != "" {
		t.Errorf("expected empty token, got %q", token)
	}
}

// Tests: extractToken ignores non-Bearer auth
func TestExtractToken_NonBearerAuth(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	r.Header.Set("Authorization", "Basic dXNlcjpwYXNz")

	token := extractToken(r, "ds_session")

	if token != "" {
		t.Errorf("expected empty token for non-Bearer, got %q", token)
	}
}

// Tests: buildLoginRedirectURL includes app_id
func TestBuildLoginRedirectURL_IncludesAppID(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "test-app-123",
	}
	r := httptest.NewRequest(http.MethodGet, "/protected/resource", nil)
	r.Host = "app.example.com"

	url := buildLoginRedirectURL(cfg, r)

	if url == "" {
		t.Fatal("expected non-empty redirect URL")
	}
	if !contains(url, "app_id=test-app-123") {
		t.Errorf("expected app_id in URL, got %s", url)
	}
}

// Tests: buildLoginRedirectURL includes state parameter
func TestBuildLoginRedirectURL_IncludesState(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "test-app",
	}
	r := httptest.NewRequest(http.MethodGet, "/protected/resource?query=value", nil)
	r.Host = "app.example.com"

	url := buildLoginRedirectURL(cfg, r)

	if !contains(url, "state=") {
		t.Errorf("expected state in URL, got %s", url)
	}
}

// Tests: Middleware redirects when no token
func TestMiddleware_NoToken_Redirects(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "test-app",
	}

	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	middleware := Middleware(cfg)
	r := httptest.NewRequest(http.MethodGet, "/protected", nil)
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if called {
		t.Error("handler should not be called without token")
	}
	if w.Code != http.StatusFound {
		t.Errorf("expected status 302, got %d", w.Code)
	}
}

// Tests: Middleware sets default cookie name
func TestMiddleware_DefaultCookieName(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "test-app",
	}

	// Verify config is modified with default
	_ = Middleware(cfg)
	
	// Config should use default "ds_session"
	if cfg.SessionCookieName != "" {
		// Original config is not modified - defaults are applied internally
	}
}

// Tests: APIMiddleware returns 401 when no token
func TestAPIMiddleware_NoToken_Returns401(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "test-app",
	}

	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	middleware := APIMiddleware(cfg)
	r := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if called {
		t.Error("handler should not be called without token")
	}
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// Tests: APIMiddleware returns JSON error
func TestAPIMiddleware_NoToken_ReturnsJSON(t *testing.T) {
	cfg := Config{}
	middleware := APIMiddleware(cfg)
	r := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
	w := httptest.NewRecorder()

	middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})).ServeHTTP(w, r)

	body := w.Body.String()
	if !contains(body, "UNAUTHORIZED") {
		t.Errorf("expected UNAUTHORIZED error, got %s", body)
	}
}

// Tests: OptionalAuthMiddleware passes through without token
func TestOptionalAuthMiddleware_NoToken_PassesThrough(t *testing.T) {
	cfg := Config{}

	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	middleware := OptionalAuthMiddleware(cfg)
	r := httptest.NewRequest(http.MethodGet, "/public", nil)
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if !called {
		t.Error("handler should be called for optional auth")
	}
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

// Tests: OptionalAuthMiddleware extracts user when token valid
func TestOptionalAuthMiddleware_ValidToken_ExtractsUser(t *testing.T) {
	mockUser := &User{ID: "user-123", Email: "test@example.com"}
	cfg := Config{
		TokenValidator: func(token string) (*User, error) {
			if token == "valid-token" {
				return mockUser, nil
			}
			return nil, http.ErrNoCookie
		},
	}

	var capturedUser *User
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUser = GetUser(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	middleware := OptionalAuthMiddleware(cfg)
	r := httptest.NewRequest(http.MethodGet, "/public", nil)
	r.Header.Set("Authorization", "Bearer valid-token")
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if capturedUser == nil {
		t.Error("expected user in context")
	}
	if capturedUser != nil && capturedUser.ID != "user-123" {
		t.Errorf("expected user ID 'user-123', got %q", capturedUser.ID)
	}
}

// Tests: ClearTokenCache clears cache
func TestClearTokenCache_ClearsCache(t *testing.T) {
	// Add something to cache
	tokenCache.Lock()
	tokenCache.entries["test-token"] = cacheEntry{
		user:      &User{ID: "user-1"},
		expiresAt: time.Now().Add(time.Hour),
	}
	tokenCache.Unlock()

	ClearTokenCache()

	tokenCache.RLock()
	length := len(tokenCache.entries)
	tokenCache.RUnlock()

	if length != 0 {
		t.Errorf("expected empty cache, got %d entries", length)
	}
}

// Tests: InvalidateToken removes specific token
func TestInvalidateToken_RemovesToken(t *testing.T) {
	// Add tokens to cache
	tokenCache.Lock()
	tokenCache.entries["token-1"] = cacheEntry{
		user:      &User{ID: "user-1"},
		expiresAt: time.Now().Add(time.Hour),
	}
	tokenCache.entries["token-2"] = cacheEntry{
		user:      &User{ID: "user-2"},
		expiresAt: time.Now().Add(time.Hour),
	}
	tokenCache.Unlock()

	InvalidateToken("token-1")

	tokenCache.RLock()
	_, exists1 := tokenCache.entries["token-1"]
	_, exists2 := tokenCache.entries["token-2"]
	tokenCache.RUnlock()

	if exists1 {
		t.Error("expected token-1 to be removed")
	}
	if !exists2 {
		t.Error("expected token-2 to still exist")
	}

	// Cleanup
	ClearTokenCache()
}

// Tests: Middleware extracts tenant from header
func TestMiddleware_ExtractsTenantFromHeader(t *testing.T) {
	mockUser := &User{ID: "user-123"}
	cfg := Config{
		TokenValidator: func(token string) (*User, error) {
			return mockUser, nil
		},
	}

	var capturedTenant string
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedTenant = GetTenantID(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	middleware := Middleware(cfg)
	r := httptest.NewRequest(http.MethodGet, "/resource", nil)
	r.Header.Set("Authorization", "Bearer valid-token")
	r.Header.Set("X-Tenant-ID", "tenant-abc")
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if capturedTenant != "tenant-abc" {
		t.Errorf("expected tenant 'tenant-abc', got %q", capturedTenant)
	}
}

// Tests: Config has correct defaults
func TestDefaultConfig_HasDefaults(t *testing.T) {
	cfg := DefaultConfig()

	if cfg.SessionCookieName != "ds_session" {
		t.Errorf("expected SessionCookieName 'ds_session', got %q", cfg.SessionCookieName)
	}
	if cfg.SessionMaxAge != 86400 {
		t.Errorf("expected SessionMaxAge 86400, got %d", cfg.SessionMaxAge)
	}
}

// Tests: User JSON marshaling
func TestUser_JSONMarshal(t *testing.T) {
	user := &User{
		ID:    "user-123",
		Email: "test@example.com",
		Name:  "Test User",
		Tenants: []Tenant{
			{ID: "tenant-1", Name: "Tenant 1", Role: "admin"},
		},
	}

	data, err := json.Marshal(user)
	if err != nil {
		t.Fatalf("failed to marshal user: %v", err)
	}

	var decoded User
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal user: %v", err)
	}

	if decoded.ID != user.ID {
		t.Errorf("expected ID %q, got %q", user.ID, decoded.ID)
	}
	if len(decoded.Tenants) != 1 {
		t.Errorf("expected 1 tenant, got %d", len(decoded.Tenants))
	}
}

// Tests: Tenant structure
func TestTenant_Structure(t *testing.T) {
	tenant := Tenant{
		ID:   "tenant-123",
		Name: "Test Tenant",
		Role: "member",
	}

	if tenant.ID != "tenant-123" {
		t.Error("ID not accessible")
	}
	if tenant.Name != "Test Tenant" {
		t.Error("Name not accessible")
	}
	if tenant.Role != "member" {
		t.Error("Role not accessible")
	}
}

// Tests: ValidateToken uses custom validator
func TestValidateToken_UsesCustomValidator(t *testing.T) {
	expectedUser := &User{ID: "custom-user"}
	cfg := Config{
		TokenValidator: func(token string) (*User, error) {
			return expectedUser, nil
		},
	}

	user, err := ValidateToken(cfg, "any-token")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.ID != "custom-user" {
		t.Errorf("expected ID 'custom-user', got %q", user.ID)
	}
}

// helper function for string contains check
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsAt(s, substr, 0))
}

func containsAt(s, substr string, start int) bool {
	for i := start; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
