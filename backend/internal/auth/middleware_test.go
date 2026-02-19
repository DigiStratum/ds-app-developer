package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

// Tests for FR-AUTH: Authentication & Authorization requirements
// See REQUIREMENTS.md for full requirement descriptions

// TestMiddleware_WithValidToken_ExtractsUserContext tests FR-AUTH-001 and FR-AUTH-003
// FR-AUTH-001: Users authenticate via DSAccount SSO
// FR-AUTH-003: Session includes user identity and tenant context
func TestMiddleware_WithValidToken_ExtractsUserContext(t *testing.T) {
	// Arrange
	var capturedCtx context.Context
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
		w.WriteHeader(http.StatusOK)
	})

	middleware := Middleware(handler)
	req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	req.Header.Set("X-Tenant-ID", "tenant-123")
	rr := httptest.NewRecorder()

	// Act
	middleware.ServeHTTP(rr, req)

	// Assert
	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}

	user := GetUser(capturedCtx)
	if user == nil {
		t.Fatal("expected user in context, got nil")
	}

	tenantID := GetTenantID(capturedCtx)
	if tenantID != "tenant-123" {
		t.Errorf("expected tenant-123, got %s", tenantID)
	}
}

// TestMiddleware_WithoutToken_RedirectsToSSO tests FR-AUTH-002
// FR-AUTH-002: Unauthenticated requests redirect to SSO login
func TestMiddleware_WithoutToken_RedirectsToSSO(t *testing.T) {
	// Arrange
	t.Setenv("DSACCOUNT_SSO_URL", "https://account.example.com")
	t.Setenv("DSACCOUNT_APP_ID", "test-app")
	t.Setenv("APP_URL", "https://app.example.com")

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called for unauthenticated request")
	})

	middleware := Middleware(handler)
	req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
	// No Authorization header or session cookie
	rr := httptest.NewRecorder()

	// Act
	middleware.ServeHTTP(rr, req)

	// Assert
	if rr.Code != http.StatusFound {
		t.Errorf("expected redirect status 302, got %d", rr.Code)
	}

	location := rr.Header().Get("Location")
	if location == "" {
		t.Error("expected Location header for redirect")
	}
	// Verify redirect includes SSO URL
	if !contains(location, "account.example.com") {
		t.Errorf("expected redirect to SSO URL, got %s", location)
	}
}

// TestGetTenantID_FromContext tests FR-TENANT-001
// FR-TENANT-001: User session identifies current tenant (or "none" for personal)
func TestGetTenantID_FromContext(t *testing.T) {
	tests := []struct {
		name     string
		tenantID string
		expected string
	}{
		{
			name:     "with tenant ID",
			tenantID: "tenant-abc",
			expected: "tenant-abc",
		},
		{
			name:     "without tenant ID (personal)",
			tenantID: "",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			ctx = context.WithValue(ctx, tenantContextKey, tt.tenantID)

			result := GetTenantID(ctx)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

// TestMiddleware_ExtractsTenantFromHeader tests FR-TENANT-004
// FR-TENANT-004: API requests include X-Tenant-ID header
func TestMiddleware_ExtractsTenantFromHeader(t *testing.T) {
	// Arrange
	var capturedTenantID string
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedTenantID = GetTenantID(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	middleware := Middleware(handler)
	req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	req.Header.Set("X-Tenant-ID", "org-456")
	rr := httptest.NewRecorder()

	// Act
	middleware.ServeHTTP(rr, req)

	// Assert
	if capturedTenantID != "org-456" {
		t.Errorf("expected tenant ID from header org-456, got %s", capturedTenantID)
	}
}

// Helper function
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
