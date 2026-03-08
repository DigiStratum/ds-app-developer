package components

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/DigiStratum/ds-app-developer/backend/internal/auth"
)

// Test helper to create a request with authenticated user context
func withAuthContext(r *http.Request, userID string) *http.Request {
	ctx := r.Context()
	user := &auth.User{
		ID:    userID,
		Email: userID + "@test.com",
		Name:  "Test User",
	}
	ctx = auth.SetUser(ctx, user)
	return r.WithContext(ctx)
}

// Tests: NewHandler creates a valid handler with dependencies
func TestNewHandler_CreatesHandler(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	
	handler := NewHandler(repo, s3)
	
	if handler == nil {
		t.Fatal("expected non-nil handler")
	}
}

// Tests: ListComponentsHandler returns empty list
func TestListComponentsHandler_EmptyList(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodGet, "/api/components", nil)
	w := httptest.NewRecorder()
	
	handler.ListComponentsHandler(w, r)
	
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
	
	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	
	components := resp["components"].([]interface{})
	if len(components) != 0 {
		t.Errorf("expected 0 components, got %d", len(components))
	}
}

// Tests: ListComponentsHandler returns components
func TestListComponentsHandler_ReturnsComponents(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "component-1",
		Description: "First component",
		CreatedAt:   time.Now(),
	})
	repo.AddComponent(&Component{
		Name:        "component-2",
		Description: "Second component",
		CreatedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodGet, "/api/components", nil)
	w := httptest.NewRecorder()
	
	handler.ListComponentsHandler(w, r)
	
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
	
	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	
	count := int(resp["count"].(float64))
	if count != 2 {
		t.Errorf("expected count 2, got %d", count)
	}
}

// Tests: RegisterComponentHandler requires authentication
func TestRegisterComponentHandler_RequiresAuth(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"name":"test-component","description":"Test"}`
	r := httptest.NewRequest(http.MethodPost, "/api/components", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	
	handler.RegisterComponentHandler(w, r)
	
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// Tests: RegisterComponentHandler creates component
func TestRegisterComponentHandler_CreatesComponent(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"name":"test-component","description":"Test component","license":"MIT"}`
	r := httptest.NewRequest(http.MethodPost, "/api/components", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.RegisterComponentHandler(w, r)
	
	if w.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d; body: %s", w.Code, w.Body.String())
	}
	
	// Verify component was created
	stored, _ := repo.GetComponent(context.Background(), "test-component")
	if stored == nil {
		t.Fatal("expected component to be stored")
	}
	if stored.Author != "user-123" {
		t.Errorf("expected author 'user-123', got %q", stored.Author)
	}
}

