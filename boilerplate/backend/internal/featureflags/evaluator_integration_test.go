package featureflags

import (
	"context"
	"testing"
)

// Tests: NewEvaluator creates a valid evaluator with the provided store
func TestNewEvaluator_CreatesWithStore(t *testing.T) {
	store := NewMockStore()
	evaluator := NewEvaluator(store)

	if evaluator == nil {
		t.Fatal("expected non-nil evaluator")
	}
	if evaluator.store != store {
		t.Error("expected evaluator to have the provided store")
	}
}

// Tests: Evaluate returns flag_not_found for missing flag
func TestEvaluator_Evaluate_FlagNotFound(t *testing.T) {
	store := NewMockStore()
	evaluator := NewEvaluator(store)

	result, err := evaluator.Evaluate(context.Background(), "nonexistent-flag", &EvaluationContext{})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Enabled {
		t.Error("expected disabled for nonexistent flag")
	}
	if result.Reason != "flag_not_found" {
		t.Errorf("expected reason 'flag_not_found', got %q", result.Reason)
	}
	if result.Key != "nonexistent-flag" {
		t.Errorf("expected key 'nonexistent-flag', got %q", result.Key)
	}
}

// Tests: Evaluate returns store error on failure
func TestEvaluator_Evaluate_StoreError(t *testing.T) {
	store := NewMockStore()
	store.SetGetError(errMockStorage)
	evaluator := NewEvaluator(store)

	result, err := evaluator.Evaluate(context.Background(), "test-flag", &EvaluationContext{})

	if err == nil {
		t.Fatal("expected error from store")
	}
	if result != nil {
		t.Error("expected nil result on error")
	}
}

// Tests: Evaluate returns global enabled for enabled flag
func TestEvaluator_Evaluate_GlobalEnabled(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:     "enabled-flag",
		Enabled: true,
	})
	evaluator := NewEvaluator(store)

	result, err := evaluator.Evaluate(context.Background(), "enabled-flag", &EvaluationContext{})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Enabled {
		t.Error("expected flag to be enabled")
	}
	if result.Reason != "global_enabled" {
		t.Errorf("expected reason 'global_enabled', got %q", result.Reason)
	}
}

// Tests: Evaluate returns global disabled for disabled flag
func TestEvaluator_Evaluate_GlobalDisabled(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:     "disabled-flag",
		Enabled: false,
	})
	evaluator := NewEvaluator(store)

	result, err := evaluator.Evaluate(context.Background(), "disabled-flag", &EvaluationContext{})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Enabled {
		t.Error("expected flag to be disabled")
	}
	if result.Reason != "global_disabled" {
		t.Errorf("expected reason 'global_disabled', got %q", result.Reason)
	}
}

// Tests: Evaluate respects user-enabled override
func TestEvaluator_Evaluate_UserEnabled(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:     "user-flag",
		Enabled: false,
		Users:   []string{"user-123", "user-456"},
	})
	evaluator := NewEvaluator(store)

	result, err := evaluator.Evaluate(context.Background(), "user-flag", &EvaluationContext{
		UserID: "user-123",
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Enabled {
		t.Error("expected flag to be enabled for whitelisted user")
	}
	if result.Reason != "user_enabled" {
		t.Errorf("expected reason 'user_enabled', got %q", result.Reason)
	}
}

// Tests: Evaluate respects user-disabled override (highest priority)
func TestEvaluator_Evaluate_UserDisabled(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:           "user-flag",
		Enabled:       true,
		Users:         []string{"user-123"},
		DisabledUsers: []string{"user-123"},
	})
	evaluator := NewEvaluator(store)

	result, err := evaluator.Evaluate(context.Background(), "user-flag", &EvaluationContext{
		UserID: "user-123",
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Enabled {
		t.Error("expected flag to be disabled for blacklisted user")
	}
	if result.Reason != "user_disabled" {
		t.Errorf("expected reason 'user_disabled', got %q", result.Reason)
	}
}

// Tests: Evaluate respects tenant-enabled override
func TestEvaluator_Evaluate_TenantEnabled(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:     "tenant-flag",
		Enabled: false,
		Tenants: []string{"tenant-abc"},
	})
	evaluator := NewEvaluator(store)

	result, err := evaluator.Evaluate(context.Background(), "tenant-flag", &EvaluationContext{
		TenantID: "tenant-abc",
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Enabled {
		t.Error("expected flag to be enabled for whitelisted tenant")
	}
	if result.Reason != "tenant_enabled" {
		t.Errorf("expected reason 'tenant_enabled', got %q", result.Reason)
	}
}

// Tests: Evaluate respects tenant-disabled override
func TestEvaluator_Evaluate_TenantDisabled(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:             "tenant-flag",
		Enabled:         true,
		DisabledTenants: []string{"tenant-blocked"},
	})
	evaluator := NewEvaluator(store)

	result, err := evaluator.Evaluate(context.Background(), "tenant-flag", &EvaluationContext{
		TenantID: "tenant-blocked",
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Enabled {
		t.Error("expected flag to be disabled for blacklisted tenant")
	}
	if result.Reason != "tenant_disabled" {
		t.Errorf("expected reason 'tenant_disabled', got %q", result.Reason)
	}
}

// Tests: Evaluate percentage rollout with user ID
func TestEvaluator_Evaluate_PercentageRollout(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:        "rollout-flag",
		Enabled:    false,
		Percentage: 50,
	})
	evaluator := NewEvaluator(store)

	enabledCount := 0
	for i := 0; i < 100; i++ {
		result, err := evaluator.Evaluate(context.Background(), "rollout-flag", &EvaluationContext{
			UserID: "user-" + string(rune('0'+i%10)) + string(rune('0'+i/10)),
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Enabled {
			enabledCount++
		}
	}

	// With 50% rollout, expect 30-70 enabled
	if enabledCount < 30 || enabledCount > 70 {
		t.Errorf("expected ~50%% rollout, got %d%% enabled", enabledCount)
	}
}

// Tests: Evaluate percentage rollout falls back to session ID
func TestEvaluator_Evaluate_PercentageRollout_SessionFallback(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:        "rollout-flag",
		Enabled:    false,
		Percentage: 50,
	})
	evaluator := NewEvaluator(store)

	// Test with session ID instead of user ID
	result, err := evaluator.Evaluate(context.Background(), "rollout-flag", &EvaluationContext{
		SessionID: "session-abc-123",
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Result should be deterministic - just check it's not an error
	if result.Key != "rollout-flag" {
		t.Errorf("expected key 'rollout-flag', got %q", result.Key)
	}
}

// Tests: EvaluateAll returns empty slice for empty store
func TestEvaluator_EvaluateAll_Empty(t *testing.T) {
	store := NewMockStore()
	evaluator := NewEvaluator(store)

	results, err := evaluator.EvaluateAll(context.Background(), &EvaluationContext{})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 results, got %d", len(results))
	}
}

