// Package health provides health check handlers.
package health

import (
	"encoding/json"
	"net/http"
)

// Response represents a health check response.
type Response struct {
	Status  string            `json:"status"`
	Version string            `json:"version,omitempty"`
	Details map[string]string `json:"details,omitempty"`
}

// Handler returns a health check handler.
func Handler(version string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp := Response{
			Status:  "ok",
			Version: version,
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resp)
	}
}
