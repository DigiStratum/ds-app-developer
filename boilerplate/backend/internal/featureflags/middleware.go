package featureflags

import (
	"context"
	"net/http"

	"github.com/DigiStratum/ds-app-developer/backend/internal/auth"
	"github.com/DigiStratum/ds-app-developer/backend/internal/session"
)

type contextKey string

const (
	evaluatorContextKey contextKey = "featureFlagEvaluator"
	evalCtxContextKey   contextKey = "featureFlagEvalContext"
)

// Middleware injects the feature flag evaluator and evaluation context into the request context.
// This enables easy access to feature flags via IsEnabled(ctx, "flag-key").
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Build evaluation context from request
		evalCtx := &EvaluationContext{}

		// Get user ID if authenticated
		if user := auth.GetUser(ctx); user != nil {
			evalCtx.UserID = user.ID
		}

		// Get session ID
		if sess := session.GetSession(ctx); sess != nil {
			evalCtx.SessionID = sess.ID
		}

		// Get tenant ID
		evalCtx.TenantID = auth.GetTenantID(ctx)

		// Add evaluator and context to request
		evaluator := GetDefaultEvaluator()
		ctx = context.WithValue(ctx, evaluatorContextKey, evaluator)
		ctx = context.WithValue(ctx, evalCtxContextKey, evalCtx)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// IsEnabled is a helper to check if a feature flag is enabled for the current context.
// Use this in handlers for conditional feature logic:
//
//	if featureflags.IsEnabled(ctx, "new-feature") {
//	    // New code path
//	} else {
//	    // Old code path
//	}
func IsEnabled(ctx context.Context, flagKey string) bool {
	evaluator, ok := ctx.Value(evaluatorContextKey).(*Evaluator)
	if !ok || evaluator == nil {
		// Middleware not applied or evaluator missing - default to disabled
		return false
	}

	evalCtx, ok := ctx.Value(evalCtxContextKey).(*EvaluationContext)
	if !ok || evalCtx == nil {
		evalCtx = &EvaluationContext{}
	}

	result, err := evaluator.Evaluate(ctx, flagKey, evalCtx)
	if err != nil {
		// On error, default to disabled for safety
		return false
	}

	return result.Enabled
}

// IsEnabledForUser checks if a flag is enabled for a specific user/session context.
// Use this when you need to evaluate outside the request middleware chain.
func IsEnabledForUser(ctx context.Context, flagKey, userID, sessionID, tenantID string) bool {
	evaluator := GetDefaultEvaluator()
	evalCtx := &EvaluationContext{
		UserID:    userID,
		SessionID: sessionID,
		TenantID:  tenantID,
	}

	result, err := evaluator.Evaluate(ctx, flagKey, evalCtx)
	if err != nil {
		return false
	}

	return result.Enabled
}

// GetEvaluationContext retrieves the evaluation context from the request context.
// Useful for debugging or custom evaluation logic.
func GetEvaluationContext(ctx context.Context) *EvaluationContext {
	evalCtx, _ := ctx.Value(evalCtxContextKey).(*EvaluationContext)
	return evalCtx
}
