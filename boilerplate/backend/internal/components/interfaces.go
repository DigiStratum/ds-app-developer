package components

import (
	"context"
	"time"
)

// ComponentRepository defines the interface for component storage operations.
// This interface enables testing without requiring DynamoDB.
type ComponentRepository interface {
	// RegisterComponent creates a new component in the registry.
	// Returns an error if a component with this name already exists.
	RegisterComponent(ctx context.Context, component *Component) error

	// GetComponent retrieves a component by name.
	// Returns nil if the component does not exist.
	GetComponent(ctx context.Context, name string) (*Component, error)

	// ListComponents retrieves all components.
	ListComponents(ctx context.Context) ([]*Component, error)

	// UpdateComponent updates component metadata.
	UpdateComponent(ctx context.Context, component *Component) error

	// PublishVersion stores a new version for a component.
	PublishVersion(ctx context.Context, version *Version) error

	// GetVersion retrieves a specific version of a component.
	GetVersion(ctx context.Context, componentName, version string) (*Version, error)

	// ListVersions retrieves all versions for a component.
	ListVersions(ctx context.Context, componentName string) ([]*Version, error)

	// DeprecateVersion marks a version as deprecated.
	DeprecateVersion(ctx context.Context, componentName, version, message string) error

	// DeleteVersion removes a version from the registry.
	DeleteVersion(ctx context.Context, componentName, version string) error
}

// ArtifactStore defines the interface for component artifact storage (S3).
// This interface enables testing without requiring AWS S3.
type ArtifactStore interface {
	// GenerateUploadURL generates a presigned URL for uploading an artifact.
	GenerateUploadURL(ctx context.Context, componentName, version string, expiry time.Duration) (string, error)

	// GenerateDownloadURL generates a presigned URL for downloading an artifact.
	GenerateDownloadURL(ctx context.Context, componentName, version string, expiry time.Duration) (string, error)

	// DeleteArtifact deletes an artifact from storage.
	DeleteArtifact(ctx context.Context, componentName, version string) error

	// HeadArtifact checks if an artifact exists and returns its metadata.
	HeadArtifact(ctx context.Context, componentName, version string) (*ArtifactMetadata, error)
}

// Ensure Repository implements ComponentRepository
var _ ComponentRepository = (*Repository)(nil)

// Ensure S3Service implements ArtifactStore
var _ ArtifactStore = (*S3Service)(nil)
