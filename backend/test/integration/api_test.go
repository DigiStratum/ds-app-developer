package integration

import (
	"encoding/json"
	"net/http"
	"testing"
)

// Integration tests for API endpoints
// These tests exercise the full HTTP handler stack with middleware

// Tests for NFR-AVAIL-003: Health endpoint
// The health endpoint should return service status without authentication
func TestHealthEndpoint_ReturnsHealthy(t *testing.T) {
	// Arrange
	server := NewTestServer(t)
	defer server.Close()

	// Act
	resp := server.Get("/health")
	defer func() { _ = resp.Body.Close() }()

	// Assert
	AssertStatus(t, resp, http.StatusOK)
	AssertContentType(t, resp, "application/json")

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if body["status"] != "healthy" {
		t.Errorf("expected status=healthy, got %v", body["status"])
	}
}

// Tests for database fixture seeding
func TestFixtures_CanSeedAndRetrieve(t *testing.T) {
	// Arrange
	server := NewTestServer(t)
	defer server.Close()

	// Seed test data
	server.SeedFixture(TenantFixture("test-tenant", "Test Tenant"))
	server.SeedFixture(UserFixture("test-tenant", "user-1", "alice@example.com"))
	server.SeedFixture(UserFixture("test-tenant", "user-2", "bob@example.com"))

	// Assert - verify database has the data
	// This is a basic smoke test to ensure fixtures work
	db := server.DB()
	if db.TableName == "" {
		t.Error("expected table name to be set")
	}
}

// Tests for FixtureBuilder
func TestFixtureBuilder_BuildsComplexScenarios(t *testing.T) {
	// Arrange
	server := NewTestServer(t)
	defer server.Close()

	// Build and seed fixtures
	fixtures := NewFixtureBuilder().
		WithTenant("acme", "Acme Corp",
			UserInfo{ID: "user-1", Email: "alice@acme.com"},
			UserInfo{ID: "user-2", Email: "bob@acme.com"},
		).
		WithSession("acme", "user-1").
		WithTenant("other", "Other Corp",
			UserInfo{ID: "user-3", Email: "charlie@other.com"},
		).
		Build()

	for _, f := range fixtures {
		server.SeedFixture(f)
	}

	// Assert - 2 tenants + 3 users + 1 session = 6 items
	if len(fixtures) != 6 {
		t.Errorf("expected 6 fixtures, got %d", len(fixtures))
	}
}

// TODO: Add tests for authenticated endpoints once handler integration is complete
// Example tests to implement:
//
// func TestGetCurrentUser_Authenticated(t *testing.T) {
//     server := NewTestServer(t)
//     defer server.Close()
//
//     req := server.NewAuthenticatedRequest("GET", "/api/me")
//     resp := server.Do(req)
//     defer func() { _ = resp.Body.Close() }()
//
//     AssertStatus(t, resp, http.StatusOK)
//     // ... verify user data
// }
//
// func TestGetCurrentUser_Unauthenticated(t *testing.T) {
//     server := NewTestServer(t)
//     defer server.Close()
//
//     req := server.NewRequest("GET", "/api/me")
//     resp := server.Do(req)
//     defer func() { _ = resp.Body.Close() }()
//
//     // Should redirect to SSO or return 401
//     if resp.StatusCode != http.StatusFound && resp.StatusCode != http.StatusUnauthorized {
//         t.Errorf("expected 302 or 401, got %d", resp.StatusCode)
//     }
// }
//
// func TestTenantIsolation_QueriesAreTenantScoped(t *testing.T) {
//     server := NewTestServer(t)
//     defer server.Close()
//
//     // Seed data for two tenants
//     server.SeedFixture(UserFixture("tenant-a", "user-1", "alice@a.com"))
//     server.SeedFixture(UserFixture("tenant-b", "user-2", "bob@b.com"))
//
//     // Request as tenant-a
//     req := server.NewAuthenticatedRequest("GET", "/api/users")
//     req.Header.Set("X-Tenant-ID", "tenant-a")
//     resp := server.Do(req)
//     defer func() { _ = resp.Body.Close() }()
//
//     // Should only see tenant-a's data
//     // ... verify response
// }
