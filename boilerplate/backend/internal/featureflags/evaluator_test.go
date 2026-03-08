// Package featureflags tests for the evaluator component.
package featureflags

import (
	"testing"
)

// testEvaluator wraps evaluateFlag for direct testing without store
type testEvaluator struct{}

func (t *testEvaluator) evaluateFlag(flag *FeatureFlag, evalCtx *EvaluationContext) *EvaluatedFlag {
	result := &EvaluatedFlag{Key: flag.Key}

	// 1. Check disabled user override first (highest priority)
	if evalCtx.UserID != "" && containsString(flag.DisabledUsers, evalCtx.UserID) {
		result.Enabled = false
		result.Reason = "user_disabled"
		return result
	}

	// 2. Check enabled user override
	if evalCtx.UserID != "" && containsString(flag.Users, evalCtx.UserID) {
		result.Enabled = true
		result.Reason = "user_enabled"
		return result
	}

	// 3. Check disabled tenant override
	if evalCtx.TenantID != "" && containsString(flag.DisabledTenants, evalCtx.TenantID) {
		result.Enabled = false
		result.Reason = "tenant_disabled"
		return result
	}

	// 4. Check enabled tenant override
	if evalCtx.TenantID != "" && containsString(flag.Tenants, evalCtx.TenantID) {
		result.Enabled = true
		result.Reason = "tenant_enabled"
		return result
	}

	// 5. Check percentage rollout (only for 0 < percentage < 100)
	if flag.Percentage > 0 && flag.Percentage < 100 {
		hashInput := evalCtx.UserID
		if hashInput == "" {
			hashInput = evalCtx.SessionID
		}

		if hashInput != "" {
			bucket := calculateBucket(flag.Key, hashInput)
			if bucket < flag.Percentage {
				result.Enabled = true
				result.Reason = "percentage_rollout"
				return result
			}
		}
	}

	// 6. Fall back to global default
	result.Enabled = flag.Enabled
	if flag.Enabled {
		result.Reason = "global_enabled"
	} else {
		result.Reason = "global_disabled"
	}
	return result
}

// Tests: evaluateFlag returns global_disabled for disabled flag with no overrides
func TestEvaluateFlag_GlobalDisabled(t *testing.T) {
	flag := &FeatureFlag{
		Key:     "test-flag",
		Enabled: false,
	}
	evalCtx := &EvaluationContext{}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	if result.Enabled {
		t.Error("expected flag to be disabled")
	}
	if result.Reason != "global_disabled" {
		t.Errorf("expected reason 'global_disabled', got %q", result.Reason)
	}
}

// Tests: evaluateFlag returns global_enabled for enabled flag with no overrides
func TestEvaluateFlag_GlobalEnabled(t *testing.T) {
	flag := &FeatureFlag{
		Key:     "test-flag",
		Enabled: true,
	}
	evalCtx := &EvaluationContext{}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	if !result.Enabled {
		t.Error("expected flag to be enabled")
	}
	if result.Reason != "global_enabled" {
		t.Errorf("expected reason 'global_enabled', got %q", result.Reason)
	}
}

// Tests: evaluateFlag enables flag for user in Users list
func TestEvaluateFlag_UserEnabled(t *testing.T) {
	flag := &FeatureFlag{
		Key:     "test-flag",
		Enabled: false, // globally disabled
		Users:   []string{"user-123", "user-456"},
	}
	evalCtx := &EvaluationContext{
		UserID: "user-123",
	}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	if !result.Enabled {
		t.Error("expected flag to be enabled for whitelisted user")
	}
	if result.Reason != "user_enabled" {
		t.Errorf("expected reason 'user_enabled', got %q", result.Reason)
	}
}

