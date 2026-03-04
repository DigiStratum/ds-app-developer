package components

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/DigiStratum/ds-app-developer/backend/internal/api"
	"github.com/DigiStratum/ds-app-developer/backend/internal/auth"
)

// Handler provides HTTP handlers for component operations.
type Handler struct {
	repo *Repository
	s3   *S3Service
}

// NewHandler creates a new component handler.
func NewHandler(repo *Repository, s3 *S3Service) *Handler {
	return &Handler{
		repo: repo,
		s3:   s3,
	}
}

// componentNameRegex validates component names.
// Allows alphanumeric, hyphens, underscores, and scoped names (@scope/name)
var componentNameRegex = regexp.MustCompile(`^(@[a-z0-9-]+/)?[a-z0-9][a-z0-9-_.]*$`)

// semverRegex validates semantic version strings
var semverRegex = regexp.MustCompile(`^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$`)

// validateComponentName checks if the component name is valid.
func validateComponentName(name string) bool {
	if len(name) < 1 || len(name) > 128 {
		return false
	}
	return componentNameRegex.MatchString(name)
}

// validateVersion checks if the version string is valid.
func validateVersion(version string) bool {
	if len(version) < 1 || len(version) > 64 {
		return false
	}
	return semverRegex.MatchString(version)
}

// ListComponentsHandler handles GET /api/components
// Returns a list of all registered components.
func (h *Handler) ListComponentsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	components, err := h.repo.ListComponents(ctx)
	if err != nil {
		slog.Error("failed to list components", "error", err)
		api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list components")
		return
	}

	api.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"components": components,
		"count":      len(components),
	})
}

// RegisterComponentHandler handles POST /api/components
// Registers a new component in the registry.
func (h *Handler) RegisterComponentHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Require authentication
	user := auth.GetUser(ctx)
	if user == nil {
		api.WriteError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req RegisterComponentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON body")
		return
	}

	// Validate name
	if !validateComponentName(req.Name) {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid component name")
		return
	}

	// Validate description
	if strings.TrimSpace(req.Description) == "" {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Description is required")
		return
	}

	now := time.Now()
	component := &Component{
		Name:        req.Name,
		Description: req.Description,
		Author:      user.ID,
		Repository:  req.Repository,
		License:     req.License,
		Keywords:    req.Keywords,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := h.repo.RegisterComponent(ctx, component); err != nil {
		if strings.Contains(err.Error(), "already exists") {
			api.WriteError(w, r, http.StatusConflict, "CONFLICT", "Component already exists")
			return
		}
		slog.Error("failed to register component", "error", err, "name", req.Name)
		api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to register component")
		return
	}

	slog.Info("component registered", "name", component.Name, "author", user.ID)
	api.WriteJSON(w, http.StatusCreated, component)
}

// GetComponentHandler handles GET /api/components/{name} and GET /api/components/{name}/{version}
// For {name} only: returns component metadata and versions.
// For {name}/{version}: delegates to GetVersionHandler for presigned download URL.
func (h *Handler) GetComponentHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Extract name (and possibly version) from path (handles scoped packages like @scope/name)
	path := extractPathParam(r.URL.Path, "/api/components/")
	name, version := parseScopedNameAndVersion(path)
	
	// If version is present, delegate to GetVersionHandler
	if version != "" {
		h.GetVersionHandler(w, r)
		return
	}
	
	// If no version in path, parseScopedNameAndVersion returns full path as name
	if name == "" {
		name = path
	}

	if name == "" {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Component name is required")
		return
	}

	component, err := h.repo.GetComponent(ctx, name)
	if err != nil {
		slog.Error("failed to get component", "error", err, "name", name)
		api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get component")
		return
	}

	if component == nil {
		api.WriteError(w, r, http.StatusNotFound, "NOT_FOUND", "Component not found")
		return
	}

	// Also fetch versions
	versions, err := h.repo.ListVersions(ctx, name)
	if err != nil {
		slog.Error("failed to list versions", "error", err, "name", name)
		api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get versions")
		return
	}

	api.WriteJSON(w, http.StatusOK, ComponentWithVersions{
		Component: component,
		Versions:  versions,
	})
}

