package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/DigiStratum/ds-app-skeleton/backend/internal/auth"
	"github.com/DigiStratum/ds-app-skeleton/backend/internal/middleware"
	"github.com/DigiStratum/ds-app-skeleton/backend/internal/session"
)

// Standard error response format [NFR-SEC-004]
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code      string            `json:"code"`
	Message   string            `json:"message"`
	Details   map[string]string `json:"details,omitempty"`
	RequestID string            `json:"request_id,omitempty"`
}

// SessionResponse represents the session state for the frontend
type SessionResponse struct {
	SessionID       string `json:"session_id"`
	IsAuthenticated bool   `json:"is_authenticated"`
	IsGuest         bool   `json:"is_guest"`
	TenantID        string `json:"tenant_id,omitempty"`
	User            *auth.User `json:"user,omitempty"`
}

// WriteJSON writes a JSON response with the given status code
func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// WriteError writes a standard error response with correlation ID
func WriteError(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	correlationID := middleware.GetCorrelationID(r.Context())
	WriteJSON(w, status, ErrorResponse{
		Error: ErrorDetail{
			Code:      code,
			Message:   message,
			RequestID: correlationID,
		},
	})
}

// HealthHandler returns service health status [NFR-AVAIL-003]
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"version":   "1.0.0",
	})
}

// GetSessionHandler returns the current session state (works for both guest and authenticated)
// This is the primary endpoint for the frontend to check session status.
func GetSessionHandler(w http.ResponseWriter, r *http.Request) {
	sess := session.GetSession(r.Context())
	user := auth.GetUser(r.Context())

	if sess == nil {
		// This shouldn't happen if session middleware is working correctly
		WriteError(w, r, http.StatusInternalServerError, "NO_SESSION", "No session available")
		return
	}

	response := SessionResponse{
		SessionID:       sess.ID[:8] + "...", // Truncate for security
		IsAuthenticated: sess.IsAuthenticated(),
		IsGuest:         sess.IsGuest,
		TenantID:        sess.TenantID,
		User:            user,
	}

	logger := middleware.LoggerWithCorrelation(r.Context())
	logger.Info("session info requested",
		"authenticated", response.IsAuthenticated,
		"tenant_id", response.TenantID,
	)

	WriteJSON(w, http.StatusOK, response)
}

// GetCurrentUserHandler returns the authenticated user [FR-AUTH-003]
// Requires authentication (returns 401 for guest sessions)
func GetCurrentUserHandler(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUser(r.Context())
	if user == nil {
		WriteError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "No authenticated user")
		return
	}

	logger := middleware.LoggerWithCorrelation(r.Context())
	logger.Info("user info requested", "user_id", user.ID)
	WriteJSON(w, http.StatusOK, user)
}

// GetCurrentTenantHandler returns the current tenant context [FR-TENANT-001]
func GetCurrentTenantHandler(w http.ResponseWriter, r *http.Request) {
	tenantID := auth.GetTenantID(r.Context())

	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"tenant_id":   tenantID,
		"is_personal": tenantID == "",
	})
}
