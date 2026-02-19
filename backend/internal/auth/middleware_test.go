package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DigiStratum/ds-app-skeleton/backend/internal/session"
)

// Tests for FR-AUTH: Authentication & Authorization requirements
// Updated for guest-session-first pattern
// See REQUIREMENTS.md for full requirement descriptions

// TestMiddleware_WithAuthenticatedSession_ExtractsUserContext tests FR-AUTH-001 and FR-AUTH-003
// FR-AUTH-001: Users authenticate via DSAccount SSO
// FR-AUTH-003: Session includes user identity and tenant context
func TestMiddleware_WithAuthenticatedSession_ExtractsUserContext(t *testing.T) {
	// Arrange: Create an authenticated session
	store := session.GetStore()
	sess := store.Create("tenant-123")
	store.Upgrade(sess.ID, "user-123")

	var capturedCtx context.Context
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
		w.WriteHeader(http.StatusOK)
	})

	// Apply both session and auth middleware
	middleware := session.Middleware(Middleware(handler))
	req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
	req.AddCookie(&http.Cookie{Name: "ds_session", Value: sess.ID})
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

	// Cleanup
	store.Delete(sess.ID)
}

// TestMiddleware_WithGuestSession_AllowsAccess tests guest-session-first pattern
// Guest sessions should pass through auth middleware without user context
func TestMiddleware_WithGuestSession_AllowsAccess(t *testing.T) {
	// Arrange: Create a guest (unauthenticated) session
	store := session.GetStore()
	sess := store.Create("")

	var capturedCtx context.Context
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
		w.WriteHeader(http.StatusOK)
	})

	// Apply both session and auth middleware
	middleware := session.Middleware(Middleware(handler))
	req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
	req.AddCookie(&http.Cookie{Name: "ds_session", Value: sess.ID})
	rr := httptest.NewRecorder()

	// Act
	middleware.ServeHTTP(rr, req)

	// Assert
	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}

	// Guest sessions should not have user context
	user := GetUser(capturedCtx)
	if user != nil {
		t.Error("expected no user in context for guest session")
	}

	// Cleanup
	store.Delete(sess.ID)
}

// TestRequireAuthMiddleware_WithoutAuth_Redirects tests FR-AUTH-002
// FR-AUTH-002: Unauthenticated requests to protected routes redirect to SSO login
func TestRequireAuthMiddleware_WithoutAuth_Redirects(t *testing.T) {
	// Arrange
	t.Setenv("DSACCOUNT_SSO_URL", "https://account.example.com")
	t.Setenv("DSACCOUNT_APP_ID", "test-app")
	t.Setenv("APP_URL", "https://app.example.com")

	store := session.GetStore()
	sess := store.Create("")

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called for unauthenticated request")
	})

	// Apply session + auth + require-auth middleware
	middleware := session.Middleware(Middleware(RequireAuthMiddleware(handler)))
	req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
	req.AddCookie(&http.Cookie{Name: "ds_session", Value: sess.ID})
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
	if !contains(location, "account.example.com") {
		t.Errorf("expected redirect to SSO URL, got %s", location)
	}

	// Cleanup
	store.Delete(sess.ID)
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
	store := session.GetStore()
	sess := store.Create("")
	store.Upgrade(sess.ID, "user-123")

	var capturedTenantID string
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedTenantID = GetTenantID(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	middleware := session.Middleware(Middleware(handler))
	req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
	req.AddCookie(&http.Cookie{Name: "ds_session", Value: sess.ID})
	req.Header.Set("X-Tenant-ID", "org-456")
	rr := httptest.NewRecorder()

	// Act
	middleware.ServeHTTP(rr, req)

	// Assert
	if capturedTenantID != "org-456" {
		t.Errorf("expected tenant ID from header org-456, got %s", capturedTenantID)
	}

	// Cleanup
	store.Delete(sess.ID)
}

// TestSessionUpgrade_PreservesSessionID tests session upgrade pattern
// Session should survive auth flow (upgrade, not replace)
func TestSessionUpgrade_PreservesSessionID(t *testing.T) {
	store := session.GetStore()

	// Create a guest session
	guestSession := store.Create("tenant-1")
	originalID := guestSession.ID

	if !guestSession.IsGuest {
		t.Error("expected guest session")
	}

	// Upgrade the session
	upgradedSession := store.Upgrade(originalID, "user-123")

	// Verify the session ID is preserved
	if upgradedSession.ID != originalID {
		t.Errorf("expected session ID to be preserved, got %s instead of %s", upgradedSession.ID, originalID)
	}

	// Verify the session is now authenticated
	if upgradedSession.IsGuest {
		t.Error("expected upgraded session to not be guest")
	}
	if !upgradedSession.IsAuthenticated() {
		t.Error("expected upgraded session to be authenticated")
	}

	// Verify tenant is preserved
	if upgradedSession.TenantID != "tenant-1" {
		t.Errorf("expected tenant ID to be preserved, got %s", upgradedSession.TenantID)
	}

	// Cleanup
	store.Delete(originalID)
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
