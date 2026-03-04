// Package components provides component registry management for the DS App platform.
// Components are reusable modules that can be published, versioned, and downloaded.
//
// Key types:
//   - Component: A registered component with metadata
//   - Version: A published version of a component
//
// Requirements implemented:
//   - Component registration and versioning
//   - S3-based artifact storage with presigned URLs
package components

import "time"

// Component represents a registered component in the registry.
// Components are stored with PK = "COMPONENT#{name}" and SK = "METADATA"
type Component struct {
	// Name is the unique identifier for the component (e.g., "ds-button", "@ds/core")
	Name string `json:"name" dynamodbav:"name"`

	// Description is a human-readable description of the component
	Description string `json:"description" dynamodbav:"description"`

	// Author is the user/org that owns this component
	Author string `json:"author" dynamodbav:"author"`

	// Repository is the source code repository URL (optional)
	Repository string `json:"repository,omitempty" dynamodbav:"repository,omitempty"`

	// License is the SPDX license identifier (e.g., "MIT", "Apache-2.0")
	License string `json:"license,omitempty" dynamodbav:"license,omitempty"`

	// Keywords for searchability
	Keywords []string `json:"keywords,omitempty" dynamodbav:"keywords,omitempty"`

	// LatestVersion is the most recently published version
	LatestVersion string `json:"latest_version,omitempty" dynamodbav:"latest_version,omitempty"`

	// CreatedAt is when the component was first registered
	CreatedAt time.Time `json:"created_at" dynamodbav:"created_at"`

	// UpdatedAt is when the component metadata was last modified
	UpdatedAt time.Time `json:"updated_at" dynamodbav:"updated_at"`

	// Deprecated indicates if the component is deprecated
	Deprecated bool `json:"deprecated,omitempty" dynamodbav:"deprecated,omitempty"`

	// DeprecationMessage explains why the component is deprecated
	DeprecationMessage string `json:"deprecation_message,omitempty" dynamodbav:"deprecation_message,omitempty"`
}

// Version represents a published version of a component.
// Versions are stored with PK = "COMPONENT#{name}" and SK = "VERSION#{version}"
type Version struct {
	// ComponentName is the parent component's name
	ComponentName string `json:"component_name" dynamodbav:"component_name"`

	// Version is the semver version string (e.g., "1.2.3")
	Version string `json:"version" dynamodbav:"version"`

	// S3Key is the S3 object key for the artifact (e.g., "ds-button/1.2.3.tar.gz")
	S3Key string `json:"s3_key" dynamodbav:"s3_key"`

	// Size is the artifact size in bytes
	Size int64 `json:"size" dynamodbav:"size"`

	// Checksum is the SHA256 hash of the artifact
	Checksum string `json:"checksum" dynamodbav:"checksum"`

	// Dependencies lists required dependencies with version constraints
	Dependencies map[string]string `json:"dependencies,omitempty" dynamodbav:"dependencies,omitempty"`

	// PeerDependencies lists peer dependencies with version constraints
	PeerDependencies map[string]string `json:"peer_dependencies,omitempty" dynamodbav:"peer_dependencies,omitempty"`

	// PublishedAt is when this version was published
	PublishedAt time.Time `json:"published_at" dynamodbav:"published_at"`

	// PublishedBy is the user ID who published this version
	PublishedBy string `json:"published_by" dynamodbav:"published_by"`

	// Deprecated indicates if this specific version is deprecated
	Deprecated bool `json:"deprecated,omitempty" dynamodbav:"deprecated,omitempty"`

	// DeprecationMessage explains why this version is deprecated
	DeprecationMessage string `json:"deprecation_message,omitempty" dynamodbav:"deprecation_message,omitempty"`
}

// RegisterComponentRequest is the request body for POST /api/components
type RegisterComponentRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Repository  string   `json:"repository,omitempty"`
	License     string   `json:"license,omitempty"`
	Keywords    []string `json:"keywords,omitempty"`
}

// PublishVersionRequest is the request body for PUT /api/components/{name}/{version}
type PublishVersionRequest struct {
	// Size is the expected artifact size in bytes
	Size int64 `json:"size"`

	// Checksum is the SHA256 hash of the artifact
	Checksum string `json:"checksum"`

	// Dependencies lists required dependencies with version constraints
	Dependencies map[string]string `json:"dependencies,omitempty"`

	// PeerDependencies lists peer dependencies with version constraints
	PeerDependencies map[string]string `json:"peer_dependencies,omitempty"`
}

// PublishVersionResponse is returned by PUT /api/components/{name}/{version}
type PublishVersionResponse struct {
	// UploadURL is the presigned S3 URL for uploading the artifact
	UploadURL string `json:"upload_url"`

	// Version contains the version metadata
	Version *Version `json:"version"`
}

// DownloadResponse is returned by GET /api/components/{name}/{version}
type DownloadResponse struct {
	// DownloadURL is the presigned S3 URL for downloading the artifact
	DownloadURL string `json:"download_url"`

	// Version contains the version metadata
	Version *Version `json:"version"`
}

// ComponentWithVersions is returned by GET /api/components/{name}
type ComponentWithVersions struct {
	Component *Component `json:"component"`
	Versions  []*Version `json:"versions"`
}
