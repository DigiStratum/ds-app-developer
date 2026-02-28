package featureflags

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/DigiStratum/ds-app-developer/backend/internal/auth"
	"github.com/DigiStratum/ds-app-developer/backend/internal/middleware"
	"github.com/DigiStratum/ds-app-developer/backend/internal/session"
)

// ErrorResponse is a standard error response
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"request_id,omitempty"`
}

// EvaluateResponse contains evaluated flags for the frontend
type EvaluateResponse struct {
	Flags map[string]bool `json:"flags"`
}

// writeJSON writes a JSON response
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

// writeError writes an error response
func writeError(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	correlationID := middleware.GetCorrelationID(r.Context())
	writeJSON(w, status, ErrorResponse{
		Error: ErrorDetail{
			Code:      code,
			Message:   message,
			RequestID: correlationID,
		},
	})
}

// EvaluateHandler evaluates all flags for the current user context
// GET /api/flags/evaluate
// Returns: { "flags": { "flag-key": true, "other-flag": false } }
func EvaluateHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	evaluator := GetDefaultEvaluator()

	// Build evaluation context from request
	evalCtx := buildEvaluationContext(r)

	// Evaluate all flags
	results, err := evaluator.EvaluateAll(ctx, evalCtx)
	if err != nil {
		slog.Error("failed to evaluate flags", "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to evaluate flags")
		return
	}

	// Convert to simple map for frontend
	flags := make(map[string]bool, len(results))
	for _, result := range results {
		flags[result.Key] = result.Enabled
	}

	logger := middleware.LoggerWithCorrelation(ctx)
	logger.Debug("flags evaluated",
		"count", len(flags),
		"user_id", evalCtx.UserID,
		"tenant_id", evalCtx.TenantID,
	)

	writeJSON(w, http.StatusOK, EvaluateResponse{Flags: flags})
}

// ListHandler lists all feature flags (admin only)
// GET /api/flags
func ListHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Check admin permission
	if !isAdmin(r) {
		writeError(w, r, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	store := GetStore()
	flags, err := store.List(ctx)
	if err != nil {
		slog.Error("failed to list flags", "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list flags")
		return
	}

	writeJSON(w, http.StatusOK, flags)
}

// UpdateHandler updates a feature flag (admin only)
// PUT /api/flags/:key
func UpdateHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Check admin permission
	if !isAdmin(r) {
		writeError(w, r, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	// Extract flag key from path
	// Path format: /api/flags/my-flag-key
	path := strings.TrimPrefix(r.URL.Path, "/api/flags/")
	if path == "" || path == r.URL.Path {
		writeError(w, r, http.StatusBadRequest, "INVALID_KEY", "Flag key required")
		return
	}
	flagKey := path

	// Parse request body
	var update FlagUpdate
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		writeError(w, r, http.StatusBadRequest, "INVALID_BODY", "Invalid request body")
		return
	}

	store := GetStore()

	// Get existing flag or create new one
	flag, err := store.Get(ctx, flagKey)
	if err != nil {
		slog.Error("failed to get flag", "key", flagKey, "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get flag")
		return
	}

	if flag == nil {
		// Create new flag
		flag = NewFeatureFlag(flagKey, update.Description, update.Enabled)
	}

	// Apply updates
	if update.Description != "" {
		flag.Description = update.Description
	}
	flag.Enabled = update.Enabled
	if update.Tenants != nil {
		flag.Tenants = update.Tenants
	}
	if update.Users != nil {
		flag.Users = update.Users
	}
	if update.DisabledTenants != nil {
		flag.DisabledTenants = update.DisabledTenants
	}
	if update.DisabledUsers != nil {
		flag.DisabledUsers = update.DisabledUsers
	}
	if update.Percentage >= 0 && update.Percentage <= 100 {
		flag.Percentage = update.Percentage
	}
	flag.UpdatedAt = time.Now().UTC()

	// Save
	if err := store.Save(ctx, flag); err != nil {
		slog.Error("failed to save flag", "key", flagKey, "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save flag")
		return
	}

	logger := middleware.LoggerWithCorrelation(ctx)
	logger.Info("flag updated",
		"key", flagKey,
		"enabled", flag.Enabled,
		"percentage", flag.Percentage,
	)

	writeJSON(w, http.StatusOK, flag)
}

// FlagUpdate represents an update request for a feature flag
type FlagUpdate struct {
	Enabled         bool     `json:"enabled"`
	Description     string   `json:"description,omitempty"`
	Tenants         []string `json:"tenants,omitempty"`
	Users           []string `json:"users,omitempty"`
	DisabledTenants []string `json:"disabled_tenants,omitempty"`
	DisabledUsers   []string `json:"disabled_users,omitempty"`
	Percentage      int      `json:"percentage"`
}

// buildEvaluationContext creates an evaluation context from the request
func buildEvaluationContext(r *http.Request) *EvaluationContext {
	ctx := r.Context()

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

	return evalCtx
}

// isAdmin checks if the current user has admin privileges
// TODO: Implement proper admin check based on DSAccount roles
func isAdmin(r *http.Request) bool {
	user := auth.GetUser(r.Context())
	if user == nil {
		return false
	}

	// For now, check if user has a specific admin email or ID
	// This should be replaced with proper role-based access control
	adminEmails := []string{
		"admin@digistratum.com",
		"skelly@digistratum.com",
	}
	for _, email := range adminEmails {
		if user.Email == email {
			return true
		}
	}

	return false
}

// DeleteHandler deletes a feature flag (admin only)
// DELETE /api/flags/:key
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Check admin permission
	if !isAdmin(r) {
		writeError(w, r, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	// Extract flag key from path
	path := strings.TrimPrefix(r.URL.Path, "/api/flags/")
	if path == "" || path == r.URL.Path {
		writeError(w, r, http.StatusBadRequest, "INVALID_KEY", "Flag key required")
		return
	}
	flagKey := path

	store := GetStore()
	if err := store.Delete(ctx, flagKey); err != nil {
		slog.Error("failed to delete flag", "key", flagKey, "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete flag")
		return
	}

	logger := middleware.LoggerWithCorrelation(ctx)
	logger.Info("flag deleted", "key", flagKey)

	w.WriteHeader(http.StatusNoContent)
}
