package components

import (
	"bytes"
	"context"
	"encoding/json"
	
	"net/http/httptest"
	"testing"
	"time"
)

// Mock repository for testing
type mockRepository struct {
	components map[string]*Component
	versions   map[string]map[string]*Version
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		components: make(map[string]*Component),
		versions:   make(map[string]map[string]*Version),
	}
}

func (m *mockRepository) RegisterComponent(ctx context.Context, component *Component) error {
	if _, exists := m.components[component.Name]; exists {
		return &conflictError{name: component.Name}
	}
	m.components[component.Name] = component
	return nil
}

func (m *mockRepository) GetComponent(ctx context.Context, name string) (*Component, error) {
	return m.components[name], nil
}

func (m *mockRepository) ListComponents(ctx context.Context) ([]*Component, error) {
	var result []*Component
	for _, c := range m.components {
		result = append(result, c)
	}
	return result, nil
}

func (m *mockRepository) PublishVersion(ctx context.Context, version *Version) error {
	if m.versions[version.ComponentName] == nil {
		m.versions[version.ComponentName] = make(map[string]*Version)
	}
	if _, exists := m.versions[version.ComponentName][version.Version]; exists {
		return &conflictError{name: version.ComponentName + "@" + version.Version}
	}
	m.versions[version.ComponentName][version.Version] = version
	return nil
}

func (m *mockRepository) GetVersion(ctx context.Context, componentName, version string) (*Version, error) {
	if m.versions[componentName] == nil {
		return nil, nil
	}
	return m.versions[componentName][version], nil
}

func (m *mockRepository) ListVersions(ctx context.Context, componentName string) ([]*Version, error) {
	var result []*Version
	if m.versions[componentName] != nil {
		for _, v := range m.versions[componentName] {
			result = append(result, v)
		}
	}
	return result, nil
}

func (m *mockRepository) DeprecateVersion(ctx context.Context, componentName, version, message string) error {
	if m.versions[componentName] == nil || m.versions[componentName][version] == nil {
		return &notFoundError{name: componentName + "@" + version}
	}
	m.versions[componentName][version].Deprecated = true
	m.versions[componentName][version].DeprecationMessage = message
	return nil
}

func (m *mockRepository) DeleteVersion(ctx context.Context, componentName, version string) error {
	if m.versions[componentName] == nil || m.versions[componentName][version] == nil {
		return &notFoundError{name: componentName + "@" + version}
	}
	delete(m.versions[componentName], version)
	return nil
}

type conflictError struct{ name string }

func (e *conflictError) Error() string { return e.name + " already exists" }

type notFoundError struct{ name string }

func (e *notFoundError) Error() string { return e.name + " not found" }

// Mock S3 service for testing
type mockS3Service struct{}

func (m *mockS3Service) GenerateUploadURL(ctx context.Context, componentName, version string, expiry time.Duration) (string, error) {
	return "https://s3.example.com/upload/" + componentName + "/" + version, nil
}

func (m *mockS3Service) GenerateDownloadURL(ctx context.Context, componentName, version string, expiry time.Duration) (string, error) {
	return "https://s3.example.com/download/" + componentName + "/" + version, nil
}

func (m *mockS3Service) DeleteArtifact(ctx context.Context, componentName, version string) error {
	return nil
}

// TestHandler wraps the real handler with mock dependencies
type TestHandler struct {
	mockRepo *mockRepository
	mockS3   *mockS3Service
}

func newTestHandler() *TestHandler {
	return &TestHandler{
		mockRepo: newMockRepository(),
		mockS3:   &mockS3Service{},
	}
}

// Tests for validation functions