// GetVersionHandler handles GET /api/components/{name}/{version}
// Returns a presigned download URL for the component artifact.
func (h *Handler) GetVersionHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Extract name and version from path (handles scoped packages like @scope/name)
	path := extractPathParam(r.URL.Path, "/api/components/")
	name, version := parseScopedNameAndVersion(path)
	if name == "" || version == "" {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Component name and version are required")
		return
	}

	if !validateComponentName(name) {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid component name")
		return
	}

	if !validateVersion(version) {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid version format")
		return
	}

	// Get version metadata
	ver, err := h.repo.GetVersion(ctx, name, version)
	if err != nil {
		slog.Error("failed to get version", "error", err, "name", name, "version", version)
		api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get version")
		return
	}

	if ver == nil {
		api.WriteError(w, r, http.StatusNotFound, "NOT_FOUND", "Version not found")
		return
	}

	// Generate presigned download URL (valid for 15 minutes)
	downloadURL, err := h.s3.GenerateDownloadURL(ctx, name, version, 15*time.Minute)
	if err != nil {
		slog.Error("failed to generate download URL", "error", err, "name", name, "version", version)
		api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate download URL")
		return
	}

	api.WriteJSON(w, http.StatusOK, DownloadResponse{
		DownloadURL: downloadURL,
		Version:     ver,
	})
}

// PublishVersionHandler handles PUT /api/components/{name}/{version}
// Creates a new version and returns a presigned upload URL.
func (h *Handler) PublishVersionHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Require authentication
	user := auth.GetUser(ctx)
	if user == nil {
		api.WriteError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	// Extract name and version from path (handles scoped packages like @scope/name)
	path := extractPathParam(r.URL.Path, "/api/components/")
	name, version := parseScopedNameAndVersion(path)
	if name == "" || version == "" {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Component name and version are required")
		return
	}

	if !validateComponentName(name) {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid component name")
		return
	}

	if !validateVersion(version) {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid version format")
		return
	}

	// Verify component exists
	component, err := h.repo.GetComponent(ctx, name)
	if err != nil {
		slog.Error("failed to get component", "error", err, "name", name)
		api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get component")
		return
	}

	if component == nil {
		api.WriteError(w, r, http.StatusNotFound, "NOT_FOUND", "Component not found")
		return
	}

	// Parse request body
	var req PublishVersionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteError(w, r, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON body")
		return
	}

	// Validate request
	if req.Size <= 0 {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Size must be positive")
		return
	}

	if req.Checksum == "" {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Checksum is required")
		return
	}

	// Check if version already exists
	existingVersion, err := h.repo.GetVersion(ctx, name, version)
	if err != nil {
		slog.Error("failed to check existing version", "error", err, "name", name, "version", version)
		api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to check version")
		return
	}

	if existingVersion != nil {
		api.WriteError(w, r, http.StatusConflict, "CONFLICT", "Version already exists")
		return
	}

	// Create version record
	now := time.Now()
	ver := &Version{
		ComponentName:    name,
		Version:          version,
		S3Key:            buildS3Key(name, version),
		Size:             req.Size,
		Checksum:         req.Checksum,
		Dependencies:     req.Dependencies,
		PeerDependencies: req.PeerDependencies,
		PublishedAt:      now,
		PublishedBy:      user.ID,
	}

	if err := h.repo.PublishVersion(ctx, ver); err != nil {
		slog.Error("failed to publish version", "error", err, "name", name, "version", version)
		api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to publish version")
		return
	}

	// Generate presigned upload URL (valid for 1 hour)
	uploadURL, err := h.s3.GenerateUploadURL(ctx, name, version, 1*time.Hour)
	if err != nil {
		slog.Error("failed to generate upload URL", "error", err, "name", name, "version", version)
		api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate upload URL")
		return
	}

	slog.Info("version published", "name", name, "version", version, "publisher", user.ID)
	api.WriteJSON(w, http.StatusCreated, PublishVersionResponse{
		UploadURL: uploadURL,
		Version:   ver,
	})
}

