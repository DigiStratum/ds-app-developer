// Package api provides HTTP handlers for the {{APP_NAME}} API.
package api

import (
	"encoding/json"
	"net/http"
)

// ErrorResponse represents a standard API error response.
type ErrorResponse struct {
	Error struct {
		Code      string            `json:"code"`
		Message   string            `json:"message"`
		Details   map[string]string `json:"details,omitempty"`
		RequestID string            `json:"request_id,omitempty"`
	} `json:"error"`
}

// RespondError writes a standard error response.
func RespondError(w http.ResponseWriter, status int, code, message string) {
	resp := ErrorResponse{}
	resp.Error.Code = code
	resp.Error.Message = message

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

// RespondJSON writes a JSON response.
func RespondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