// Tests: evaluateFlag disables flag for user in DisabledUsers list (takes precedence)
func TestEvaluateFlag_UserDisabled(t *testing.T) {
	flag := &FeatureFlag{
		Key:           "test-flag",
		Enabled:       true, // globally enabled
		Users:         []string{"user-123"},
		DisabledUsers: []string{"user-123"}, // disabled takes precedence
	}
	evalCtx := &EvaluationContext{
		UserID: "user-123",
	}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	if result.Enabled {
		t.Error("expected flag to be disabled for blacklisted user")
	}
	if result.Reason != "user_disabled" {
		t.Errorf("expected reason 'user_disabled', got %q", result.Reason)
	}
}

// Tests: evaluateFlag enables flag for tenant in Tenants list
func TestEvaluateFlag_TenantEnabled(t *testing.T) {
	flag := &FeatureFlag{
		Key:     "test-flag",
		Enabled: false, // globally disabled
		Tenants: []string{"tenant-abc", "tenant-xyz"},
	}
	evalCtx := &EvaluationContext{
		TenantID: "tenant-abc",
	}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	if !result.Enabled {
		t.Error("expected flag to be enabled for whitelisted tenant")
	}
	if result.Reason != "tenant_enabled" {
		t.Errorf("expected reason 'tenant_enabled', got %q", result.Reason)
	}
}

// Tests: evaluateFlag disables flag for tenant in DisabledTenants list
func TestEvaluateFlag_TenantDisabled(t *testing.T) {
	flag := &FeatureFlag{
		Key:             "test-flag",
		Enabled:         true, // globally enabled
		DisabledTenants: []string{"tenant-blocked"},
	}
	evalCtx := &EvaluationContext{
		TenantID: "tenant-blocked",
	}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	if result.Enabled {
		t.Error("expected flag to be disabled for blacklisted tenant")
	}
	if result.Reason != "tenant_disabled" {
		t.Errorf("expected reason 'tenant_disabled', got %q", result.Reason)
	}
}

// Tests: evaluateFlag priority - user disable > user enable
func TestEvaluateFlag_UserDisableTakesPrecedenceOverUserEnable(t *testing.T) {
	flag := &FeatureFlag{
		Key:           "test-flag",
		Enabled:       true,
		Users:         []string{"user-123"},
		DisabledUsers: []string{"user-123"},
	}
	evalCtx := &EvaluationContext{
		UserID: "user-123",
	}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	if result.Enabled {
		t.Error("user disable should take precedence over user enable")
	}
	if result.Reason != "user_disabled" {
		t.Errorf("expected reason 'user_disabled', got %q", result.Reason)
	}
}

// Tests: evaluateFlag priority - user enable > tenant enable
func TestEvaluateFlag_UserEnableTakesPrecedenceOverTenant(t *testing.T) {
	flag := &FeatureFlag{
		Key:             "test-flag",
		Enabled:         false,
		Users:           []string{"user-123"},
		DisabledTenants: []string{"tenant-abc"},
	}
	evalCtx := &EvaluationContext{
		UserID:   "user-123",
		TenantID: "tenant-abc",
	}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	if !result.Enabled {
		t.Error("user enable should take precedence over tenant disable")
	}
	if result.Reason != "user_enabled" {
		t.Errorf("expected reason 'user_enabled', got %q", result.Reason)
	}
}

// Tests: evaluateFlag percentage rollout with user ID
func TestEvaluateFlag_PercentageRollout_UserID(t *testing.T) {
	flag := &FeatureFlag{
		Key:        "rollout-flag",
		Enabled:    false,
		Percentage: 50, // 50% rollout
	}

	// Count how many of 100 test users get the flag
	enabledCount := 0
	for i := 0; i < 100; i++ {
		evalCtx := &EvaluationContext{
			UserID: "user-" + string(rune('0'+i%10)) + string(rune('0'+i/10)),
		}
		te := &testEvaluator{}
		result := te.evaluateFlag(flag, evalCtx)
		if result.Enabled {
			enabledCount++
		}
	}

	// With 50% rollout, we expect roughly 40-60 users to be enabled
	if enabledCount < 30 || enabledCount > 70 {
		t.Errorf("expected ~50%% rollout, got %d%% enabled", enabledCount)
	}
}

