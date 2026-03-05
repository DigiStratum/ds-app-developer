// Package featureflags tests for feature flag structures and evaluation.
package featureflags

import (
	"testing"
	"time"
)

func TestNewFeatureFlag_SetsDefaults(t *testing.T) {
	flag := NewFeatureFlag("test-flag", "Test description", true)

	if flag.Key != "test-flag" {
		t.Errorf("expected key 'test-flag', got %q", flag.Key)
	}
	if flag.Description != "Test description" {
		t.Errorf("expected description, got %q", flag.Description)
	}
	if !flag.Enabled {
		t.Error("expected flag to be enabled")
	}
	if flag.Percentage != 0 {
		t.Errorf("expected percentage 0, got %d", flag.Percentage)
	}
	if flag.Tenants == nil {
		t.Error("expected Tenants to be initialized")
	}
	if flag.Users == nil {
		t.Error("expected Users to be initialized")
	}
	if flag.CreatedAt.IsZero() {
		t.Error("expected CreatedAt to be set")
	}
	if flag.UpdatedAt.IsZero() {
		t.Error("expected UpdatedAt to be set")
	}
}

func TestNewFeatureFlag_DisabledFlag(t *testing.T) {
	flag := NewFeatureFlag("disabled-flag", "Disabled feature", false)

	if flag.Enabled {
		t.Error("expected flag to be disabled")
	}
}

func TestContainsString(t *testing.T) {
	tests := []struct {
		name     string
		slice    []string
		s        string
		expected bool
	}{
		{"empty slice", []string{}, "test", false},
		{"not found", []string{"a", "b", "c"}, "d", false},
		{"found first", []string{"a", "b", "c"}, "a", true},
		{"found middle", []string{"a", "b", "c"}, "b", true},
		{"found last", []string{"a", "b", "c"}, "c", true},
		{"empty string in slice", []string{"", "a"}, "", true},
		{"case sensitive", []string{"ABC"}, "abc", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsString(tt.slice, tt.s)
			if result != tt.expected {
				t.Errorf("containsString(%v, %q) = %v, want %v", tt.slice, tt.s, result, tt.expected)
			}
		})
	}
}

func TestFeatureFlag_Structure(t *testing.T) {
	now := time.Now().UTC()
	flag := &FeatureFlag{
		Key:             "complete-flag",
		Enabled:         true,
		Description:     "A complete flag",
		Tenants:         []string{"tenant-1", "tenant-2"},
		Users:           []string{"user-1", "user-2"},
		DisabledTenants: []string{"tenant-disabled"},
		DisabledUsers:   []string{"user-disabled"},
		Percentage:      50,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if len(flag.Tenants) != 2 {
		t.Errorf("expected 2 tenants, got %d", len(flag.Tenants))
	}
	if len(flag.Users) != 2 {
		t.Errorf("expected 2 users, got %d", len(flag.Users))
	}
	if len(flag.DisabledTenants) != 1 {
		t.Errorf("expected 1 disabled tenant, got %d", len(flag.DisabledTenants))
	}
	if len(flag.DisabledUsers) != 1 {
		t.Errorf("expected 1 disabled user, got %d", len(flag.DisabledUsers))
	}
	if flag.Percentage != 50 {
		t.Errorf("expected percentage 50, got %d", flag.Percentage)
	}
}

func TestEvaluationContext_Structure(t *testing.T) {
	ctx := &EvaluationContext{
		UserID:    "user-123",
		SessionID: "session-456",
		TenantID:  "tenant-789",
	}

	if ctx.UserID != "user-123" {
		t.Error("expected UserID to be set")
	}
	if ctx.SessionID != "session-456" {
		t.Error("expected SessionID to be set")
	}
	if ctx.TenantID != "tenant-789" {
		t.Error("expected TenantID to be set")
	}
}

func TestEvaluatedFlag_Structure(t *testing.T) {
	result := &EvaluatedFlag{
		Key:     "my-flag",
		Enabled: true,
		Reason:  "user override",
	}

	if result.Key != "my-flag" {
		t.Error("expected Key to be set")
	}
	if !result.Enabled {
		t.Error("expected Enabled to be true")
	}
	if result.Reason != "user override" {
		t.Error("expected Reason to be set")
	}
}
