// Package components provides the DS App Registry component management API.
//
// The component registry allows users to:
//   - Register new components with metadata
//   - Publish versioned component artifacts to S3
//   - Download component artifacts via presigned URLs
//   - Deprecate or remove component versions
//
// # API Endpoints
//
//	GET    /api/components              - List all registered components
//	POST   /api/components              - Register a new component (auth required)
//	GET    /api/components/{name}       - Get component metadata + versions
//	GET    /api/components/{name}/{ver} - Get presigned download URL for version
//	PUT    /api/components/{name}/{ver} - Publish new version (auth required)
//	DELETE /api/components/{name}/{ver} - Deprecate/remove version (auth required)
//
// # Data Model
//
// Components are stored in DynamoDB with the following key structure:
//   - PK: COMPONENT#{name}
//   - SK: METADATA (for component) or VERSION#{version} (for versions)
//
// Component artifacts are stored in S3 with the following structure:
//   - Key: {component-name}/{version}.tar.gz
//
// # Authentication
//
// Read operations (GET) are public and do not require authentication.
// Write operations (POST, PUT, DELETE) require an authenticated user session.
//
// # Versioning
//
// Component versions follow semantic versioning (semver) format:
//   - MAJOR.MINOR.PATCH (e.g., 1.0.0)
//   - Optional prerelease suffix (e.g., 1.0.0-beta.1)
//   - Optional build metadata (e.g., 1.0.0+build123)
//
// # Example Usage
//
//	// Register a new component
//	POST /api/components
//	{
//	  "name": "my-button",
//	  "description": "A reusable button component",
//	  "license": "MIT"
//	}
//
//	// Publish a version (returns upload URL)
//	PUT /api/components/my-button/1.0.0
//	{
//	  "size": 10240,
//	  "checksum": "sha256:abc123..."
//	}
//
//	// Download a version (returns download URL)
//	GET /api/components/my-button/1.0.0
//	// Response: { "download_url": "https://...", "version": {...} }
package components
