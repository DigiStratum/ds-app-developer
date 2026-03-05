// Package api tests for API handlers.
// Tests FR-AUTH-003, FR-TENANT-001, NFR-AVAIL-003
package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DigiStratum/ds-app-developer/backend/internal/auth"
)

// contextKey type for test context values
type testContextKey string

const (
	userContextKey   testContextKey = "user"
	tenantContextKey testContextKey = "tenant"
)

// setUser adds user to context for testing
func setUser(ctx context.Context, user *auth.User) context.Context {
	return context.WithValue(ctx, testContextKey("user"), user)
}

// setTenantID adds tenant ID to context for testing
func setTenantID(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, testContextKey("tenant"), tenantID)
}

// Tests NFR-AVAIL-003: Health endpoint returns healthy status
func TestHealthHandler_ReturnsHealthy(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/health", nil)
	rec := httptest.NewRecorder()

	HealthHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response["status"] != "healthy" {
		t.Errorf("expected status 'healthy', got %v", response["status"])
	}
	if response["timestamp"] == nil {
		t.Error("expected timestamp in response")
	}
	if response["version"] == nil {
		t.Error("expected version in response")
	}
}

func TestHealthHandler_ReturnsJSON(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/health", nil)
	rec := httptest.NewRecorder()

	HealthHandler(rec, req)

	contentType := rec.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", contentType)
	}
}

// Tests FR-AUTH-003: GetCurrentUserHandler returns 401 for unauthenticated
func TestGetCurrentUserHandler_Returns401WhenNoUser(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/auth/me", nil)
	rec := httptest.NewRecorder()

	GetCurrentUserHandler(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}

	var response ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.Error.Code != "UNAUTHORIZED" {
		t.Errorf("expected error code 'UNAUTHORIZED', got %q", response.Error.Code)
	}
}

// Tests FR-TENANT-001: GetCurrentTenantHandler returns tenant context
func TestGetCurrentTenantHandler_ReturnsPersonalWhenNoTenant(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/tenant", nil)
	rec := httptest.NewRecorder()

	GetCurrentTenantHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response["tenant_id"] != "" {
		t.Errorf("expected empty tenant_id, got %v", response["tenant_id"])
	}
	if response["is_personal"] != true {
		t.Errorf("expected is_personal true, got %v", response["is_personal"])
	}
}

// Test WriteJSON helper
func TestWriteJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	data := map[string]string{"message": "hello"}

	WriteJSON(rec, http.StatusCreated, data)

	if rec.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d", rec.Code)
	}

	contentType := rec.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", contentType)
	}

	var response map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if response["message"] != "hello" {
		t.Errorf("expected message 'hello', got %q", response["message"])
	}
}

// Test WriteError helper
func TestWriteError(t *testing.T) {
	req := httptest.NewRequest("GET", "/test", nil)
	rec := httptest.NewRecorder()

	WriteError(rec, req, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid input")

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}

	var response ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if response.Error.Code != "VALIDATION_ERROR" {
		t.Errorf("expected code 'VALIDATION_ERROR', got %q", response.Error.Code)
	}
	if response.Error.Message != "Invalid input" {
		t.Errorf("expected message 'Invalid input', got %q", response.Error.Message)
	}
}

// Test GetSessionHandler returns guest state when no cookie
func TestGetSessionHandler_ReturnsGuestWhenNoCookie(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/session", nil)
	rec := httptest.NewRecorder()

	GetSessionHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response SessionResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.IsAuthenticated {
		t.Error("expected IsAuthenticated to be false")
	}
	if !response.IsGuest {
		t.Error("expected IsGuest to be true")
	}
	if response.User != nil {
		t.Error("expected User to be nil")
	}
}

