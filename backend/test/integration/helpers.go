package integration

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// Test constants for authentication
const (
	TestToken   = "test-valid-token"
	TestUserID  = "test-user-123"
	TestTenant  = "test-tenant"
	TestEmail   = "test@example.com"
)

// TestServer wraps httptest.Server with helper methods for integration tests
type TestServer struct {
	*httptest.Server
	t  *testing.T
	db *TestDB
}

// NewTestServer creates a test server with full middleware stack.
// The server uses DynamoDB Local for database operations.
//
// Example:
//
//	func TestMyAPI(t *testing.T) {
//	    server := NewTestServer(t)
//	    defer server.Close()
//
//	    resp := server.Get("/health")
//	    // assertions...
//	}
func NewTestServer(t *testing.T) *TestServer {
	t.Helper()

	// Set up test database
	db := NewTestDB(t)
	t.Cleanup(func() { db.Cleanup() })

	// Set environment for tests
	t.Setenv("DYNAMODB_TABLE", db.TableName)
	t.Setenv("DYNAMODB_ENDPOINT", db.Endpoint)
	t.Setenv("DSACCOUNT_SSO_URL", "https://account.test.local")
	t.Setenv("DSACCOUNT_APP_ID", "test-app")
	t.Setenv("APP_URL", "https://app.test.local")

	// Create handler - this would import your actual handler setup
	// For now, we create a simple placeholder
	handler := createTestHandler()

	server := httptest.NewServer(handler)
	t.Cleanup(func() { server.Close() })

	return &TestServer{
		Server: server,
		t:      t,
		db:     db,
	}
}

// createTestHandler creates the HTTP handler for tests.
// This should match your production handler setup.
func createTestHandler() http.Handler {
	// TODO: Import and use your actual handler from cmd/api
	// For now, return a basic health check handler
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"healthy"}`))
	})
	return mux
}

// Get performs a GET request and returns the response
func (s *TestServer) Get(path string) *http.Response {
	resp, err := http.Get(s.URL + path)
	if err != nil {
		s.t.Fatalf("GET %s failed: %v", path, err)
	}
	return resp
}

// NewRequest creates a new request with the test server's base URL
func (s *TestServer) NewRequest(method, path string) *http.Request {
	req, err := http.NewRequest(method, s.URL+path, nil)
	if err != nil {
		s.t.Fatalf("NewRequest failed: %v", err)
	}
	return req
}

// NewAuthenticatedRequest creates a request with test authentication headers
func (s *TestServer) NewAuthenticatedRequest(method, path string) *http.Request {
	req := s.NewRequest(method, path)
	req.Header.Set("Authorization", "Bearer "+TestToken)
	req.Header.Set("X-Tenant-ID", TestTenant)
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

// SeedFixture inserts test data into the database
func (s *TestServer) SeedFixture(fixture Fixture) {
	if err := s.db.Insert(fixture); err != nil {
		s.t.Fatalf("SeedFixture failed: %v", err)
	}
}

// SeedFixtures inserts multiple test fixtures into the database
func (s *TestServer) SeedFixtures(fixtures ...Fixture) {
	for _, f := range fixtures {
		s.SeedFixture(f)
	}
}

// DB returns the test database for direct access
func (s *TestServer) DB() *TestDB {
	return s.db
}

// AssertStatus checks that the response has the expected status code
func AssertStatus(t *testing.T, resp *http.Response, expected int) {
	t.Helper()
	if resp.StatusCode != expected {
		t.Errorf("expected status %d, got %d", expected, resp.StatusCode)
	}
}

// AssertContentType checks that the response has the expected content type
func AssertContentType(t *testing.T, resp *http.Response, expected string) {
	t.Helper()
	actual := resp.Header.Get("Content-Type")
	if actual != expected {
		t.Errorf("expected Content-Type %q, got %q", expected, actual)
	}
}
