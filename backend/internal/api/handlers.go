package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/DigiStratum/ds-app-skeleton/backend/internal/auth"
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

// WriteError writes a standard error response
func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, ErrorResponse{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
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
		WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "No authenticated user")
		return
	}

	slog.Info("user info requested", "user_id", user.ID)
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
