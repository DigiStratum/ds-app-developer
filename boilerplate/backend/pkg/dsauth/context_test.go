package dsauth

import (
	"context"
	"testing"
)

// Tests: MustGetTenantID panics when no tenant
func TestMustGetTenantID_PanicsWhenEmpty(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Error("expected panic for empty tenant")
		}
	}()

	ctx := context.Background()
	MustGetTenantID(ctx)
}

// Tests: MustGetTenantID returns tenant when set
func TestMustGetTenantID_ReturnsTenant(t *testing.T) {
	ctx := WithTenant(context.Background(), "tenant-123")

	tenant := MustGetTenantID(ctx)

	if tenant != "tenant-123" {
		t.Errorf("expected 'tenant-123', got %q", tenant)
	}
}

// Tests: WithUser adds user to context
func TestWithUser_AddsToContext(t *testing.T) {
	user := &User{ID: "user-123", Email: "test@example.com"}
	ctx := WithUser(context.Background(), user)

	retrieved := GetUser(ctx)

	if retrieved == nil {
		t.Fatal("expected user in context")
	}
	if retrieved.ID != "user-123" {
		t.Errorf("expected ID 'user-123', got %q", retrieved.ID)
	}
}

// Tests: GetUser returns nil for empty context
func TestGetUser_ReturnsNilForEmpty(t *testing.T) {
	ctx := context.Background()

	user := GetUser(ctx)

	if user != nil {
		t.Error("expected nil user")
	}
}

// Tests: WithTenant adds tenant to context
func TestWithTenant_AddsToContext(t *testing.T) {
	ctx := WithTenant(context.Background(), "tenant-abc")

	tenant := GetTenantID(ctx)

	if tenant != "tenant-abc" {
		t.Errorf("expected 'tenant-abc', got %q", tenant)
	}
}

// Tests: GetTenantID returns empty for empty context
func TestGetTenantID_ReturnsEmptyForEmpty(t *testing.T) {
	ctx := context.Background()

	tenant := GetTenantID(ctx)

	if tenant != "" {
		t.Errorf("expected empty string, got %q", tenant)
	}
}
