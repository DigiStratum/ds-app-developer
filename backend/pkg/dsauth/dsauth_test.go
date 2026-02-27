package dsauth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGetUser_WithUser_ReturnsUser(t *testing.T) {
	user := &User{
		ID:      "user-123",
		Email:   "test@example.com",
		Name:    "Test User",
		Tenants: []Tenant{{ID: "tenant-1", Name: "Tenant 1"}},
	}

	ctx := WithUser(context.Background(), user)
	got := GetUser(ctx)

	if got == nil {
		t.Fatal("expected user, got nil")
	}
	if got.ID != user.ID {
		t.Errorf("expected ID %s, got %s", user.ID, got.ID)
	}
}

func TestGetUser_WithoutUser_ReturnsNil(t *testing.T) {
	ctx := context.Background()
	got := GetUser(ctx)

	if got != nil {
		t.Errorf("expected nil, got %+v", got)
	}
}

func TestGetTenantID_WithTenant_ReturnsTenant(t *testing.T) {
	ctx := WithTenant(context.Background(), "tenant-abc")
	got := GetTenantID(ctx)

	if got != "tenant-abc" {
		t.Errorf("expected tenant-abc, got %s", got)
	}
}

func TestGetTenantID_WithoutTenant_ReturnsEmpty(t *testing.T) {
	ctx := context.Background()
	got := GetTenantID(ctx)

	if got != "" {
		t.Errorf("expected empty string, got %s", got)
	}
}

func TestMustGetUser_WithUser_ReturnsUser(t *testing.T) {
	user := &User{ID: "user-123"}
	ctx := WithUser(context.Background(), user)

	got := MustGetUser(ctx)
	if got.ID != user.ID {
		t.Errorf("expected ID %s, got %s", user.ID, got.ID)
	}
}

func TestMustGetUser_WithoutUser_Panics(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Error("expected panic, got none")
		}
	}()

	ctx := context.Background()
	MustGetUser(ctx)
}

func TestMiddleware_WithValidToken_ExtractsContext(t *testing.T) {
	// Use a custom TokenValidator to avoid hitting real DSAccount
	mockUser := &User{
		ID:      "user-mock",
		Email:   "mock@example.com",
		Name:    "Mock User",
		Tenants: []Tenant{{ID: "tenant-123", Name: "Tenant 123"}},
	}

	cfg := Config{
		SSOBaseURL:        "https://sso.example.com",
		AppID:             "test-app",
		AppURL:            "https://app.example.com",
		SessionCookieName: "ds_session",
		TokenValidator: func(token string) (*User, error) {
			if token == "test-token" {
				return mockUser, nil
			}
			return nil, http.ErrNoCookie
		},
	}

	var capturedUser *User
	var capturedTenant string

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUser = GetUser(r.Context())
		capturedTenant = GetTenantID(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	middleware := Middleware(cfg)
	req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("X-Tenant-ID", "tenant-123")
	rr := httptest.NewRecorder()

	middleware(handler).ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}
	if capturedUser == nil {
		t.Error("expected user in context, got nil")
	}
	if capturedTenant != "tenant-123" {
		t.Errorf("expected tenant tenant-123, got %s", capturedTenant)
	}
}

func TestMiddleware_WithoutToken_Redirects(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "test-app",
		AppURL:     "https://app.example.com",
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called without auth")
	})

	middleware := Middleware(cfg)
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	rr := httptest.NewRecorder()

	middleware(handler).ServeHTTP(rr, req)

	if rr.Code != http.StatusFound {
		t.Errorf("expected redirect status 302, got %d", rr.Code)
	}
	location := rr.Header().Get("Location")
	if location == "" {
		t.Error("expected Location header")
	}
}

func TestAPIMiddleware_WithoutToken_Returns401(t *testing.T) {
	cfg := Config{
		SSOBaseURL: "https://sso.example.com",
		AppID:      "test-app",
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called without auth")
	})

	middleware := APIMiddleware(cfg)
	req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
	rr := httptest.NewRecorder()

	middleware(handler).ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rr.Code)
	}
}

func TestOptionalAuthMiddleware_WithoutToken_PassesThrough(t *testing.T) {
	cfg := Config{}

	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		user := GetUser(r.Context())
		if user != nil {
			t.Error("expected no user without token")
		}
		w.WriteHeader(http.StatusOK)
	})

	middleware := OptionalAuthMiddleware(cfg)
	req := httptest.NewRequest(http.MethodGet, "/public", nil)
	rr := httptest.NewRecorder()

	middleware(handler).ServeHTTP(rr, req)

	if !called {
		t.Error("handler should be called")
	}
	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}
}

func TestDefaultTenantValidator_UserHasTenant_ReturnsTrue(t *testing.T) {
	user := &User{
		ID:      "user-1",
		Tenants: []Tenant{{ID: "tenant-a", Name: "Tenant A"}, {ID: "tenant-b", Name: "Tenant B"}},
	}

	if !DefaultTenantValidator(user, "tenant-a") {
		t.Error("expected true for valid tenant")
	}
}

func TestDefaultTenantValidator_UserLacksTenant_ReturnsFalse(t *testing.T) {
	user := &User{
		ID:      "user-1",
		Tenants: []Tenant{{ID: "tenant-a", Name: "Tenant A"}},
	}

	if DefaultTenantValidator(user, "tenant-c") {
		t.Error("expected false for missing tenant")
	}
}

func TestExtractTenantFromSubdomain(t *testing.T) {
	tests := []struct {
		host       string
		baseDomain string
		expected   string
	}{
		{"acme.app.example.com", "app.example.com", "acme"},
		{"app.example.com", "app.example.com", ""},
		{"example.com", "app.example.com", ""},
		{"deep.acme.app.example.com", "app.example.com", "deep"},
	}

	for _, tc := range tests {
		t.Run(tc.host, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.Host = tc.host

			got := ExtractTenantFromSubdomain(req, tc.baseDomain)
			if got != tc.expected {
				t.Errorf("expected %q, got %q", tc.expected, got)
			}
		})
	}
}
