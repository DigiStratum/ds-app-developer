package dsauth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

// Tests: DefaultTenantValidator returns true when user has tenant
func TestDefaultTenantValidator_HasTenant_ReturnsTrue(t *testing.T) {
	user := &User{
		ID: "user-1",
		Tenants: []Tenant{
			{ID: "tenant-a", Name: "Tenant A"},
			{ID: "tenant-b", Name: "Tenant B"},
		},
	}

	result := DefaultTenantValidator(user, "tenant-a")

	if !result {
		t.Error("expected true for user with tenant")
	}
}

// Tests: DefaultTenantValidator returns false when user lacks tenant
func TestDefaultTenantValidator_LacksTenant_ReturnsFalse(t *testing.T) {
	user := &User{
		ID: "user-1",
		Tenants: []Tenant{
			{ID: "tenant-a", Name: "Tenant A"},
		},
	}

	result := DefaultTenantValidator(user, "tenant-x")

	if result {
		t.Error("expected false for user without tenant")
	}
}

// Tests: DefaultTenantValidator returns false for nil user
func TestDefaultTenantValidator_NilUser_ReturnsFalse(t *testing.T) {
	result := DefaultTenantValidator(nil, "tenant-a")

	if result {
		t.Error("expected false for nil user")
	}
}

// Tests: DefaultTenantValidator returns false for empty tenant ID
func TestDefaultTenantValidator_EmptyTenantID_ReturnsFalse(t *testing.T) {
	user := &User{ID: "user-1", Tenants: []Tenant{{ID: "tenant-a"}}}

	result := DefaultTenantValidator(user, "")

	if result {
		t.Error("expected false for empty tenant ID")
	}
}

// Tests: DefaultTenantValidator returns false for user with no tenants
func TestDefaultTenantValidator_NoTenants_ReturnsFalse(t *testing.T) {
	user := &User{ID: "user-1", Tenants: []Tenant{}}

	result := DefaultTenantValidator(user, "tenant-a")

	if result {
		t.Error("expected false for user with no tenants")
	}
}

// Tests: RequireTenantMiddleware returns 400 when no tenant header
func TestRequireTenantMiddleware_NoTenant_Returns400(t *testing.T) {
	middleware := RequireTenantMiddleware(nil)

	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	r := httptest.NewRequest(http.MethodGet, "/resource", nil)
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if called {
		t.Error("handler should not be called without tenant")
	}
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: RequireTenantMiddleware returns 403 for invalid tenant access
func TestRequireTenantMiddleware_InvalidAccess_Returns403(t *testing.T) {
	user := &User{
		ID:      "user-1",
		Tenants: []Tenant{{ID: "tenant-a"}},
	}

	middleware := RequireTenantMiddleware(DefaultTenantValidator)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	})

	r := httptest.NewRequest(http.MethodGet, "/resource", nil)
	ctx := WithUser(r.Context(), user)
	ctx = WithTenant(ctx, "tenant-forbidden")
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

