package middleware

import (
	"net/http"
	"os"
)

// APIKeyAuth validates requests using X-API-Key header.
// Used for Admin API endpoints (service-to-service, agent automation).
//
// Configuration:
//   - API_KEY env var: expected key value
//   - Or use Secrets Manager for production
//
// Usage:
//   router.Handle("/api/admin/items", APIKeyAuth(adminHandler.ListItems))
func APIKeyAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("X-API-Key")
		expectedKey := os.Getenv("API_KEY")

		if expectedKey == "" {
			http.Error(w, "API key not configured", http.StatusInternalServerError)
			return
		}

		if apiKey == "" || apiKey != expectedKey {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}