// DeleteVersionHandler handles DELETE /api/components/{name}/{version}
// Deprecates or removes a version.
func (h *Handler) DeleteVersionHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Require authentication
	user := auth.GetUser(ctx)
	if user == nil {
		api.WriteError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	// Extract name and version from path (handles scoped packages like @scope/name)
	path := extractPathParam(r.URL.Path, "/api/components/")
	name, version := parseScopedNameAndVersion(path)
	if name == "" || version == "" {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Component name and version are required")
		return
	}

	if !validateComponentName(name) {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid component name")
		return
	}

	if !validateVersion(version) {
		api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid version format")
		return
	}

	// Check if we should deprecate (soft delete) or hard delete
	// Query param ?hard=true triggers hard delete
	hardDelete := r.URL.Query().Get("hard") == "true"

	if hardDelete {
		// Delete from DynamoDB and S3
		if err := h.repo.DeleteVersion(ctx, name, version); err != nil {
			if strings.Contains(err.Error(), "not found") {
				api.WriteError(w, r, http.StatusNotFound, "NOT_FOUND", "Version not found")
				return
			}
			slog.Error("failed to delete version", "error", err, "name", name, "version", version)
			api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete version")
			return
		}

		// Delete S3 artifact
		if err := h.s3.DeleteArtifact(ctx, name, version); err != nil {
			slog.Warn("failed to delete S3 artifact", "error", err, "name", name, "version", version)
			// Continue - DynamoDB record is already deleted
		}

		slog.Info("version hard deleted", "name", name, "version", version, "deletedBy", user.ID)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Soft delete - mark as deprecated
	message := r.URL.Query().Get("message")
	if message == "" {
		message = "This version has been deprecated"
	}

	if err := h.repo.DeprecateVersion(ctx, name, version, message); err != nil {
		if strings.Contains(err.Error(), "not found") {
			api.WriteError(w, r, http.StatusNotFound, "NOT_FOUND", "Version not found")
			return
		}
		slog.Error("failed to deprecate version", "error", err, "name", name, "version", version)
		api.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to deprecate version")
		return
	}

	slog.Info("version deprecated", "name", name, "version", version, "deprecatedBy", user.ID)
	api.WriteJSON(w, http.StatusOK, map[string]string{
		"status":  "deprecated",
		"message": message,
	})
}

// extractPathParam extracts the remaining path after a prefix.
func extractPathParam(path, prefix string) string {
	if strings.HasPrefix(path, prefix) {
		return strings.TrimPrefix(path, prefix)
	}
	return ""
}

// parseScopedNameAndVersion extracts a potentially scoped package name and version from a path.
// Examples:
//   "@scope/name/1.0.0" -> ("@scope/name", "1.0.0")
//   "name/1.0.0" -> ("name", "1.0.0")
//   "@scope/name" -> ("@scope/name", "")
//   "name" -> ("name", "")
func parseScopedNameAndVersion(path string) (name, version string) {
	// Handle scoped packages: @scope/name/version
	if strings.HasPrefix(path, "@") {
		// Find the second slash (after @scope/name)
		firstSlash := strings.Index(path, "/")
		if firstSlash == -1 {
			return path, "" // Just @scope without /name
		}
		// Find the next slash after @scope/
		secondSlash := strings.Index(path[firstSlash+1:], "/")
		if secondSlash == -1 {
			return path, "" // @scope/name without version
		}
		// Adjust index relative to full path
		secondSlash = firstSlash + 1 + secondSlash
		return path[:secondSlash], path[secondSlash+1:]
	}
	
	// Non-scoped packages: name/version
	parts := strings.SplitN(path, "/", 2)
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], parts[1]
}
