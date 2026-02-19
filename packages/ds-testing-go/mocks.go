package dstesting

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
)

// MockHTTPServer creates a mock HTTP server for testing external service calls
type MockHTTPServer struct {
	*httptest.Server
	mu       sync.Mutex
	handlers map[string]http.HandlerFunc
	calls    []MockCall
}

// MockCall records information about a request to the mock server
type MockCall struct {
	Method  string
	Path    string
	Headers http.Header
	Body    string
}

// NewMockHTTPServer creates a new mock HTTP server
func NewMockHTTPServer() *MockHTTPServer {
	mock := &MockHTTPServer{
		handlers: make(map[string]http.HandlerFunc),
		calls:    make([]MockCall, 0),
	}

	mock.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mock.recordCall(r)

		key := r.Method + " " + r.URL.Path
		mock.mu.Lock()
		handler, exists := mock.handlers[key]
		mock.mu.Unlock()

		if !exists {
			// Try method-agnostic handler
			mock.mu.Lock()
			handler, exists = mock.handlers[r.URL.Path]
			mock.mu.Unlock()
		}

		if exists {
			handler(w, r)
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))

	return mock
}

// recordCall records a request for later inspection
func (m *MockHTTPServer) recordCall(r *http.Request) {
	m.mu.Lock()
	defer m.mu.Unlock()

	call := MockCall{
		Method:  r.Method,
		Path:    r.URL.Path,
		Headers: r.Header.Clone(),
	}
	m.calls = append(m.calls, call)
}

// On registers a handler for a specific method and path
func (m *MockHTTPServer) On(method, path string, handler http.HandlerFunc) *MockHTTPServer {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.handlers[method+" "+path] = handler
	return m
}

// OnGet registers a GET handler
func (m *MockHTTPServer) OnGet(path string, handler http.HandlerFunc) *MockHTTPServer {
	return m.On(http.MethodGet, path, handler)
}

// OnPost registers a POST handler
func (m *MockHTTPServer) OnPost(path string, handler http.HandlerFunc) *MockHTTPServer {
	return m.On(http.MethodPost, path, handler)
}

// OnPut registers a PUT handler
func (m *MockHTTPServer) OnPut(path string, handler http.HandlerFunc) *MockHTTPServer {
	return m.On(http.MethodPut, path, handler)
}

// OnDelete registers a DELETE handler
func (m *MockHTTPServer) OnDelete(path string, handler http.HandlerFunc) *MockHTTPServer {
	return m.On(http.MethodDelete, path, handler)
}

// RespondJSON creates a handler that responds with JSON
func RespondJSON(status int, body interface{}) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		if body != nil {
			data, _ := json.Marshal(body)
			w.Write(data)
		}
	}
}

// RespondOK creates a handler that responds with 200 OK and JSON body
func RespondOK(body interface{}) http.HandlerFunc {
	return RespondJSON(http.StatusOK, body)
}

// RespondError creates a handler that responds with an error status
func RespondError(status int, message string) http.HandlerFunc {
	return RespondJSON(status, map[string]string{"error": message})
}

// Calls returns all recorded calls to the mock server
func (m *MockHTTPServer) Calls() []MockCall {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]MockCall(nil), m.calls...)
}

// CallCount returns the number of calls to the mock server
func (m *MockHTTPServer) CallCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.calls)
}

// LastCall returns the most recent call to the mock server
func (m *MockHTTPServer) LastCall() *MockCall {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.calls) == 0 {
		return nil
	}
	return &m.calls[len(m.calls)-1]
}

// Reset clears all recorded calls
func (m *MockHTTPServer) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.calls = make([]MockCall, 0)
}
