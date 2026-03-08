package featureflags

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Tests: writeJSON sets correct content type and status
func TestWriteJSON_SetsContentType(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"test": "value"}

	writeJSON(w, http.StatusOK, data)

	if w.Header().Get("Content-Type") != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", w.Header().Get("Content-Type"))
	}
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

// Tests: writeJSON handles different status codes
func TestWriteJSON_DifferentStatusCodes(t *testing.T) {
	tests := []struct {
		name   string
		status int
	}{
		{"OK", http.StatusOK},
		{"Created", http.StatusCreated},
		{"BadRequest", http.StatusBadRequest},
		{"InternalServerError", http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			writeJSON(w, tt.status, map[string]string{})
			if w.Code != tt.status {
				t.Errorf("expected status %d, got %d", tt.status, w.Code)
			}
		})
	}
}

// Tests: writeError includes error code and message
func TestWriteError_FormatsCorrectly(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/test", nil)

	writeError(w, r, http.StatusBadRequest, "TEST_ERROR", "Test error message")

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
	body := w.Body.String()
	if !strings.Contains(body, "TEST_ERROR") {
		t.Errorf("expected error code in response, got %s", body)
	}
	if !strings.Contains(body, "Test error message") {
		t.Errorf("expected error message in response, got %s", body)
	}
}

// Tests: writeError formats error response correctly
func TestWriteError_IncludesRequestID(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/test", nil)

	writeError(w, r, http.StatusBadRequest, "TEST_ERROR", "Test message")

	body := w.Body.String()
	if !strings.Contains(body, "error") {
		t.Errorf("expected error in response, got %s", body)
	}
}

// Tests: isAdmin returns false when no user in context
func TestIsAdmin_NoUser_ReturnsFalse(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)

	if isAdmin(r) {
		t.Error("expected isAdmin to return false when no user")
	}
}

// Tests: ListHandler returns 403 for non-admin (no user)
func TestListHandler_NoUser_Returns403(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/api/flags", nil)
	w := httptest.NewRecorder()

	ListHandler(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

// Tests: UpdateHandler returns 403 when no user
func TestUpdateHandler_NoUser_Returns403(t *testing.T) {
	r := httptest.NewRequest(http.MethodPut, "/api/flags/test-flag", strings.NewReader(`{"enabled":true}`))
	w := httptest.NewRecorder()

	UpdateHandler(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

// Tests: DeleteHandler returns 403 when no user
func TestDeleteHandler_NoUser_Returns403(t *testing.T) {
	r := httptest.NewRequest(http.MethodDelete, "/api/flags/test-flag", nil)
	w := httptest.NewRecorder()

	DeleteHandler(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

// Tests: FlagUpdate struct has correct fields
func TestFlagUpdate_Structure(t *testing.T) {
	update := FlagUpdate{
		Enabled:         true,
		Description:     "Test flag",
		Tenants:         []string{"tenant-1"},
		Users:           []string{"user-1"},
		DisabledTenants: []string{"tenant-blocked"},
		DisabledUsers:   []string{"user-blocked"},
		Percentage:      50,
	}

	if !update.Enabled {
		t.Error("expected Enabled to be true")
	}
	if update.Description != "Test flag" {
		t.Errorf("expected Description 'Test flag', got %q", update.Description)
	}
	if len(update.Tenants) != 1 {
		t.Errorf("expected 1 tenant, got %d", len(update.Tenants))
	}
	if update.Percentage != 50 {
		t.Errorf("expected Percentage 50, got %d", update.Percentage)
	}
}

// Tests: EvaluateResponse has correct structure
func TestEvaluateResponse_Structure(t *testing.T) {
	resp := EvaluateResponse{
		Flags: map[string]bool{
			"flag-1": true,
			"flag-2": false,
		},
	}

	if len(resp.Flags) != 2 {
		t.Errorf("expected 2 flags, got %d", len(resp.Flags))
	}
	if !resp.Flags["flag-1"] {
		t.Error("expected flag-1 to be true")
	}
	if resp.Flags["flag-2"] {
		t.Error("expected flag-2 to be false")
	}
}

// Tests: ErrorResponse has correct structure
func TestErrorResponse_Structure(t *testing.T) {
	resp := ErrorResponse{
		Error: ErrorDetail{
			Code:      "TEST_ERROR",
			Message:   "Test message",
			RequestID: "req-123",
		},
	}

	if resp.Error.Code != "TEST_ERROR" {
		t.Errorf("expected Code 'TEST_ERROR', got %q", resp.Error.Code)
	}
	if resp.Error.Message != "Test message" {
		t.Errorf("expected Message 'Test message', got %q", resp.Error.Message)
	}
	if resp.Error.RequestID != "req-123" {
		t.Errorf("expected RequestID 'req-123', got %q", resp.Error.RequestID)
	}
}

// Tests: ErrorDetail JSON field omits empty RequestID
func TestErrorDetail_EmptyRequestID(t *testing.T) {
	detail := ErrorDetail{
		Code:    "TEST",
		Message: "Test",
	}

	if detail.RequestID != "" {
		t.Error("expected empty RequestID")
	}
}