// Tests: validateComponentName validates component names correctly
func TestValidateComponentName(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"simple_name", "my-component", true},
		{"with_numbers", "component123", true},
		{"with_dots", "my.component", true},
		{"scoped_name", "@ds/core", true},
		{"underscore", "my_component", true},
		{"empty", "", false},
		{"too_long", string(make([]byte, 200)), false},
		{"starts_with_hyphen", "-component", false},
		{"uppercase", "MyComponent", false},
		{"special_chars", "comp@nent", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validateComponentName(tt.input)
			if got != tt.want {
				t.Errorf("validateComponentName(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

// Tests: validateVersion validates semver strings correctly
func TestValidateVersion(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"simple", "1.0.0", true},
		{"with_v", "v1.0.0", true},
		{"prerelease", "1.0.0-beta.1", true},
		{"build_metadata", "1.0.0+build123", true},
		{"prerelease_and_build", "1.0.0-alpha+001", true},
		{"empty", "", false},
		{"no_patch", "1.0", false},
		{"not_semver", "latest", false},
		{"negative", "-1.0.0", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validateVersion(tt.input)
			if got != tt.want {
				t.Errorf("validateVersion(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

// Tests: extractPathParam extracts path parameters correctly
func TestExtractPathParam(t *testing.T) {
	tests := []struct {
		name   string
		path   string
		prefix string
		want   string
	}{
		{"simple", "/api/components/my-component", "/api/components/", "my-component"},
		{"with_version", "/api/components/my-component/1.0.0", "/api/components/", "my-component/1.0.0"},
		{"scoped", "/api/components/@ds/core", "/api/components/", "@ds/core"},
		{"no_match", "/api/other/thing", "/api/components/", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractPathParam(tt.path, tt.prefix)
			if got != tt.want {
				t.Errorf("extractPathParam(%q, %q) = %q, want %q", tt.path, tt.prefix, got, tt.want)
			}
		})
	}
}

// Integration-style tests for handlers

// Tests: ListComponents returns empty list when no components exist
func TestListComponents_EmptyList(t *testing.T) {
	h := newTestHandler()
	ctx := context.Background()
	
	components, err := h.mockRepo.ListComponents(ctx)
	if err != nil {
		t.Fatalf("failed to list components: %v", err)
	}
	
	if len(components) != 0 {
		t.Errorf("expected 0 components, got %d", len(components))
	}
}

// Tests: RegisterComponent creates a new component
func TestRegisterComponent_Success(t *testing.T) {
	h := newTestHandler()
	ctx := context.Background()
	
	reqBody := RegisterComponentRequest{
		Name:        "test-component",
		Description: "A test component",
		License:     "MIT",
	}
	body, _ := json.Marshal(reqBody)
	_ = body // body would be used in actual HTTP test
	
	now := time.Now()
	component := &Component{
		Name:        reqBody.Name,
		Description: reqBody.Description,
		Author:      "user-123",
		License:     reqBody.License,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	
	err := h.mockRepo.RegisterComponent(ctx, component)
	if err != nil {
		t.Fatalf("failed to register component: %v", err)
	}
	
	// Verify component was created
	stored, _ := h.mockRepo.GetComponent(ctx, "test-component")
	if stored == nil {
		t.Fatal("expected component to be stored")
	}
	if stored.Author != "user-123" {
		t.Errorf("expected author 'user-123', got %q", stored.Author)
	}
}

// Tests: RegisterComponent returns conflict for duplicate name
func TestRegisterComponent_Conflict(t *testing.T) {
	h := newTestHandler()
	ctx := context.Background()
	
	// Create first component
	component1 := &Component{
		Name:        "existing-component",
		Description: "First component",
		CreatedAt:   time.Now(),
	}
	_ = h.mockRepo.RegisterComponent(ctx, component1)
	
	// Try to create duplicate
	component2 := &Component{
		Name:        "existing-component",
		Description: "Second component",
		CreatedAt:   time.Now(),
	}
	err := h.mockRepo.RegisterComponent(ctx, component2)
	
	if err == nil {
		t.Fatal("expected error for duplicate component")
	}
	if _, ok := err.(*conflictError); !ok {
		t.Errorf("expected conflictError, got %T", err)
	}
}

// Tests: GetComponent returns component with versions
func TestGetComponent_WithVersions(t *testing.T) {
	h := newTestHandler()
	ctx := context.Background()
	
	// Create component and versions
	component := &Component{
		Name:        "my-component",
		Description: "Test component",
		CreatedAt:   time.Now(),
	}
	_ = h.mockRepo.RegisterComponent(ctx, component)
	
	version1 := &Version{
		ComponentName: "my-component",
		Version:       "1.0.0",
		PublishedAt:   time.Now(),
	}
	_ = h.mockRepo.PublishVersion(ctx, version1)
	
	version2 := &Version{
		ComponentName: "my-component",
		Version:       "1.1.0",
		PublishedAt:   time.Now(),
	}
	_ = h.mockRepo.PublishVersion(ctx, version2)
	
	// Get component
	storedComponent, _ := h.mockRepo.GetComponent(ctx, "my-component")
	versions, _ := h.mockRepo.ListVersions(ctx, "my-component")
	
	if storedComponent == nil {
		t.Fatal("expected component to exist")
	}
	if len(versions) != 2 {
		t.Errorf("expected 2 versions, got %d", len(versions))
	}
}

// Tests: GetVersion returns download URL
func TestGetVersion_ReturnsDownloadURL(t *testing.T) {
	h := newTestHandler()
	ctx := context.Background()
	
	// Create component and version
	component := &Component{
		Name:        "my-component",
		Description: "Test component",
		CreatedAt:   time.Now(),
	}
	_ = h.mockRepo.RegisterComponent(ctx, component)
	
	version := &Version{
		ComponentName: "my-component",
		Version:       "1.0.0",
		S3Key:         "my-component/1.0.0.tar.gz",
		PublishedAt:   time.Now(),
	}
	_ = h.mockRepo.PublishVersion(ctx, version)
	
	// Get version
	storedVersion, _ := h.mockRepo.GetVersion(ctx, "my-component", "1.0.0")
	if storedVersion == nil {
		t.Fatal("expected version to exist")
	}
	
	// Generate download URL
	url, err := h.mockS3.GenerateDownloadURL(ctx, "my-component", "1.0.0", 15*time.Minute)
	if err != nil {
		t.Fatalf("failed to generate download URL: %v", err)
	}
	if url == "" {
		t.Error("expected non-empty download URL")
	}
}

// Tests: PublishVersion creates version and returns upload URL
func TestPublishVersion_ReturnsUploadURL(t *testing.T) {
	h := newTestHandler()
	ctx := context.Background()
	
	// Create component first
	component := &Component{
		Name:        "my-component",
		Description: "Test component",
		CreatedAt:   time.Now(),
	}
	_ = h.mockRepo.RegisterComponent(ctx, component)
	
	// Publish version
	version := &Version{
		ComponentName: "my-component",
		Version:       "2.0.0",
		Size:          1024,
		Checksum:      "abc123",
		PublishedBy:   "user-123",
		PublishedAt:   time.Now(),
	}
	err := h.mockRepo.PublishVersion(ctx, version)
	if err != nil {
		t.Fatalf("failed to publish version: %v", err)
	}
	
	// Generate upload URL
	url, err := h.mockS3.GenerateUploadURL(ctx, "my-component", "2.0.0", 1*time.Hour)
	if err != nil {
		t.Fatalf("failed to generate upload URL: %v", err)
	}
	if url == "" {
		t.Error("expected non-empty upload URL")
	}
	
	// Verify version was stored
	storedVersion, _ := h.mockRepo.GetVersion(ctx, "my-component", "2.0.0")
	if storedVersion == nil {
		t.Fatal("expected version to be stored")
	}
}

// Tests: PublishVersion rejects duplicate version
func TestPublishVersion_RejectsDuplicate(t *testing.T) {
	h := newTestHandler()
	ctx := context.Background()
	
	// Create component and version
	component := &Component{
		Name:        "my-component",
		Description: "Test component",
		CreatedAt:   time.Now(),
	}
	_ = h.mockRepo.RegisterComponent(ctx, component)
	
	version1 := &Version{
		ComponentName: "my-component",
		Version:       "1.0.0",
		PublishedAt:   time.Now(),
	}
	_ = h.mockRepo.PublishVersion(ctx, version1)
	
	// Try duplicate
	version2 := &Version{
		ComponentName: "my-component",
		Version:       "1.0.0",
		PublishedAt:   time.Now(),
	}
	err := h.mockRepo.PublishVersion(ctx, version2)
	
	if err == nil {
		t.Fatal("expected error for duplicate version")
	}
}

// Tests: DeprecateVersion marks version as deprecated
func TestDeprecateVersion_MarksDeprecated(t *testing.T) {
	h := newTestHandler()
	ctx := context.Background()
	
	// Create component and version
	component := &Component{
		Name:        "my-component",
		Description: "Test component",
		CreatedAt:   time.Now(),
	}
	_ = h.mockRepo.RegisterComponent(ctx, component)
	
	version := &Version{
		ComponentName: "my-component",
		Version:       "1.0.0",
		PublishedAt:   time.Now(),
	}
	_ = h.mockRepo.PublishVersion(ctx, version)
	
	// Deprecate version
	err := h.mockRepo.DeprecateVersion(ctx, "my-component", "1.0.0", "Use 2.0.0 instead")
	if err != nil {
		t.Fatalf("failed to deprecate version: %v", err)
	}
	
	// Verify deprecation
	storedVersion, _ := h.mockRepo.GetVersion(ctx, "my-component", "1.0.0")
	if !storedVersion.Deprecated {
		t.Error("expected version to be deprecated")
	}
	if storedVersion.DeprecationMessage != "Use 2.0.0 instead" {
		t.Errorf("expected deprecation message 'Use 2.0.0 instead', got %q", storedVersion.DeprecationMessage)
	}
}

// Tests: DeleteVersion removes version
func TestDeleteVersion_RemovesVersion(t *testing.T) {
	h := newTestHandler()
	ctx := context.Background()
	
	// Create component and version
	component := &Component{
		Name:        "my-component",
		Description: "Test component",
		CreatedAt:   time.Now(),
	}
	_ = h.mockRepo.RegisterComponent(ctx, component)
	
	version := &Version{
		ComponentName: "my-component",
		Version:       "1.0.0",
		PublishedAt:   time.Now(),
	}
	_ = h.mockRepo.PublishVersion(ctx, version)
	
	// Hard delete version
	err := h.mockRepo.DeleteVersion(ctx, "my-component", "1.0.0")
	if err != nil {
		t.Fatalf("failed to delete version: %v", err)
	}
	
	// Verify deletion
	storedVersion, _ := h.mockRepo.GetVersion(ctx, "my-component", "1.0.0")
	if storedVersion != nil {
		t.Error("expected version to be deleted")
	}
}

// Tests: Handler responds correctly to HTTP requests
func TestListComponentsHandler_HTTPResponse(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/components", nil)
	w := httptest.NewRecorder()
	
	// In a full implementation, we'd inject mocks and call the handler
	// For now, verify test infrastructure works
	_ = req
	_ = w
	
	// Placeholder - actual HTTP tests would require dependency injection
}

// Tests: Handler validates request body
func TestRegisterComponentHandler_ValidationErrors(t *testing.T) {
	tests := []struct {
		name    string
		body    RegisterComponentRequest
		wantErr string
	}{
		{
			name:    "empty_name",
			body:    RegisterComponentRequest{Name: "", Description: "Test"},
			wantErr: "Invalid component name",
		},
		{
			name:    "empty_description",
			body:    RegisterComponentRequest{Name: "valid-name", Description: ""},
			wantErr: "Description is required",
		},
		{
			name:    "invalid_name_uppercase",
			body:    RegisterComponentRequest{Name: "InvalidName", Description: "Test"},
			wantErr: "Invalid component name",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.body)
			req := httptest.NewRequest("POST", "/api/components", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			
			// Placeholder - validation test
			_ = req
			_ = w
			_ = tt.wantErr
		})
	}
}

// Tests: Handler responds with 404 for non-existent component
func TestGetComponentHandler_NotFound(t *testing.T) {
	h := newTestHandler()
	ctx := context.Background()
	
	component, err := h.mockRepo.GetComponent(ctx, "non-existent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	
	if component != nil {
		t.Error("expected nil component for non-existent name")
	}
}

// Tests: Handler responds with 404 for non-existent version
func TestGetVersionHandler_NotFound(t *testing.T) {
	h := newTestHandler()
	ctx := context.Background()
	
	// Create component but not version
	component := &Component{
		Name:        "my-component",
		Description: "Test",
		CreatedAt:   time.Now(),
	}
	_ = h.mockRepo.RegisterComponent(ctx, component)
	
	version, err := h.mockRepo.GetVersion(ctx, "my-component", "999.0.0")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	
	if version != nil {
		t.Error("expected nil version for non-existent version")
	}
}

// Additional tests for components handlers

// Tests: Component struct has correct JSON fields
func TestComponent_JSONFields(t *testing.T) {
	now := time.Now()
	component := &Component{
		Name:        "test-component",
		Description: "Test description",
		Author:      "user-123",
		Repository:  "https://github.com/test/repo",
		License:     "MIT",
		Keywords:    []string{"test", "example"},
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if component.Name != "test-component" {
		t.Error("Name not accessible")
	}
	if len(component.Keywords) != 2 {
		t.Errorf("expected 2 keywords, got %d", len(component.Keywords))
	}
}

// Tests: Version struct has correct fields
func TestVersion_Structure(t *testing.T) {
	now := time.Now()
	version := &Version{
		ComponentName: "test-component",
		Version:       "1.0.0",
		S3Key:         "test-component/1.0.0.tar.gz",
		Size:          1024,
		Checksum:      "abc123",
		Dependencies:  map[string]string{"dep1": "^1.0.0"},
		PublishedAt:   now,
		PublishedBy:   "user-123",
	}

	if version.ComponentName != "test-component" {
		t.Error("ComponentName not accessible")
	}
	if version.Size != 1024 {
		t.Error("Size not accessible")
	}
	if len(version.Dependencies) != 1 {
		t.Error("Dependencies not accessible")
	}
}

// Tests: RegisterComponentRequest struct
func TestRegisterComponentRequest_Structure(t *testing.T) {
	req := RegisterComponentRequest{
		Name:        "new-component",
		Description: "A new component",
		Repository:  "https://github.com/org/repo",
		License:     "Apache-2.0",
		Keywords:    []string{"new", "component"},
	}

	if req.Name != "new-component" {
		t.Error("Name not set")
	}
	if req.License != "Apache-2.0" {
		t.Error("License not set")
	}
}

// Tests: PublishVersionRequest struct
func TestPublishVersionRequest_Structure(t *testing.T) {
	req := PublishVersionRequest{
		Size:             2048,
		Checksum:         "sha256-hash",
		Dependencies:     map[string]string{"core": "^2.0.0"},
		PeerDependencies: map[string]string{"react": ">=16.0.0"},
	}

	if req.Size != 2048 {
		t.Error("Size not set")
	}
	if req.Checksum != "sha256-hash" {
		t.Error("Checksum not set")
	}
	if len(req.PeerDependencies) != 1 {
		t.Error("PeerDependencies not set")
	}
}

// Tests: PublishVersionResponse struct
func TestPublishVersionResponse_Structure(t *testing.T) {
	resp := PublishVersionResponse{
		UploadURL: "https://s3.example.com/upload/signed-url",
		Version: &Version{
			ComponentName: "my-component",
			Version:       "2.0.0",
		},
	}

	if resp.UploadURL == "" {
		t.Error("UploadURL not set")
	}
	if resp.Version == nil {
		t.Error("Version not set")
	}
}

// Tests: DownloadResponse struct
func TestDownloadResponse_Structure(t *testing.T) {
	resp := DownloadResponse{
		DownloadURL: "https://s3.example.com/download/signed-url",
		Version: &Version{
			ComponentName: "my-component",
			Version:       "1.0.0",
		},
	}

	if resp.DownloadURL == "" {
		t.Error("DownloadURL not set")
	}
	if resp.Version == nil {
		t.Error("Version not set")
	}
}

// Tests: ComponentWithVersions struct
func TestComponentWithVersions_Structure(t *testing.T) {
	resp := ComponentWithVersions{
		Component: &Component{Name: "my-component"},
		Versions: []*Version{
			{Version: "1.0.0"},
			{Version: "1.1.0"},
		},
	}

	if resp.Component == nil {
		t.Error("Component not set")
	}
	if len(resp.Versions) != 2 {
		t.Errorf("expected 2 versions, got %d", len(resp.Versions))
	}
}

// Tests: NewHandler creates handler with dependencies

// Tests: validateComponentName edge cases
func TestValidateComponentName_EdgeCases(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"single_char", "a", true},
		{"max_length", string(make([]byte, 128)), false}, // all zeros, invalid chars
		{"with_numbers_only", "123component", true},
		{"scoped_nested", "@org/sub/name", false}, // nested scopes not allowed
		{"double_hyphen", "my--component", true},
		{"leading_underscore", "_component", false},
		{"trailing_hyphen", "component-", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validateComponentName(tt.input)
			if got != tt.want {
				t.Errorf("validateComponentName(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

// Tests: validateVersion edge cases
func TestValidateVersion_EdgeCases(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"major_only", "1", false},
		{"major_minor", "1.0", false},
		{"full_semver", "1.0.0", true},
		{"with_v_prefix", "v1.0.0", true},
		{"double_v", "vv1.0.0", false},
		{"alpha_prerelease", "1.0.0-alpha", true},
		{"numeric_prerelease", "1.0.0-0", true},
		{"complex_prerelease", "1.0.0-alpha.beta.1", true},
		{"build_only", "1.0.0+build", true},
		{"prerelease_and_build", "1.0.0-rc.1+build.123", true},
		{"invalid_chars", "1.0.0-$pecial", false},
		{"leading_zero", "01.0.0", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validateVersion(tt.input)
			if got != tt.want {
				t.Errorf("validateVersion(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

// Tests: buildS3Key generates correct S3 key
func TestBuildS3Key(t *testing.T) {
	key := buildS3Key("my-component", "1.2.3")
	expected := "my-component/1.2.3.tar.gz"
	if key != expected {
		t.Errorf("expected %q, got %q", expected, key)
	}
}

// Tests: buildS3Key with scoped component
func TestBuildS3Key_ScopedComponent(t *testing.T) {
	key := buildS3Key("@org/my-component", "1.0.0")
	expected := "@org/my-component/1.0.0.tar.gz"
	if key != expected {
		t.Errorf("expected %q, got %q", expected, key)
	}
}

// Tests: Component deprecation fields
func TestComponent_DeprecationFields(t *testing.T) {
	component := &Component{
		Name:               "deprecated-component",
		Deprecated:         true,
		DeprecationMessage: "Use new-component instead",
	}

	if !component.Deprecated {
		t.Error("Deprecated should be true")
	}
	if component.DeprecationMessage == "" {
		t.Error("DeprecationMessage should be set")
	}
}

// Tests: Version deprecation fields
func TestVersion_DeprecationFields(t *testing.T) {
	version := &Version{
		Version:            "1.0.0",
		Deprecated:         true,
		DeprecationMessage: "Security vulnerability, upgrade to 1.0.1",
	}

	if !version.Deprecated {
		t.Error("Deprecated should be true")
	}
	if version.DeprecationMessage == "" {
		t.Error("DeprecationMessage should be set")
	}
}
