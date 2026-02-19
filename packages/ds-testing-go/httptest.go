package dstesting

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestServer wraps httptest.Server with helper methods for integration tests
type TestServer struct {
	*httptest.Server
	t       *testing.T
	db      *TestDB
	headers map[string]string
}

// TestServerOption configures TestServer behavior
type TestServerOption func(*testServerConfig)

type testServerConfig struct {
	db            *TestDB
	defaultHeader map[string]string
}

// WithTestDB associates a test database with the server
func WithTestDB(db *TestDB) TestServerOption {
	return func(c *testServerConfig) {
		c.db = db
	}
}

// WithDefaultHeaders sets headers to include in all requests
func WithDefaultHeaders(headers map[string]string) TestServerOption {
	return func(c *testServerConfig) {
		c.defaultHeader = headers
	}
}

// NewTestServer creates a test server with the given handler
//
// Example:
//
//	func TestMyAPI(t *testing.T) {
//	    handler := createMyHandler()
//	    server := dstesting.NewTestServer(t, handler)
//
//	    resp := server.Get("/health")
//	    dstesting.AssertStatus(t, resp, http.StatusOK)
//	}
func NewTestServer(t *testing.T, handler http.Handler, opts ...TestServerOption) *TestServer {
	t.Helper()

	cfg := &testServerConfig{
		defaultHeader: make(map[string]string),
	}

	for _, opt := range opts {
		opt(cfg)
	}

	server := httptest.NewServer(handler)
	t.Cleanup(func() { server.Close() })

	return &TestServer{
		Server:  server,
		t:       t,
		db:      cfg.db,
		headers: cfg.defaultHeader,
	}
}

// DB returns the test database (if configured)
func (s *TestServer) DB() *TestDB {
	return s.db
}

// SetHeader sets a default header for all requests
func (s *TestServer) SetHeader(key, value string) {
	s.headers[key] = value
}

// Get performs a GET request and returns the response
func (s *TestServer) Get(path string, headers ...map[string]string) *http.Response {
	req := s.NewRequest(http.MethodGet, path)
	for _, h := range headers {
		for k, v := range h {
			req.Header.Set(k, v)
		}
	}
	return s.Do(req)
}

// Post performs a POST request with JSON body
func (s *TestServer) Post(path string, body interface{}, headers ...map[string]string) *http.Response {
	req := s.NewRequestWithJSON(http.MethodPost, path, body)
	for _, h := range headers {
		for k, v := range h {
			req.Header.Set(k, v)
		}
	}
	return s.Do(req)
}

// Put performs a PUT request with JSON body
func (s *TestServer) Put(path string, body interface{}, headers ...map[string]string) *http.Response {
	req := s.NewRequestWithJSON(http.MethodPut, path, body)
	for _, h := range headers {
		for k, v := range h {
			req.Header.Set(k, v)
		}
	}
	return s.Do(req)
}

// Patch performs a PATCH request with JSON body
func (s *TestServer) Patch(path string, body interface{}, headers ...map[string]string) *http.Response {
	req := s.NewRequestWithJSON(http.MethodPatch, path, body)
	for _, h := range headers {
		for k, v := range h {
			req.Header.Set(k, v)
		}
	}
	return s.Do(req)
}

// Delete performs a DELETE request
func (s *TestServer) Delete(path string, headers ...map[string]string) *http.Response {
	req := s.NewRequest(http.MethodDelete, path)
	for _, h := range headers {
		for k, v := range h {
			req.Header.Set(k, v)
		}
	}
	return s.Do(req)
}

// NewRequest creates a new request with the test server's base URL
func (s *TestServer) NewRequest(method, path string) *http.Request {
	req, err := http.NewRequest(method, s.URL+path, nil)
	if err != nil {
		s.t.Fatalf("NewRequest failed: %v", err)
	}

	// Apply default headers
	for k, v := range s.headers {
		req.Header.Set(k, v)
	}

	return req
}

// NewRequestWithJSON creates a request with JSON body
func (s *TestServer) NewRequestWithJSON(method, path string, body interface{}) *http.Request {
	var bodyReader io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			s.t.Fatalf("Failed to marshal JSON body: %v", err)
		}
		bodyReader = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequest(method, s.URL+path, bodyReader)
	if err != nil {
		s.t.Fatalf("NewRequest failed: %v", err)
	}

	// Apply default headers
	for k, v := range s.headers {
		req.Header.Set(k, v)
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return req
}

// Do executes a request
func (s *TestServer) Do(req *http.Request) *http.Response {
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		s.t.Fatalf("Request failed: %v", err)
	}
	return resp
}

// Auth constants for testing
const (
	TestToken   = "test-valid-token"
	TestUserID  = "test-user-123"
	TestTenant  = "test-tenant"
	TestEmail   = "test@example.com"
)

// AuthHeaders returns authentication headers for testing
func AuthHeaders(token string) map[string]string {
	return map[string]string{
		"Authorization": "Bearer " + token,
	}
}

// TenantHeaders returns tenant context headers
func TenantHeaders(tenantID string) map[string]string {
	return map[string]string{
		"X-Tenant-ID": tenantID,
	}
}

// DefaultAuthHeaders returns default test authentication headers
func DefaultAuthHeaders() map[string]string {
	return map[string]string{
		"Authorization": "Bearer " + TestToken,
		"X-Tenant-ID":   TestTenant,
	}
}
