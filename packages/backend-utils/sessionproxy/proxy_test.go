package sessionproxy

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNew_RequiresAppID(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Error("expected panic for missing AppID")
		}
	}()
	New(Config{AppSecret: "secret"})
}

func TestNew_RequiresAppSecret(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Error("expected panic for missing AppSecret")
		}
	}()
	New(Config{AppID: "app-id"})
}

func TestNewSimple(t *testing.T) {
	p := NewSimple("test-app", "test-secret")
	if p.config.AppID != "test-app" {
		t.Errorf("expected AppID 'test-app', got %q", p.config.AppID)
	}
	if p.config.DSAccountURL != DefaultDSAccountURL {
		t.Errorf("expected default URL, got %q", p.config.DSAccountURL)
	}
}

func TestProxy_InjectsHeaders(t *testing.T) {
	var receivedReq *http.Request

	// Mock DSAccount server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedReq = r
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"key":"value"}`))
	}))
	defer mockServer.Close()

	proxy := New(Config{
		AppID:        "ds-developer",
		AppSecret:    "secret123",
		DSAccountURL: mockServer.URL,
	})

	// Create request with session cookie
	req := httptest.NewRequest(http.MethodGet, "/api/session/data", nil)
	req.AddCookie(&http.Cookie{Name: SessionCookieName, Value: "session-token-123"})
	req.Header.Set("X-Correlation-ID", "corr-123")

	rec := httptest.NewRecorder()
	proxy.ServeHTTP(rec, req)

	// Verify injected headers
	if receivedReq.Header.Get(HeaderAppID) != "ds-developer" {
		t.Errorf("expected X-DS-App-ID header, got %q", receivedReq.Header.Get(HeaderAppID))
	}
	if receivedReq.Header.Get(HeaderAppSecret) != "secret123" {
		t.Errorf("expected X-DS-App-Secret header, got %q", receivedReq.Header.Get(HeaderAppSecret))
	}

	// Verify cookie forwarded
	cookie, err := receivedReq.Cookie(SessionCookieName)
	if err != nil || cookie.Value != "session-token-123" {
		t.Errorf("expected ds_session cookie to be forwarded")
	}

	// Verify correlation ID forwarded
	if receivedReq.Header.Get("X-Correlation-ID") != "corr-123" {
		t.Errorf("expected X-Correlation-ID to be forwarded")
	}

	// Verify response
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
	if rec.Body.String() != `{"key":"value"}` {
		t.Errorf("unexpected response body: %s", rec.Body.String())
	}
}

func TestProxy_StripPrefix(t *testing.T) {
	var receivedPath string

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
	}))
	defer mockServer.Close()

	proxy := New(Config{
		AppID:        "test-app",
		AppSecret:    "secret",
		DSAccountURL: mockServer.URL,
		StripPrefix:  "/session-proxy",
	})

	req := httptest.NewRequest(http.MethodGet, "/session-proxy/some/key", nil)
	rec := httptest.NewRecorder()
	proxy.ServeHTTP(rec, req)

	// Should strip prefix and ensure /api/session/data prefix
	expected := "/api/session/data/some/key"
	if receivedPath != expected {
		t.Errorf("expected path %q, got %q", expected, receivedPath)
	}
}

func TestProxy_POST_WithBody(t *testing.T) {
	var receivedBody string

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		receivedBody = string(body)
		w.WriteHeader(http.StatusOK)
	}))
	defer mockServer.Close()

	proxy := New(Config{
		AppID:        "test-app",
		AppSecret:    "secret",
		DSAccountURL: mockServer.URL,
	})

	body := `{"data":"test value"}`
	req := httptest.NewRequest(http.MethodPut, "/api/session/data", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	proxy.ServeHTTP(rec, req)

	if receivedBody != body {
		t.Errorf("expected body %q, got %q", body, receivedBody)
	}
}

func TestProxy_QueryParams(t *testing.T) {
	var receivedQuery string

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedQuery = r.URL.RawQuery
		w.WriteHeader(http.StatusOK)
	}))
	defer mockServer.Close()

	proxy := New(Config{
		AppID:        "test-app",
		AppSecret:    "secret",
		DSAccountURL: mockServer.URL,
	})

	req := httptest.NewRequest(http.MethodGet, "/api/session/data?key=foo&expand=true", nil)
	rec := httptest.NewRecorder()
	proxy.ServeHTTP(rec, req)

	if receivedQuery != "key=foo&expand=true" {
		t.Errorf("expected query params, got %q", receivedQuery)
	}
}

func TestProxy_ErrorResponse(t *testing.T) {
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"invalid app credentials"}`))
	}))
	defer mockServer.Close()

	proxy := New(Config{
		AppID:        "test-app",
		AppSecret:    "wrong-secret",
		DSAccountURL: mockServer.URL,
	})

	req := httptest.NewRequest(http.MethodGet, "/api/session/data", nil)
	rec := httptest.NewRecorder()
	proxy.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", rec.Code)
	}
}