// Tests: RequireTenantMiddleware passes through for valid tenant
func TestRequireTenantMiddleware_ValidTenant_PassesThrough(t *testing.T) {
	user := &User{
		ID:      "user-1",
		Tenants: []Tenant{{ID: "tenant-a", Name: "Tenant A"}},
	}

	middleware := RequireTenantMiddleware(DefaultTenantValidator)

	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	r := httptest.NewRequest(http.MethodGet, "/resource", nil)
	ctx := WithUser(r.Context(), user)
	ctx = WithTenant(ctx, "tenant-a")
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if !called {
		t.Error("handler should be called for valid tenant")
	}
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

// Tests: RequireTenantMiddleware uses default validator when nil
func TestRequireTenantMiddleware_NilValidator_UsesDefault(t *testing.T) {
	user := &User{
		ID:      "user-1",
		Tenants: []Tenant{{ID: "tenant-a"}},
	}

	middleware := RequireTenantMiddleware(nil)

	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	r := httptest.NewRequest(http.MethodGet, "/resource", nil)
	ctx := WithUser(r.Context(), user)
	ctx = WithTenant(ctx, "tenant-a")
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if !called {
		t.Error("handler should be called with default validator")
	}
}

// Tests: ExtractTenantFromSubdomain extracts simple subdomain
func TestExtractTenantFromSubdomain_SimpleSubdomain(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Host = "acme.app.example.com"

	tenant := ExtractTenantFromSubdomain(r, "app.example.com")

	if tenant != "acme" {
		t.Errorf("expected tenant 'acme', got %q", tenant)
	}
}

// Tests: ExtractTenantFromSubdomain returns empty for base domain
func TestExtractTenantFromSubdomain_BaseDomain(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Host = "app.example.com"

	tenant := ExtractTenantFromSubdomain(r, "app.example.com")

	if tenant != "" {
		t.Errorf("expected empty tenant, got %q", tenant)
	}
}

// Tests: ExtractTenantFromSubdomain returns empty for different domain
func TestExtractTenantFromSubdomain_DifferentDomain(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Host = "other.example.org"

	tenant := ExtractTenantFromSubdomain(r, "app.example.com")

	if tenant != "" {
		t.Errorf("expected empty tenant, got %q", tenant)
	}
}

// Tests: ExtractTenantFromSubdomain handles nested subdomains
func TestExtractTenantFromSubdomain_NestedSubdomain(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Host = "deep.acme.app.example.com"

	tenant := ExtractTenantFromSubdomain(r, "app.example.com")

	// Should return first part (deep)
	if tenant != "deep" {
		t.Errorf("expected tenant 'deep', got %q", tenant)
	}
}

// Tests: TenantFromSubdomainMiddleware extracts tenant
func TestTenantFromSubdomainMiddleware_ExtractsTenant(t *testing.T) {
	middleware := TenantFromSubdomainMiddleware("app.example.com")

	var capturedTenant string
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedTenant = GetTenantID(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Host = "acme.app.example.com"
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if capturedTenant != "acme" {
		t.Errorf("expected tenant 'acme', got %q", capturedTenant)
	}
}

// Tests: TenantFromSubdomainMiddleware doesn't override header tenant
func TestTenantFromSubdomainMiddleware_HeaderTakesPrecedence(t *testing.T) {
	middleware := TenantFromSubdomainMiddleware("app.example.com")

	var capturedTenant string
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedTenant = GetTenantID(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Host = "acme.app.example.com"
	ctx := WithTenant(r.Context(), "header-tenant")
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if capturedTenant != "header-tenant" {
		t.Errorf("expected tenant 'header-tenant', got %q", capturedTenant)
	}
}

// Tests: SetTenantHeader sets X-Tenant-ID header
func TestSetTenantHeader_SetsHeader(t *testing.T) {
	ctx := WithTenant(context.Background(), "tenant-123")
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	SetTenantHeader(ctx, req)

	header := req.Header.Get("X-Tenant-ID")
	if header != "tenant-123" {
		t.Errorf("expected header 'tenant-123', got %q", header)
	}
}

// Tests: SetTenantHeader does nothing for empty tenant
func TestSetTenantHeader_EmptyTenant_DoesNothing(t *testing.T) {
	ctx := context.Background()
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	SetTenantHeader(ctx, req)

	header := req.Header.Get("X-Tenant-ID")
	if header != "" {
		t.Errorf("expected empty header, got %q", header)
	}
}

// Tests: Custom validator function can be provided
func TestRequireTenantMiddleware_CustomValidator(t *testing.T) {
	customValidator := func(user *User, tenantID string) bool {
		// Always allow "super-tenant"
		return tenantID == "super-tenant"
	}

	middleware := RequireTenantMiddleware(customValidator)

	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	r := httptest.NewRequest(http.MethodGet, "/resource", nil)
	ctx := WithTenant(r.Context(), "super-tenant")
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	if !called {
		t.Error("handler should be called with custom validator passing")
	}
}

// Tests: RequireTenantMiddleware JSON error response
func TestRequireTenantMiddleware_NoTenant_JSONError(t *testing.T) {
	middleware := RequireTenantMiddleware(nil)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})

	r := httptest.NewRequest(http.MethodGet, "/resource", nil)
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	body := w.Body.String()
	if body == "" {
		t.Error("expected error body")
	}
	if !containsStr(body, "TENANT_REQUIRED") {
		t.Errorf("expected TENANT_REQUIRED in body, got %s", body)
	}
}

// Tests: RequireTenantMiddleware forbidden error includes message
func TestRequireTenantMiddleware_Forbidden_IncludesMessage(t *testing.T) {
	user := &User{ID: "user-1", Tenants: []Tenant{}}

	middleware := RequireTenantMiddleware(nil)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})

	r := httptest.NewRequest(http.MethodGet, "/resource", nil)
	ctx := WithUser(r.Context(), user)
	ctx = WithTenant(ctx, "forbidden-tenant")
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()

	middleware(handler).ServeHTTP(w, r)

	body := w.Body.String()
	if !containsStr(body, "TENANT_FORBIDDEN") {
		t.Errorf("expected TENANT_FORBIDDEN in body, got %s", body)
	}
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
