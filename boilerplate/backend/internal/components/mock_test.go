package components

import (
	"context"
	"time"
)

// MockRepository implements ComponentRepository for testing
type MockRepository struct {
	components map[string]*Component
	versions   map[string]map[string]*Version
	
	// Error injection
	registerErr      error
	getComponentErr  error
	listComponentErr error
	updateErr        error
	publishErr       error
	getVersionErr    error
	listVersionErr   error
	deprecateErr     error
	deleteErr        error
}

// NewMockRepository creates a new MockRepository with no components
func NewMockRepository() *MockRepository {
	return &MockRepository{
		components: make(map[string]*Component),
		versions:   make(map[string]map[string]*Version),
	}
}

func (m *MockRepository) RegisterComponent(ctx context.Context, component *Component) error {
	if m.registerErr != nil {
		return m.registerErr
	}
	if _, exists := m.components[component.Name]; exists {
		return &conflictError{name: component.Name}
	}
	m.components[component.Name] = component
	return nil
}

func (m *MockRepository) GetComponent(ctx context.Context, name string) (*Component, error) {
	if m.getComponentErr != nil {
		return nil, m.getComponentErr
	}
	return m.components[name], nil
}

func (m *MockRepository) ListComponents(ctx context.Context) ([]*Component, error) {
	if m.listComponentErr != nil {
		return nil, m.listComponentErr
	}
	var result []*Component
	for _, c := range m.components {
		result = append(result, c)
	}
	return result, nil
}

func (m *MockRepository) UpdateComponent(ctx context.Context, component *Component) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	if _, exists := m.components[component.Name]; !exists {
		return &notFoundError{name: component.Name}
	}
	m.components[component.Name] = component
	return nil
}

func (m *MockRepository) PublishVersion(ctx context.Context, version *Version) error {
	if m.publishErr != nil {
		return m.publishErr
	}
	if m.versions[version.ComponentName] == nil {
		m.versions[version.ComponentName] = make(map[string]*Version)
	}
	if _, exists := m.versions[version.ComponentName][version.Version]; exists {
		return &conflictError{name: version.ComponentName + "@" + version.Version}
	}
	m.versions[version.ComponentName][version.Version] = version
	return nil
}

func (m *MockRepository) GetVersion(ctx context.Context, componentName, version string) (*Version, error) {
	if m.getVersionErr != nil {
		return nil, m.getVersionErr
	}
	if m.versions[componentName] == nil {
		return nil, nil
	}
	return m.versions[componentName][version], nil
}

func (m *MockRepository) ListVersions(ctx context.Context, componentName string) ([]*Version, error) {
	if m.listVersionErr != nil {
		return nil, m.listVersionErr
	}
	var result []*Version
	if m.versions[componentName] != nil {
		for _, v := range m.versions[componentName] {
			result = append(result, v)
		}
	}
	return result, nil
}

func (m *MockRepository) DeprecateVersion(ctx context.Context, componentName, version, message string) error {
	if m.deprecateErr != nil {
		return m.deprecateErr
	}
	if m.versions[componentName] == nil || m.versions[componentName][version] == nil {
		return &notFoundError{name: componentName + "@" + version}
	}
	m.versions[componentName][version].Deprecated = true
	m.versions[componentName][version].DeprecationMessage = message
	return nil
}

func (m *MockRepository) DeleteVersion(ctx context.Context, componentName, version string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	if m.versions[componentName] == nil || m.versions[componentName][version] == nil {
		return &notFoundError{name: componentName + "@" + version}
	}
	delete(m.versions[componentName], version)
	return nil
}

// Test helpers
func (m *MockRepository) AddComponent(c *Component) {
	m.components[c.Name] = c
}

func (m *MockRepository) AddVersion(v *Version) {
	if m.versions[v.ComponentName] == nil {
		m.versions[v.ComponentName] = make(map[string]*Version)
	}
	m.versions[v.ComponentName][v.Version] = v
}

// MockArtifactStore implements ArtifactStore for testing
type MockArtifactStore struct {
	uploadURLErr   error
	downloadURLErr error
	deleteErr      error
	headErr        error
	artifactExists bool
}

func NewMockArtifactStore() *MockArtifactStore {
	return &MockArtifactStore{
		artifactExists: true,
	}
}

func (m *MockArtifactStore) GenerateUploadURL(ctx context.Context, componentName, version string, expiry time.Duration) (string, error) {
	if m.uploadURLErr != nil {
		return "", m.uploadURLErr
	}
	return "https://s3.example.com/upload/" + componentName + "/" + version, nil
}

func (m *MockArtifactStore) GenerateDownloadURL(ctx context.Context, componentName, version string, expiry time.Duration) (string, error) {
	if m.downloadURLErr != nil {
		return "", m.downloadURLErr
	}
	return "https://s3.example.com/download/" + componentName + "/" + version, nil
}

func (m *MockArtifactStore) DeleteArtifact(ctx context.Context, componentName, version string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	return nil
}

func (m *MockArtifactStore) HeadArtifact(ctx context.Context, componentName, version string) (*ArtifactMetadata, error) {
	if m.headErr != nil {
		return nil, m.headErr
	}
	if !m.artifactExists {
		return nil, nil
	}
	return &ArtifactMetadata{
		Size:        1024,
		LastModified: time.Now(),
	}, nil
}

// Ensure mocks implement interfaces
var _ ComponentRepository = (*MockRepository)(nil)
var _ ArtifactStore = (*MockArtifactStore)(nil)

