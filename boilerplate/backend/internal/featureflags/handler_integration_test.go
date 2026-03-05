package featureflags

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/DigiStratum/ds-app-developer/backend/internal/auth"
	"github.com/DigiStratum/ds-app-developer/backend/internal/session"
)

// Test helper to create a request with admin user context
func withAdminContext(r *http.Request) *http.Request {
	ctx := r.Context()
	// Add an admin user to context
	user := &auth.User{
		ID:    "admin-user-id",
		Email: "admin@digistratum.com",
		Name:  "Admin User",
	}
	ctx = auth.SetUser(ctx, user)
	return r.WithContext(ctx)
}

// Test helper to create a request with regular user context
func withUserContext(r *http.Request, userID, email string) *http.Request {
	ctx := r.Context()
	user := &auth.User{
		ID:    userID,
		Email: email,
		Name:  "Test User",
	}
	ctx = auth.SetUser(ctx, user)
	return r.WithContext(ctx)
}

// Test helper to create a request with session context
func withSessionContext(r *http.Request, sessionID string) *http.Request {
	ctx := r.Context()
	sess := &session.Session{ID: sessionID}
	ctx = session.SetSession(ctx, sess)
	return r.WithContext(ctx)
}

// Test helper to create a request with tenant context
func withTenantContext(r *http.Request, tenantID string) *http.Request {
	ctx := r.Context()
	ctx = auth.SetTenantID(ctx, tenantID)
	return r.WithContext(ctx)
}

// Tests: NewHandler creates a valid handler
func TestNewHandler_CreatesHandler(t *testing.T) {
	store := NewMockStore()
	handler := NewHandler(store)

	if handler == nil {
		t.Fatal("expected non-nil handler")
	}
	if handler.store != store {
		t.Error("expected handler to have the provided store")
	}
	if handler.evaluator == nil {
		t.Error("expected handler to have an evaluator")
	}
}

// Tests: EvaluateHandler returns empty flags when store is empty
func TestHandler_EvaluateHandler_EmptyFlags(t *testing.T) {
	store := NewMockStore()
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodGet, "/api/flags/evaluate", nil)
	w := httptest.NewRecorder()

	handler.EvaluateHandler(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp EvaluateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if len(resp.Flags) != 0 {
		t.Errorf("expected 0 flags, got %d", len(resp.Flags))
	}
}

// Tests: EvaluateHandler returns all flags
func TestHandler_EvaluateHandler_ReturnsFlags(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{Key: "flag-1", Enabled: true})
	store.AddFlag(&FeatureFlag{Key: "flag-2", Enabled: false})
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodGet, "/api/flags/evaluate", nil)
	w := httptest.NewRecorder()

	handler.EvaluateHandler(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp EvaluateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if len(resp.Flags) != 2 {
		t.Errorf("expected 2 flags, got %d", len(resp.Flags))
	}
	if !resp.Flags["flag-1"] {
		t.Error("expected flag-1 to be enabled")
	}
	if resp.Flags["flag-2"] {
		t.Error("expected flag-2 to be disabled")
	}
}

// Tests: EvaluateHandler applies user context
func TestHandler_EvaluateHandler_AppliesUserContext(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:     "user-flag",
		Enabled: false,
		Users:   []string{"user-123"},
	})
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodGet, "/api/flags/evaluate", nil)
	r = withUserContext(r, "user-123", "user@test.com")
	w := httptest.NewRecorder()

	handler.EvaluateHandler(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp EvaluateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if !resp.Flags["user-flag"] {
		t.Error("expected user-flag to be enabled for whitelisted user")
	}
}

// Tests: EvaluateHandler returns 500 on store error
func TestHandler_EvaluateHandler_StoreError(t *testing.T) {
	store := NewMockStore()
	store.SetListError(errMockStorage)
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodGet, "/api/flags/evaluate", nil)
	w := httptest.NewRecorder()

	handler.EvaluateHandler(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", w.Code)
	}
}

// Tests: ListHandler returns 403 for non-admin
func TestHandler_ListHandler_NonAdmin_Returns403(t *testing.T) {
	store := NewMockStore()
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodGet, "/api/flags", nil)
	w := httptest.NewRecorder()

	handler.ListHandler(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

// Tests: ListHandler returns flags for admin
func TestHandler_ListHandler_Admin_ReturnsFlags(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{Key: "flag-1", Enabled: true})
	store.AddFlag(&FeatureFlag{Key: "flag-2", Enabled: false})
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodGet, "/api/flags", nil)
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.ListHandler(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var flags []*FeatureFlag
	if err := json.Unmarshal(w.Body.Bytes(), &flags); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if len(flags) != 2 {
		t.Errorf("expected 2 flags, got %d", len(flags))
	}
}

