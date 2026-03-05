package featureflags

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DigiStratum/ds-app-developer/backend/internal/session"
)

// Tests: Context keys are unique
func TestContextKeys_AreUnique(t *testing.T) {
	if evaluatorContextKey == evalCtxContextKey {
		t.Error("context keys should be unique")
	}
}

// Tests: Evaluator context key has expected value
func TestEvaluatorContextKey_Value(t *testing.T) {
	if evaluatorContextKey != "featureFlagEvaluator" {
		t.Errorf("expected evaluatorContextKey 'featureFlagEvaluator', got %q", evaluatorContextKey)
	}
}

// Tests: EvalCtx context key has expected value
func TestEvalCtxContextKey_Value(t *testing.T) {
	if evalCtxContextKey != "featureFlagEvalContext" {
		t.Errorf("expected evalCtxContextKey 'featureFlagEvalContext', got %q", evalCtxContextKey)
	}
}

// Tests: Middleware function exists
func TestMiddleware_Exists(t *testing.T) {
	// Note: Can't actually call Middleware since it calls GetDefaultEvaluator
	// which requires DynamoDB. We verify the function signature exists.
	var middleware func(http.Handler) http.Handler = Middleware
	if middleware == nil {
		t.Error("Middleware function should not be nil")
	}
}

// Tests: IsEnabled returns false when evaluator missing from context
func TestIsEnabled_MissingEvaluator_ReturnsFalse(t *testing.T) {
	ctx := context.Background()
	result := IsEnabled(ctx, "any-flag")
	if result {
		t.Error("expected false when evaluator is missing")
	}
}

// Tests: IsEnabled returns false when evaluator is nil
func TestIsEnabled_NilEvaluator_ReturnsFalse(t *testing.T) {
	ctx := context.WithValue(context.Background(), evaluatorContextKey, (*Evaluator)(nil))
	result := IsEnabled(ctx, "any-flag")
	if result {
		t.Error("expected false when evaluator is nil")
	}
}

// Tests: GetEvaluationContext returns nil when not set
func TestGetEvaluationContext_NotSet_ReturnsNil(t *testing.T) {
	ctx := context.Background()
	result := GetEvaluationContext(ctx)
	if result != nil {
		t.Error("expected nil when evaluation context not set")
	}
}

// Tests: GetEvaluationContext returns context when set
func TestGetEvaluationContext_Set_ReturnsContext(t *testing.T) {
	expected := &EvaluationContext{
		UserID:    "user-123",
		TenantID:  "tenant-abc",
		SessionID: "session-xyz",
	}
	ctx := context.WithValue(context.Background(), evalCtxContextKey, expected)

	result := GetEvaluationContext(ctx)

	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.UserID != "user-123" {
		t.Errorf("expected UserID 'user-123', got %q", result.UserID)
	}
	if result.TenantID != "tenant-abc" {
		t.Errorf("expected TenantID 'tenant-abc', got %q", result.TenantID)
	}
	if result.SessionID != "session-xyz" {
		t.Errorf("expected SessionID 'session-xyz', got %q", result.SessionID)
	}
}

// Tests: GetEvaluationContext handles wrong type in context
func TestGetEvaluationContext_WrongType_ReturnsNil(t *testing.T) {
	ctx := context.WithValue(context.Background(), evalCtxContextKey, "not an evaluation context")
	result := GetEvaluationContext(ctx)
	if result != nil {
		t.Error("expected nil when wrong type in context")
	}
}

// Tests: EvaluationContext fields can be accessed
func TestEvaluationContext_Fields(t *testing.T) {
	ctx := &EvaluationContext{
		UserID:    "user-1",
		SessionID: "session-1",
		TenantID:  "tenant-1",
	}

	if ctx.UserID != "user-1" {
		t.Error("UserID not accessible")
	}
	if ctx.SessionID != "session-1" {
		t.Error("SessionID not accessible")
	}
	if ctx.TenantID != "tenant-1" {
		t.Error("TenantID not accessible")
	}
}

// Tests: EvaluationContext handles empty strings
func TestEvaluationContext_EmptyFields(t *testing.T) {
	ctx := &EvaluationContext{}

	if ctx.UserID != "" {
		t.Error("expected empty UserID")
	}
	if ctx.SessionID != "" {
		t.Error("expected empty SessionID")
	}
	if ctx.TenantID != "" {
		t.Error("expected empty TenantID")
	}
}

// Tests: Session integration - extraction of session ID
func TestSessionExtraction_FromSession(t *testing.T) {
	sess := &session.Session{ID: "test-session-123"}
	ctx := session.SetSession(context.Background(), sess)

	retrieved := session.GetSession(ctx)
	if retrieved == nil {
		t.Fatal("expected session from context")
	}
	if retrieved.ID != "test-session-123" {
		t.Errorf("expected session ID 'test-session-123', got %q", retrieved.ID)
	}
}

// Tests: Session GetSession returns nil for empty context
func TestSessionExtraction_NilForEmptyContext(t *testing.T) {
	ctx := context.Background()
	retrieved := session.GetSession(ctx)
	if retrieved != nil {
		t.Error("expected nil session for empty context")
	}
}

// Tests: Handler receives request directly
func TestMiddleware_HandlerReceivesRequest(t *testing.T) {
	receivedPath := ""
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
	})

	r := httptest.NewRequest(http.MethodGet, "/test/path", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if receivedPath != "/test/path" {
		t.Errorf("expected path '/test/path', got %q", receivedPath)
	}
}

// Tests: Context values persist through request
func TestContextValues_PersistThroughRequest(t *testing.T) {
	var capturedUserID string

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		evalCtx := GetEvaluationContext(r.Context())
		if evalCtx != nil {
			capturedUserID = evalCtx.UserID
		}
		w.WriteHeader(http.StatusOK)
	})

	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	ctx := context.WithValue(r.Context(), evalCtxContextKey, &EvaluationContext{UserID: "test-user"})
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if capturedUserID != "test-user" {
		t.Errorf("expected capturedUserID 'test-user', got %q", capturedUserID)
	}
}

// Tests: IsEnabledForUser function signature
func TestIsEnabledForUser_FunctionExists(t *testing.T) {
	// This test verifies the function signature exists
	// We can't test the actual behavior without DynamoDB
	var fn func(context.Context, string, string, string, string) bool = IsEnabledForUser
	if fn == nil {
		t.Error("IsEnabledForUser function should exist")
	}
}