// Tests: RegisterComponentHandler validates name
func TestRegisterComponentHandler_ValidatesName(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"name":"InvalidName","description":"Test"}`
	r := httptest.NewRequest(http.MethodPost, "/api/components", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.RegisterComponentHandler(w, r)
	
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: RegisterComponentHandler validates description
func TestRegisterComponentHandler_ValidatesDescription(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"name":"valid-name","description":""}`
	r := httptest.NewRequest(http.MethodPost, "/api/components", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.RegisterComponentHandler(w, r)
	
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: RegisterComponentHandler returns 409 for conflict
func TestRegisterComponentHandler_ReturnsConflict(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "existing-component",
		Description: "Existing",
		CreatedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"name":"existing-component","description":"Duplicate"}`
	r := httptest.NewRequest(http.MethodPost, "/api/components", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.RegisterComponentHandler(w, r)
	
	if w.Code != http.StatusConflict {
		t.Errorf("expected status 409, got %d", w.Code)
	}
}

// Tests: GetComponentHandler returns component
func TestGetComponentHandler_ReturnsComponent(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	repo.AddVersion(&Version{
		ComponentName: "my-component",
		Version:       "1.0.0",
		PublishedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodGet, "/api/components/my-component", nil)
	w := httptest.NewRecorder()
	
	handler.GetComponentHandler(w, r)
	
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
	
	var resp ComponentWithVersions
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	
	if resp.Component == nil {
		t.Fatal("expected component in response")
	}
	if resp.Component.Name != "my-component" {
		t.Errorf("expected name 'my-component', got %q", resp.Component.Name)
	}
}

// Tests: GetComponentHandler returns 404 for missing component
func TestGetComponentHandler_Returns404(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodGet, "/api/components/nonexistent", nil)
	w := httptest.NewRecorder()
	
	handler.GetComponentHandler(w, r)
	
	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

// Tests: GetVersionHandler returns download URL
func TestGetVersionHandler_ReturnsDownloadURL(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	repo.AddVersion(&Version{
		ComponentName: "my-component",
		Version:       "1.0.0",
		S3Key:         "my-component/1.0.0.tar.gz",
		PublishedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodGet, "/api/components/my-component/1.0.0", nil)
	w := httptest.NewRecorder()
	
	handler.GetVersionHandler(w, r)
	
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
	
	var resp DownloadResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	
	if resp.DownloadURL == "" {
		t.Error("expected non-empty download URL")
	}
}

// Tests: GetVersionHandler returns 404 for missing version
func TestGetVersionHandler_Returns404(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodGet, "/api/components/my-component/9.9.9", nil)
	w := httptest.NewRecorder()
	
	handler.GetVersionHandler(w, r)
	
	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

// Tests: PublishVersionHandler requires auth
func TestPublishVersionHandler_RequiresAuth(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"size":1024,"checksum":"abc123"}`
	r := httptest.NewRequest(http.MethodPut, "/api/components/my-component/2.0.0", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	
	handler.PublishVersionHandler(w, r)
	
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// Tests: PublishVersionHandler creates version
func TestPublishVersionHandler_CreatesVersion(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"size":1024,"checksum":"abc123"}`
	r := httptest.NewRequest(http.MethodPut, "/api/components/my-component/2.0.0", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.PublishVersionHandler(w, r)
	
	if w.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d; body: %s", w.Code, w.Body.String())
	}
	
	var resp PublishVersionResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	
	if resp.UploadURL == "" {
		t.Error("expected non-empty upload URL")
	}
}

// Tests: PublishVersionHandler validates version format
func TestPublishVersionHandler_ValidatesVersion(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"size":1024,"checksum":"abc123"}`
	r := httptest.NewRequest(http.MethodPut, "/api/components/my-component/invalid", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.PublishVersionHandler(w, r)
	
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: PublishVersionHandler returns 409 for duplicate
func TestPublishVersionHandler_ReturnsConflict(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	repo.AddVersion(&Version{
		ComponentName: "my-component",
		Version:       "1.0.0",
		PublishedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"size":1024,"checksum":"abc123"}`
	r := httptest.NewRequest(http.MethodPut, "/api/components/my-component/1.0.0", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.PublishVersionHandler(w, r)
	
	if w.Code != http.StatusConflict {
		t.Errorf("expected status 409, got %d", w.Code)
	}
}

// Tests: DeleteVersionHandler requires auth
func TestDeleteVersionHandler_RequiresAuth(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodDelete, "/api/components/my-component/1.0.0?hard=true", nil)
	w := httptest.NewRecorder()
	
	handler.DeleteVersionHandler(w, r)
	
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// Tests: DeleteVersionHandler soft deletes (deprecates) by default
func TestDeleteVersionHandler_SoftDelete(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	repo.AddVersion(&Version{
		ComponentName: "my-component",
		Version:       "1.0.0",
		PublishedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodDelete, "/api/components/my-component/1.0.0", nil)
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.DeleteVersionHandler(w, r)
	
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}
	
	// Verify version was deprecated, not deleted
	stored, _ := repo.GetVersion(context.Background(), "my-component", "1.0.0")
	if stored == nil {
		t.Fatal("expected version to still exist")
	}
	if !stored.Deprecated {
		t.Error("expected version to be deprecated")
	}
}

// Tests: DeleteVersionHandler hard deletes when ?hard=true
func TestDeleteVersionHandler_HardDelete(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	repo.AddVersion(&Version{
		ComponentName: "my-component",
		Version:       "1.0.0",
		PublishedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodDelete, "/api/components/my-component/1.0.0?hard=true", nil)
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.DeleteVersionHandler(w, r)
	
	if w.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d; body: %s", w.Code, w.Body.String())
	}
	
	// Verify version was deleted
	stored, _ := repo.GetVersion(context.Background(), "my-component", "1.0.0")
	if stored != nil {
		t.Error("expected version to be deleted")
	}
}

// Tests: DeleteVersionHandler returns 404 for missing version
func TestDeleteVersionHandler_Returns404(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodDelete, "/api/components/my-component/9.9.9?hard=true", nil)
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.DeleteVersionHandler(w, r)
	
	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

// Tests: Handlers handle JSON parse errors
func TestRegisterComponentHandler_InvalidJSON(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodPost, "/api/components", strings.NewReader(`{invalid`))
	r.Header.Set("Content-Type", "application/json")
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.RegisterComponentHandler(w, r)
	
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: GetComponentHandler handles missing name gracefully
func TestGetComponentHandler_EmptyName(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodGet, "/api/components/", nil)
	w := httptest.NewRecorder()
	
	handler.GetComponentHandler(w, r)
	
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: GetVersionHandler handles missing name/version
func TestGetVersionHandler_MissingParams(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodGet, "/api/components/only-name", nil)
	w := httptest.NewRecorder()
	
	handler.GetVersionHandler(w, r)
	
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: PublishVersionHandler validates size
func TestPublishVersionHandler_ValidatesSize(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"size":0,"checksum":"abc123"}`
	r := httptest.NewRequest(http.MethodPut, "/api/components/my-component/1.0.0", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.PublishVersionHandler(w, r)
	
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: PublishVersionHandler validates checksum
func TestPublishVersionHandler_ValidatesChecksum(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"size":1024,"checksum":""}`
	r := httptest.NewRequest(http.MethodPut, "/api/components/my-component/1.0.0", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.PublishVersionHandler(w, r)
	
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

// Tests: PublishVersionHandler returns 404 for missing component
func TestPublishVersionHandler_ComponentNotFound(t *testing.T) {
	repo := NewMockRepository()
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	body := `{"size":1024,"checksum":"abc123"}`
	r := httptest.NewRequest(http.MethodPut, "/api/components/nonexistent/1.0.0", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.PublishVersionHandler(w, r)
	
	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

// Tests: DeleteVersionHandler validates version format
func TestDeleteVersionHandler_ValidatesVersion(t *testing.T) {
	repo := NewMockRepository()
	repo.AddComponent(&Component{
		Name:        "my-component",
		Description: "My component",
		CreatedAt:   time.Now(),
	})
	s3 := NewMockArtifactStore()
	handler := NewHandler(repo, s3)
	
	r := httptest.NewRequest(http.MethodDelete, "/api/components/my-component/invalid-version", nil)
	r = withAuthContext(r, "user-123")
	w := httptest.NewRecorder()
	
	handler.DeleteVersionHandler(w, r)
	
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}