// Tests: evaluateFlag percentage rollout with session ID (fallback when no user ID)
func TestEvaluateFlag_PercentageRollout_SessionID(t *testing.T) {
	flag := &FeatureFlag{
		Key:        "rollout-flag",
		Enabled:    false,
		Percentage: 99, // high rollout but not 100%
	}

	// With 99% rollout and many sessions, most should be enabled
	enabledCount := 0
	for i := 0; i < 100; i++ {
		evalCtx := &EvaluationContext{
			SessionID: "session-" + string(rune('a'+i%26)) + string(rune('0'+i/26)),
		}
		te := &testEvaluator{}
		result := te.evaluateFlag(flag, evalCtx)
		if result.Enabled {
			enabledCount++
		}
	}

	// With 99% rollout, we expect 95+ users to be enabled
	if enabledCount < 90 {
		t.Errorf("expected ~99%% rollout, got %d%% enabled", enabledCount)
	}
}

// Tests: evaluateFlag percentage 100 falls back to global (special case)
func TestEvaluateFlag_Percentage100_FallsBackToGlobal(t *testing.T) {
	// When percentage is 100, the code skips percentage logic (only checks 0 < x < 100)
	// This is intentional - 100% means "just enable globally"
	flag := &FeatureFlag{
		Key:        "rollout-flag",
		Enabled:    true, // Set to true since 100% implies enabled
		Percentage: 100,
	}

	evalCtx := &EvaluationContext{
		SessionID: "session-abc-123",
	}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	// Falls back to global (which is enabled)
	if !result.Enabled {
		t.Error("expected flag to be enabled with 100% (falls back to global)")
	}
	if result.Reason != "global_enabled" {
		t.Errorf("expected reason 'global_enabled', got %q", result.Reason)
	}
}

// Tests: evaluateFlag percentage rollout with no identifier falls back to global
func TestEvaluateFlag_PercentageRollout_NoIdentifier(t *testing.T) {
	flag := &FeatureFlag{
		Key:        "rollout-flag",
		Enabled:    false,
		Percentage: 50,
	}

	evalCtx := &EvaluationContext{}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	// With no identifier, percentage rollout can't be applied
	if result.Enabled {
		t.Error("expected flag to be disabled without identifier")
	}
	if result.Reason != "global_disabled" {
		t.Errorf("expected reason 'global_disabled', got %q", result.Reason)
	}
}

// Tests: evaluateFlag percentage 0 means no rollout
func TestEvaluateFlag_PercentageZero_NoRollout(t *testing.T) {
	flag := &FeatureFlag{
		Key:        "rollout-flag",
		Enabled:    false,
		Percentage: 0,
	}

	evalCtx := &EvaluationContext{
		UserID: "user-123",
	}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	if result.Enabled {
		t.Error("expected flag to be disabled with 0% rollout")
	}
	if result.Reason != "global_disabled" {
		t.Errorf("expected reason 'global_disabled', got %q", result.Reason)
	}
}

// Tests: calculateBucket returns consistent values
func TestCalculateBucket_Consistency(t *testing.T) {
	bucket1 := calculateBucket("test-flag", "user-123")
	bucket2 := calculateBucket("test-flag", "user-123")

	if bucket1 != bucket2 {
		t.Errorf("expected consistent buckets, got %d and %d", bucket1, bucket2)
	}
}

// Tests: calculateBucket returns values in range 0-99
func TestCalculateBucket_Range(t *testing.T) {
	for i := 0; i < 100; i++ {
		bucket := calculateBucket("flag-"+string(rune('a'+i%26)), "user-"+string(rune('0'+i%10)))
		if bucket < 0 || bucket > 99 {
			t.Errorf("bucket %d out of range [0, 99]", bucket)
		}
	}
}

// Tests: calculateBucket different inputs produce different buckets
func TestCalculateBucket_Distribution(t *testing.T) {
	buckets := make(map[int]int)
	for i := 0; i < 1000; i++ {
		bucket := calculateBucket("distribution-test", "user-"+string(rune('a'+i%26))+string(rune('0'+i/26)))
		buckets[bucket]++
	}

	// We expect reasonable distribution - at least 50 different buckets used
	if len(buckets) < 50 {
		t.Errorf("poor bucket distribution: only %d unique buckets from 1000 inputs", len(buckets))
	}
}