// Tests: ListHandler returns 500 on store error
func TestHandler_ListHandler_StoreError(t *testing.T) {
	store := NewMockStore()
	store.SetListError(errMockStorage)
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodGet, "/api/flags", nil)
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.ListHandler(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", w.Code)
	}
}

// Tests: UpdateHandler returns 403 for non-admin
func TestHandler_UpdateHandler_NonAdmin_Returns403(t *testing.T) {
	store := NewMockStore()
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodPut, "/api/flags/test-flag", strings.NewReader(`{"enabled":true}`))
	w := httptest.NewRecorder()

	handler.UpdateHandler(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

// Tests: UpdateHandler returns 400 when flag key missing
func TestHandler_UpdateHandler_MissingKey_Returns400(t *testing.T) {
	store := NewMockStore()
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodPut, "/api/flags/", strings.NewReader(`{"enabled":true}`))
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.UpdateHandler(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: UpdateHandler returns 400 for invalid JSON
func TestHandler_UpdateHandler_InvalidJSON_Returns400(t *testing.T) {
	store := NewMockStore()
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodPut, "/api/flags/test-flag", strings.NewReader(`{invalid`))
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.UpdateHandler(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: UpdateHandler creates new flag
func TestHandler_UpdateHandler_CreateNewFlag(t *testing.T) {
	store := NewMockStore()
	handler := NewHandler(store)

	body := `{"enabled":true,"description":"Test flag","percentage":50}`
	r := httptest.NewRequest(http.MethodPut, "/api/flags/new-flag", strings.NewReader(body))
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.UpdateHandler(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	// Verify flag was saved
	savedFlag, _ := store.Get(context.Background(), "new-flag")
	if savedFlag == nil {
		t.Fatal("expected flag to be saved")
	}
	if !savedFlag.Enabled {
		t.Error("expected flag to be enabled")
	}
	if savedFlag.Description != "Test flag" {
		t.Errorf("expected description 'Test flag', got %q", savedFlag.Description)
	}
	if savedFlag.Percentage != 50 {
		t.Errorf("expected percentage 50, got %d", savedFlag.Percentage)
	}
}

// Tests: UpdateHandler updates existing flag
func TestHandler_UpdateHandler_UpdateExistingFlag(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{
		Key:         "existing-flag",
		Enabled:     false,
		Description: "Old description",
	})
	handler := NewHandler(store)

	body := `{"enabled":true,"description":"New description"}`
	r := httptest.NewRequest(http.MethodPut, "/api/flags/existing-flag", strings.NewReader(body))
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.UpdateHandler(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	savedFlag, _ := store.Get(context.Background(), "existing-flag")
	if !savedFlag.Enabled {
		t.Error("expected flag to be enabled")
	}
	if savedFlag.Description != "New description" {
		t.Errorf("expected description 'New description', got %q", savedFlag.Description)
	}
}

// Tests: UpdateHandler applies all update fields
func TestHandler_UpdateHandler_AllFields(t *testing.T) {
	store := NewMockStore()
	handler := NewHandler(store)

	body := `{
		"enabled": true,
		"description": "Full update",
		"tenants": ["t1", "t2"],
		"users": ["u1"],
		"disabled_tenants": ["t3"],
		"disabled_users": ["u2"],
		"percentage": 75
	}`
	r := httptest.NewRequest(http.MethodPut, "/api/flags/full-flag", strings.NewReader(body))
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.UpdateHandler(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	savedFlag, _ := store.Get(context.Background(), "full-flag")
	if len(savedFlag.Tenants) != 2 {
		t.Errorf("expected 2 tenants, got %d", len(savedFlag.Tenants))
	}
	if len(savedFlag.Users) != 1 {
		t.Errorf("expected 1 user, got %d", len(savedFlag.Users))
	}
	if len(savedFlag.DisabledTenants) != 1 {
		t.Errorf("expected 1 disabled tenant, got %d", len(savedFlag.DisabledTenants))
	}
	if len(savedFlag.DisabledUsers) != 1 {
		t.Errorf("expected 1 disabled user, got %d", len(savedFlag.DisabledUsers))
	}
	if savedFlag.Percentage != 75 {
		t.Errorf("expected percentage 75, got %d", savedFlag.Percentage)
	}
}

// Tests: UpdateHandler returns 500 on Get error
func TestHandler_UpdateHandler_GetError_Returns500(t *testing.T) {
	store := NewMockStore()
	store.SetGetError(errMockStorage)
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodPut, "/api/flags/test-flag", strings.NewReader(`{"enabled":true}`))
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.UpdateHandler(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", w.Code)
	}
}

// Tests: UpdateHandler returns 500 on Save error
func TestHandler_UpdateHandler_SaveError_Returns500(t *testing.T) {
	store := NewMockStore()
	store.SetSaveError(errMockStorage)
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodPut, "/api/flags/test-flag", strings.NewReader(`{"enabled":true}`))
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.UpdateHandler(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", w.Code)
	}
}

// Tests: DeleteHandler returns 403 for non-admin
func TestHandler_DeleteHandler_NonAdmin_Returns403(t *testing.T) {
	store := NewMockStore()
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodDelete, "/api/flags/test-flag", nil)
	w := httptest.NewRecorder()

	handler.DeleteHandler(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

// Tests: DeleteHandler returns 400 when flag key missing
func TestHandler_DeleteHandler_MissingKey_Returns400(t *testing.T) {
	store := NewMockStore()
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodDelete, "/api/flags/", nil)
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.DeleteHandler(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: DeleteHandler deletes flag successfully
func TestHandler_DeleteHandler_Success(t *testing.T) {
	store := NewMockStore()
	store.AddFlag(&FeatureFlag{Key: "delete-me", Enabled: true})
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodDelete, "/api/flags/delete-me", nil)
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.DeleteHandler(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d", w.Code)
	}

	// Verify flag was deleted
	flag, _ := store.Get(context.Background(), "delete-me")
	if flag != nil {
		t.Error("expected flag to be deleted")
	}
}

// Tests: DeleteHandler returns 500 on store error
func TestHandler_DeleteHandler_StoreError_Returns500(t *testing.T) {
	store := NewMockStore()
	store.SetDeleteError(errMockStorage)
	handler := NewHandler(store)

	r := httptest.NewRequest(http.MethodDelete, "/api/flags/test-flag", nil)
	r = withAdminContext(r)
	w := httptest.NewRecorder()

	handler.DeleteHandler(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", w.Code)
	}
}

// Tests: isAdmin returns true for admin email
func TestIsAdmin_AdminEmail_ReturnsTrue(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	r = withAdminContext(r)

	if !isAdmin(r) {
		t.Error("expected isAdmin to return true for admin email")
	}
}

// Tests: isAdmin returns false for regular user
func TestIsAdmin_RegularUser_ReturnsFalse(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	r = withUserContext(r, "user-123", "user@test.com")

	if isAdmin(r) {
		t.Error("expected isAdmin to return false for regular user")
	}
}

// Tests: isAdmin returns true for skelly
func TestIsAdmin_SkellyEmail_ReturnsTrue(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	ctx := r.Context()
	user := &auth.User{
		ID:    "skelly-id",
		Email: "skelly@digistratum.com",
		Name:  "Skelly",
	}
	ctx = auth.SetUser(ctx, user)
	r = r.WithContext(ctx)

	if !isAdmin(r) {
		t.Error("expected isAdmin to return true for skelly")
	}
}

// Tests: buildEvaluationContext extracts user ID
func TestBuildEvaluationContext_ExtractsUserID(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	r = withUserContext(r, "user-123", "user@test.com")

	evalCtx := buildEvaluationContext(r)

	if evalCtx.UserID != "user-123" {
		t.Errorf("expected UserID 'user-123', got %q", evalCtx.UserID)
	}
}

// Tests: buildEvaluationContext extracts session ID
func TestBuildEvaluationContext_ExtractsSessionID(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	r = withSessionContext(r, "session-abc")

	evalCtx := buildEvaluationContext(r)

	if evalCtx.SessionID != "session-abc" {
		t.Errorf("expected SessionID 'session-abc', got %q", evalCtx.SessionID)
	}
}

// Tests: buildEvaluationContext extracts tenant ID
func TestBuildEvaluationContext_ExtractsTenantID(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	r = withTenantContext(r, "tenant-xyz")

	evalCtx := buildEvaluationContext(r)

	if evalCtx.TenantID != "tenant-xyz" {
		t.Errorf("expected TenantID 'tenant-xyz', got %q", evalCtx.TenantID)
	}
}

// Tests: buildEvaluationContext with empty request
func TestBuildEvaluationContext_EmptyRequest(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)

	evalCtx := buildEvaluationContext(r)

	if evalCtx.UserID != "" {
		t.Errorf("expected empty UserID, got %q", evalCtx.UserID)
	}
	if evalCtx.SessionID != "" {
		t.Errorf("expected empty SessionID, got %q", evalCtx.SessionID)
	}
	if evalCtx.TenantID != "" {
		t.Errorf("expected empty TenantID, got %q", evalCtx.TenantID)
	}
}
