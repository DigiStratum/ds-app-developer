package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
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
	_ = json.NewEncoder(w).Encode(data)
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
// Calls DSAccount to validate sessions (DSAccount owns session storage).
func GetSessionHandler(w http.ResponseWriter, r *http.Request) {
	// Read ds_session cookie (contains JWT from SSO flow)
	cookie, err := r.Cookie("ds_session")
	if err != nil || cookie.Value == "" {
		// No session - return guest state
		slog.Debug("no ds_session cookie found")
		WriteJSON(w, http.StatusOK, SessionResponse{
			IsAuthenticated: false,
			IsGuest:         true,
		})
		return
	}

	// Call DSAccount to validate JWT and get user info
	// Use /api/sso/userinfo which validates JWT tokens (vs /api/auth/me which validates session tokens)
	dsAccountURL := os.Getenv("DSACCOUNT_SSO_URL")
	if dsAccountURL == "" {
		dsAccountURL = "https://account.digistratum.com"
	}

	req, _ := http.NewRequest("GET", dsAccountURL+"/api/sso/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+cookie.Value)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != 200 {
		// Session invalid or DSAccount unreachable - return guest state
		WriteJSON(w, http.StatusOK, SessionResponse{
			IsAuthenticated: false,
			IsGuest:         true,
		})
		return
	}
	defer func() { _ = resp.Body.Close() }()

	// Parse user from DSAccount response
	var user auth.User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		WriteJSON(w, http.StatusOK, SessionResponse{
			IsAuthenticated: false,
			IsGuest:         true,
		})
		return
	}

	// Return authenticated session
	WriteJSON(w, http.StatusOK, SessionResponse{
		SessionID:       cookie.Value[:8] + "...",
		IsAuthenticated: true,
		IsGuest:         false,
		User:            &user,
	})
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
