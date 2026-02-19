package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/DigiStratum/ds-app-skeleton/backend/internal/auth"
	"github.com/DigiStratum/ds-app-skeleton/backend/internal/middleware"
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

// GetCurrentUserHandler returns the authenticated user [FR-AUTH-003]
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
		"tenant_id": tenantID,
		"is_personal": tenantID == "",
	})
}