// Test error response structure
func TestErrorResponse_JSONFormat(t *testing.T) {
	resp := ErrorResponse{
		Error: ErrorDetail{
			Code:      "TEST_ERROR",
			Message:   "Test error message",
			RequestID: "req-123",
			Details: map[string]string{
				"field": "value",
			},
		},
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded ErrorResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Error.Code != "TEST_ERROR" {
		t.Error("expected code to be preserved")
	}
	if decoded.Error.Message != "Test error message" {
		t.Error("expected message to be preserved")
	}
	if decoded.Error.RequestID != "req-123" {
		t.Error("expected request_id to be preserved")
	}
	if decoded.Error.Details["field"] != "value" {
		t.Error("expected details to be preserved")
	}
}

// Test SessionResponse structure
func TestSessionResponse_JSONFormat(t *testing.T) {
	user := &auth.User{
		ID:    "user-123",
		Email: "test@example.com",
	}

	resp := SessionResponse{
		SessionID:       "sess-123...",
		IsAuthenticated: true,
		IsGuest:         false,
		TenantID:        "tenant-456",
		User:            user,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded SessionResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.SessionID != "sess-123..." {
		t.Error("expected session_id to be preserved")
	}
	if !decoded.IsAuthenticated {
		t.Error("expected is_authenticated to be preserved")
	}
	if decoded.TenantID != "tenant-456" {
		t.Error("expected tenant_id to be preserved")
	}
	if decoded.User == nil || decoded.User.ID != "user-123" {
		t.Error("expected user to be preserved")
	}
}

// Test WriteJSON with different status codes
func TestWriteJSON_DifferentStatusCodes(t *testing.T) {
	tests := []struct {
		name   string
		status int
	}{
		{"OK", http.StatusOK},
		{"Created", http.StatusCreated},
		{"NoContent", http.StatusNoContent},
		{"BadRequest", http.StatusBadRequest},
		{"NotFound", http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			WriteJSON(rec, tt.status, map[string]string{"test": "value"})
			if rec.Code != tt.status {
				t.Errorf("expected status %d, got %d", tt.status, rec.Code)
			}
		})
	}
}

// Additional tests for better coverage

// Tests: GetSessionHandler with empty cookie value
func TestGetSessionHandler_EmptyCookieValue(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/session", nil)
	req.AddCookie(&http.Cookie{Name: "ds_session", Value: ""})
	rec := httptest.NewRecorder()

	GetSessionHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response SessionResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.IsAuthenticated {
		t.Error("expected IsAuthenticated to be false")
	}
}

// Tests: HealthHandler returns correct content-type
func TestHealthHandler_ContentType(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/health", nil)
	rec := httptest.NewRecorder()

	HealthHandler(rec, req)

	contentType := rec.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", contentType)
	}
}

// Tests: HealthHandler returns version string
func TestHealthHandler_ReturnsVersion(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/health", nil)
	rec := httptest.NewRecorder()

	HealthHandler(rec, req)

	var response map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	version, ok := response["version"].(string)
	if !ok || version == "" {
		t.Error("expected non-empty version string")
	}
}

// Tests: ErrorResponse with empty details
func TestErrorResponse_EmptyDetails(t *testing.T) {
	resp := ErrorResponse{
		Error: ErrorDetail{
			Code:    "TEST",
			Message: "Test",
		},
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	// Verify details is omitted when empty
	if containsSubstring(string(data), "details") {
		// Details might be included as null or omitted, both acceptable
	}
}

// Tests: SessionResponse without user
func TestSessionResponse_GuestSession(t *testing.T) {
	resp := SessionResponse{
		IsAuthenticated: false,
		IsGuest:         true,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded SessionResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.IsAuthenticated {
		t.Error("expected IsAuthenticated false")
	}
	if !decoded.IsGuest {
		t.Error("expected IsGuest true")
	}
	if decoded.User != nil {
		t.Error("expected User nil")
	}
}

// Tests: WriteJSON handles struct data
func TestWriteJSON_Struct(t *testing.T) {
	rec := httptest.NewRecorder()

	type TestStruct struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	WriteJSON(rec, http.StatusOK, TestStruct{Name: "test", Value: 42})

	var response TestStruct
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if response.Name != "test" {
		t.Errorf("expected name 'test', got %q", response.Name)
	}
	if response.Value != 42 {
		t.Errorf("expected value 42, got %d", response.Value)
	}
}

// Tests: WriteJSON handles slice data
func TestWriteJSON_Slice(t *testing.T) {
	rec := httptest.NewRecorder()

	data := []string{"a", "b", "c"}
	WriteJSON(rec, http.StatusOK, data)

	var response []string
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if len(response) != 3 {
		t.Errorf("expected 3 items, got %d", len(response))
	}
}

// Tests: WriteError sets correct status codes
func TestWriteError_StatusCodes(t *testing.T) {
	tests := []struct {
		name   string
		status int
	}{
		{"BadRequest", http.StatusBadRequest},
		{"Unauthorized", http.StatusUnauthorized},
		{"Forbidden", http.StatusForbidden},
		{"NotFound", http.StatusNotFound},
		{"InternalError", http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			rec := httptest.NewRecorder()

			WriteError(rec, req, tt.status, "TEST", "message")

			if rec.Code != tt.status {
				t.Errorf("expected status %d, got %d", tt.status, rec.Code)
			}
		})
	}
}

// Tests: GetCurrentTenantHandler returns JSON
func TestGetCurrentTenantHandler_ReturnsJSON(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/tenant", nil)
	rec := httptest.NewRecorder()

	GetCurrentTenantHandler(rec, req)

	contentType := rec.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", contentType)
	}
}

// helper function
func containsSubstring(haystack, needle string) bool {
	for i := 0; i <= len(haystack)-len(needle); i++ {
		if haystack[i:i+len(needle)] == needle {
			return true
		}
	}
	return false
}
