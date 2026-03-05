// Package sessionproxy provides a reverse proxy for app-scoped session data.
// It forwards requests to DSAccount's session data API, injecting app credentials.
package sessionproxy

import (
	"io"
	"log/slog"
	"net/http"
	"strings"
)

const (
	// DefaultDSAccountURL is the production DSAccount base URL.
	DefaultDSAccountURL = "https://account.digistratum.com"

	// Header names for app identification.
	HeaderAppID     = "X-DS-App-ID"
	HeaderAppSecret = "X-DS-App-Secret"

	// Cookie name for session.
	SessionCookieName = "ds_session"
)

// Config holds the proxy configuration.
type Config struct {
	// AppID is the application identifier (required).
	AppID string

	// AppSecret is the application secret for authentication (required).
	AppSecret string

	// DSAccountURL is the base URL for DSAccount. Defaults to production.
	DSAccountURL string

	// StripPrefix is the path prefix to strip before forwarding.
	// For example, if mounted at /api/session and StripPrefix is "/api/session",
	// a request to /api/session/data will be forwarded as /api/session/data.
	StripPrefix string

	// Logger for proxy operations. Uses slog.Default() if nil.
	Logger *slog.Logger
}

// Proxy is a reverse proxy that forwards session data requests to DSAccount.
type Proxy struct {
	config Config
	client *http.Client
	logger *slog.Logger
}

// New creates a new SessionDataProxy with the given configuration.
// Panics if AppID or AppSecret is empty.
func New(cfg Config) *Proxy {
	if cfg.AppID == "" {
		panic("sessionproxy: AppID is required")
	}
	if cfg.AppSecret == "" {
		panic("sessionproxy: AppSecret is required")
	}
	if cfg.DSAccountURL == "" {
		cfg.DSAccountURL = DefaultDSAccountURL
	}
	cfg.DSAccountURL = strings.TrimSuffix(cfg.DSAccountURL, "/")

	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}

	return &Proxy{
		config: cfg,
		client: &http.Client{},
		logger: logger,
	}
}

// NewSimple creates a proxy with minimal configuration.
// Equivalent to New(Config{AppID: appID, AppSecret: appSecret}).
func NewSimple(appID, appSecret string) *Proxy {
	return New(Config{
		AppID:     appID,
		AppSecret: appSecret,
	})
}

// ServeHTTP implements http.Handler.
// It proxies requests to DSAccount's session data API.
func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Build target URL
	targetPath := r.URL.Path
	if p.config.StripPrefix != "" {
		targetPath = strings.TrimPrefix(targetPath, p.config.StripPrefix)
	}
	// Ensure path starts with /api/session/data
	if !strings.HasPrefix(targetPath, "/api/session/data") {
		targetPath = "/api/session/data" + targetPath
	}

	targetURL := p.config.DSAccountURL + targetPath
	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}

	// Create proxy request
	proxyReq, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, r.Body)
	if err != nil {
		p.logger.Error("failed to create proxy request",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
		)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Copy relevant headers from original request
	copyHeaders(r.Header, proxyReq.Header, []string{
		"Content-Type",
		"Content-Length",
		"Accept",
		"Accept-Encoding",
		"X-Correlation-ID",
	})

	// Inject app credentials
	proxyReq.Header.Set(HeaderAppID, p.config.AppID)
	proxyReq.Header.Set(HeaderAppSecret, p.config.AppSecret)

	// Forward ds_session cookie
	if cookie, err := r.Cookie(SessionCookieName); err == nil {
		proxyReq.AddCookie(cookie)
	}

	p.logger.Debug("proxying session data request",
		"method", r.Method,
		"original_path", r.URL.Path,
		"target_url", targetURL,
		"app_id", p.config.AppID,
	)

	// Execute request
	resp, err := p.client.Do(proxyReq)
	if err != nil {
		p.logger.Error("proxy request failed",
			"error", err,
			"target_url", targetURL,
		)
		http.Error(w, "Bad Gateway", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	copyHeaders(resp.Header, w.Header(), []string{
		"Content-Type",
		"Content-Length",
		"X-Correlation-ID",
		"Cache-Control",
	})

	// Write status and body
	w.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(w, resp.Body); err != nil {
		p.logger.Error("failed to write response body",
			"error", err,
		)
	}
}

// copyHeaders copies specified headers from src to dst.
func copyHeaders(src, dst http.Header, keys []string) {
	for _, key := range keys {
		if val := src.Get(key); val != "" {
			dst.Set(key, val)
		}
	}
}