// Tests: EvaluateAll returns store error on failure
func TestEvaluator_EvaluateAll_StoreError(t *testing.T) {
	store := NewMockStore()
	store.SetListError(errMockStorage)
	evaluator := NewEvaluator(store)

	results, err := evaluator.EvaluateAll(context.Background(), &EvaluationContext{})

	if err == nil {
		t.Fatal("expected error from store")
	}
	if results != nil {
		t.Error("expected nil results on error")
	}
}

// Tests: EvaluateAll evaluates all flags
func TestEvaluator_EvaluateAll_MultipleFlags(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{Key: "flag-1", Enabled: true})
	store.AddFlag(&FeatureFlag{Key: "flag-2", Enabled: false})
	store.AddFlag(&FeatureFlag{Key: "flag-3", Enabled: true})
	evaluator := NewEvaluator(store)

	results, err := evaluator.EvaluateAll(context.Background(), &EvaluationContext{})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}

	// Build map for easier assertion
	resultMap := make(map[string]bool)
	for _, r := range results {
		resultMap[r.Key] = r.Enabled
	}

	if !resultMap["flag-1"] {
		t.Error("expected flag-1 to be enabled")
	}
	if resultMap["flag-2"] {
		t.Error("expected flag-2 to be disabled")
	}
	if !resultMap["flag-3"] {
		t.Error("expected flag-3 to be enabled")
	}
}

// Tests: EvaluateAll applies evaluation context
func TestEvaluator_EvaluateAll_AppliesContext(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:     "user-flag",
		Enabled: false,
		Users:   []string{"user-special"},
	})
	store.AddFlag(&FeatureFlag{
		Key:     "global-flag",
		Enabled: true,
	})
	evaluator := NewEvaluator(store)

	results, err := evaluator.EvaluateAll(context.Background(), &EvaluationContext{
		UserID: "user-special",
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Both flags should be enabled
	for _, r := range results {
		if !r.Enabled {
			t.Errorf("expected flag %s to be enabled", r.Key)
		}
	}
}

// Tests: Evaluate priority - user enable > tenant disable
func TestEvaluator_Evaluate_PriorityUserEnableOverTenantDisable(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:             "priority-flag",
		Enabled:         false,
		Users:           []string{"user-123"},
		DisabledTenants: []string{"tenant-abc"},
	})
	evaluator := NewEvaluator(store)

	result, err := evaluator.Evaluate(context.Background(), "priority-flag", &EvaluationContext{
		UserID:   "user-123",
		TenantID: "tenant-abc",
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Enabled {
		t.Error("expected user enable to take precedence over tenant disable")
	}
	if result.Reason != "user_enabled" {
		t.Errorf("expected reason 'user_enabled', got %q", result.Reason)
	}
}

// Tests: Evaluate calls store.Get
func TestEvaluator_Evaluate_CallsStore(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{Key: "test-flag", Enabled: true})
	evaluator := NewEvaluator(store)

	_, err := evaluator.Evaluate(context.Background(), "test-flag", &EvaluationContext{})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if store.getCalls != 1 {
		t.Errorf("expected 1 Get call, got %d", store.getCalls)
	}
}

// Tests: EvaluateAll calls store.List
func TestEvaluator_EvaluateAll_CallsStore(t *testing.T) {
	store := NewMockStore()
	evaluator := NewEvaluator(store)

	_, err := evaluator.EvaluateAll(context.Background(), &EvaluationContext{})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if store.listCalls != 1 {
		t.Errorf("expected 1 List call, got %d", store.listCalls)
	}
}