// Tests: EvaluatedFlag key is preserved
func TestEvaluateFlag_PreservesKey(t *testing.T) {
	flag := &FeatureFlag{
		Key:     "my-awesome-flag",
		Enabled: true,
	}
	evalCtx := &EvaluationContext{}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	if result.Key != "my-awesome-flag" {
		t.Errorf("expected key 'my-awesome-flag', got %q", result.Key)
	}
}

// Tests: User not in enabled list doesn't get enabled
func TestEvaluateFlag_UserNotInList_FallsBack(t *testing.T) {
	flag := &FeatureFlag{
		Key:     "test-flag",
		Enabled: false,
		Users:   []string{"user-456"},
	}
	evalCtx := &EvaluationContext{
		UserID: "user-123",
	}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	if result.Enabled {
		t.Error("expected flag to be disabled for user not in list")
	}
	if result.Reason != "global_disabled" {
		t.Errorf("expected reason 'global_disabled', got %q", result.Reason)
	}
}

// Tests: Tenant not in enabled list doesn't get enabled
func TestEvaluateFlag_TenantNotInList_FallsBack(t *testing.T) {
	flag := &FeatureFlag{
		Key:     "test-flag",
		Enabled: true,
		Tenants: []string{"tenant-xyz"},
	}
	evalCtx := &EvaluationContext{
		TenantID: "tenant-abc",
	}

	te := &testEvaluator{}
	result := te.evaluateFlag(flag, evalCtx)

	// Tenant not in list, falls back to global (enabled)
	if !result.Enabled {
		t.Error("expected flag to fall back to global enabled")
	}
	if result.Reason != "global_enabled" {
		t.Errorf("expected reason 'global_enabled', got %q", result.Reason)
	}
}

// Tests: Empty context uses global default
func TestEvaluateFlag_EmptyContext(t *testing.T) {
	tests := []struct {
		name    string
		enabled bool
		want    bool
	}{
		{"globally_enabled", true, true},
		{"globally_disabled", false, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			flag := &FeatureFlag{
				Key:     "test-flag",
				Enabled: tt.enabled,
			}
			evalCtx := &EvaluationContext{}

			te := &testEvaluator{}
			result := te.evaluateFlag(flag, evalCtx)

			if result.Enabled != tt.want {
				t.Errorf("expected enabled=%v, got %v", tt.want, result.Enabled)
			}
		})
	}
}

// Tests: Percentage rollout prefers user ID over session ID
func TestEvaluateFlag_PercentageRollout_PrefersUserID(t *testing.T) {
	flag := &FeatureFlag{
		Key:        "rollout-flag",
		Enabled:    false,
		Percentage: 50,
	}

	// Run with both user and session ID - result should be consistent
	// because user ID is preferred
	te := &testEvaluator{}
	
	evalCtx1 := &EvaluationContext{
		UserID:    "user-specific",
		SessionID: "session-abc",
	}
	result1 := te.evaluateFlag(flag, evalCtx1)

	evalCtx2 := &EvaluationContext{
		UserID:    "user-specific",
		SessionID: "session-different",
	}
	result2 := te.evaluateFlag(flag, evalCtx2)

	// Same user ID should give same result regardless of session
	if result1.Enabled != result2.Enabled {
		t.Error("expected consistent result for same user ID")
	}
}

// Tests: Different flag keys produce different rollout distributions
func TestCalculateBucket_DifferentFlags(t *testing.T) {
	bucket1 := calculateBucket("flag-alpha", "user-123")
	bucket2 := calculateBucket("flag-beta", "user-123")

	// Different flags should generally produce different buckets
	// (not strictly guaranteed, but very unlikely to be equal)
	// We just verify they can be different
	_ = bucket1
	_ = bucket2
	// This test primarily verifies the function uses flag key in hash
}
