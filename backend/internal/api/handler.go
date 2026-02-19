package api

import (
	"encoding/json"
	"net/http"

	"github.com/digistratum/ds-app-skeleton/internal/auth"
	"github.com/digistratum/ds-app-skeleton/internal/repository"
	"github.com/digistratum/ds-app-skeleton/internal/sso"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// Config holds handler configuration
type Config struct {
	JWTSecret       string
	SessionTimeout  int // minutes
	SSODSAccountURL string
	SSOAppID        string
	SSOAppSecret    string
	SSORedirectURI  string
}

// Handler provides HTTP handlers for the API
type Handler struct {
	repo       repository.Repository
	sessions   *auth.SessionManager
	ssoClient  *sso.Client
	cfg        Config
}

// NewHandler creates a new API handler
func NewHandler(repo repository.Repository, cfg Config) *Handler {
	return &Handler{
		repo:     repo,
		sessions: auth.NewSessionManager(repo, []byte(cfg.JWTSecret), cfg.SessionTimeout),
		ssoClient: sso.NewClient(sso.Config{
			DSAccountURL: cfg.SSODSAccountURL,
			AppID:        cfg.SSOAppID,
			AppSecret:    cfg.SSOAppSecret,
			RedirectURI:  cfg.SSORedirectURI,
		}),
		cfg: cfg,
	}
}

// Router returns the HTTP router with all routes registered
func (h *Handler) Router() http.Handler {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(h.corsMiddleware)

	// Public routes
	r.Get("/api/health", h.health)
	r.Get("/api/auth/sso", h.ssoInitiate)
	r.Get("/api/auth/sso/callback", h.ssoCallback)
	r.Get("/api/auth/sso/status", h.ssoStatus)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(h.authMiddleware)
		
		r.Get("/api/auth/me", h.me)
		r.Post("/api/auth/logout", h.logout)
		r.Post("/api/auth/refresh", h.refreshSession)
		
		// Add your app-specific routes here
		// r.Get("/api/items", h.listItems)
		// r.Post("/api/items", h.createItem)
		// r.Get("/api/items/{id}", h.getItem)
		// r.Put("/api/items/{id}", h.updateItem)
		// r.Delete("/api/items/{id}", h.deleteItem)
	})

	return r
}

// CORS middleware
func (h *Handler) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Health check endpoint
func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	h.jsonResponse(w, http.StatusOK, map[string]string{
		"status":  "healthy",
		"service": "ds-app-skeleton",
	})
}

// SSO status endpoint
func (h *Handler) ssoStatus(w http.ResponseWriter, r *http.Request) {
	cfg := h.ssoClient.GetConfig()
	h.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"enabled":      h.ssoClient.Enabled(),
		"dsaccount_url": cfg.DSAccountURL,
		"app_id":       cfg.AppID,
		"redirect_uri": cfg.RedirectURI,
	})
}

// Helper to send JSON responses
func (h *Handler) jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Helper to send error responses
func (h *Handler) errorResponse(w http.ResponseWriter, status int, message string) {
	h.jsonResponse(w, status, map[string]string{"error": message})
}
