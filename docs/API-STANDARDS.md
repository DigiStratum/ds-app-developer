# API Design Standards - DS App Skeleton

> Canonical API conventions for all DigiStratum applications.
> Applications based on ds-app-skeleton inherit these standards.
> Deviations require documented justification.

---

## Table of Contents
1. [Overview](#overview)
2. [RESTful Conventions](#restful-conventions)
3. [Error Response Format](#error-response-format)
4. [Pagination Patterns](#pagination-patterns)
5. [Filtering and Sorting](#filtering-and-sorting)
6. [Request Validation](#request-validation)
7. [OpenAPI Specification](#openapi-specification)
8. [Security Considerations](#security-considerations)
9. [Examples](#examples)

---

## Overview

### Design Principles

1. **RESTful** — Resources are nouns, HTTP methods are verbs
2. **Consistent** — Same patterns across all endpoints
3. **Predictable** — Clients know what to expect
4. **Secure** — Input validation, tenant isolation, proper error handling
5. **Documented** — OpenAPI spec as source of truth

### Base URL Structure

```
Production:  https://api.{app}.digistratum.com/api/v1
Staging:     https://api-staging.{app}.digistratum.com/api/v1
Local:       http://localhost:8080/api/v1
```

All API routes are prefixed with `/api` and optionally versioned with `/v1`, `/v2`, etc.

---

## RESTful Conventions

### HTTP Methods

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| `GET` | Retrieve resource(s) | Yes | Yes |
| `POST` | Create new resource | No | No |
| `PUT` | Replace entire resource | Yes | No |
| `PATCH` | Partial update | Yes | No |
| `DELETE` | Remove resource | Yes | No |

### URL Structure

**Pattern:** `/api/{version}/{resource}/{id}/{sub-resource}`

```
# Collection
GET    /api/v1/users              # List users
POST   /api/v1/users              # Create user

# Single resource
GET    /api/v1/users/{id}         # Get user by ID
PUT    /api/v1/users/{id}         # Replace user
PATCH  /api/v1/users/{id}         # Update user
DELETE /api/v1/users/{id}         # Delete user

# Sub-resources
GET    /api/v1/users/{id}/roles   # Get user's roles
POST   /api/v1/users/{id}/roles   # Add role to user
DELETE /api/v1/users/{id}/roles/{role_id}  # Remove role

# Actions (when REST verbs don't fit)
POST   /api/v1/users/{id}/activate     # Non-CRUD action
POST   /api/v1/users/{id}/deactivate
```

### Naming Conventions

| Convention | Example |
|------------|---------|
| Resources are **plural nouns** | `/users`, `/projects`, `/tenants` |
| Use **kebab-case** for multi-word | `/project-members`, `/api-keys` |
| Use **snake_case** for JSON fields | `created_at`, `tenant_id`, `user_name` |
| IDs are **path parameters** | `/users/{user_id}` |
| Filters are **query parameters** | `?status=active&sort=-created_at` |

### Response Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200 OK` | Success | GET, PUT, PATCH returns data |
| `201 Created` | Resource created | POST success, include `Location` header |
| `204 No Content` | Success, no body | DELETE success |
| `400 Bad Request` | Invalid input | Validation errors |
| `401 Unauthorized` | No/invalid auth | Missing or expired token |
| `403 Forbidden` | Insufficient permissions | Valid auth, but not allowed |
| `404 Not Found` | Resource doesn't exist | GET/PUT/PATCH/DELETE on missing resource |
| `409 Conflict` | Resource conflict | Duplicate key, version mismatch |
| `422 Unprocessable Entity` | Semantic error | Valid syntax but business rule violation |
| `429 Too Many Requests` | Rate limited | Include `Retry-After` header |
| `500 Internal Server Error` | Server error | Unexpected failure |
| `503 Service Unavailable` | Temporary outage | Maintenance, overload |

### Required Headers

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Authorization` | Request | Bearer token for auth |
| `X-Tenant-ID` | Request | Tenant context [FR-TENANT-004] |
| `Content-Type` | Both | `application/json` for JSON bodies |
| `X-Request-ID` | Response | Correlation ID for tracing [NFR-MON-004] |

---

## Error Response Format

All errors follow a standard structure [NFR-SEC-004]:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "email": "must be a valid email address",
      "name": "is required"
    },
    "request_id": "req-abc123-xyz789"
  }
}
```

### Error Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `error` | object | Yes | Error container |
| `error.code` | string | Yes | Machine-readable error code |
| `error.message` | string | Yes | Human-readable message |
| `error.details` | object | No | Field-specific errors or additional context |
| `error.request_id` | string | No | Request correlation ID for debugging |

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Valid auth but insufficient permissions |
| `NOT_FOUND` | 404 | Requested resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Request failed validation |
| `TENANT_REQUIRED` | 400 | Missing X-Tenant-ID header |
| `CONFLICT` | 409 | Resource already exists or version conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Go Implementation

```go
// Standard error response format [NFR-SEC-004]
type ErrorResponse struct {
    Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
    Code      string            `json:"code"`
    Message   string            `json:"message"`
    Details   map[string]string `json:"details,omitempty"`
    RequestID string            `json:"request_id,omitempty"`
}

// WriteError writes a standard error response
func WriteError(w http.ResponseWriter, status int, code, message string) {
    WriteJSON(w, status, ErrorResponse{
        Error: ErrorDetail{
            Code:    code,
            Message: message,
        },
    })
}

// WriteErrorWithDetails writes an error with field-level details
func WriteErrorWithDetails(w http.ResponseWriter, status int, code, message string, details map[string]string) {
    WriteJSON(w, status, ErrorResponse{
        Error: ErrorDetail{
            Code:    code,
            Message: message,
            Details: details,
        },
    })
}
```

---

## Pagination Patterns

### Cursor-Based Pagination (Recommended)

For DynamoDB-backed APIs, use cursor-based pagination for efficient, consistent results.

**Request:**
```
GET /api/v1/users?limit=20&cursor=eyJpZCI6InVzZXItMTIzIn0=
```

**Response:**
```json
{
  "data": [
    { "id": "user-124", "name": "Alice" },
    { "id": "user-125", "name": "Bob" }
  ],
  "pagination": {
    "limit": 20,
    "has_more": true,
    "next_cursor": "eyJpZCI6InVzZXItMTI1In0="
  }
}
```

### Pagination Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 20 | 100 | Items per page |
| `cursor` | string | null | — | Opaque cursor for next page |

### Pagination Response

| Field | Type | Description |
|-------|------|-------------|
| `pagination.limit` | integer | Requested limit |
| `pagination.has_more` | boolean | More items available |
| `pagination.next_cursor` | string | Cursor for next page (omit if no more) |

### Go Implementation

```go
// PaginationParams holds parsed pagination parameters
type PaginationParams struct {
    Limit  int
    Cursor string
}

// PaginationResponse holds pagination metadata
type PaginationResponse struct {
    Limit      int    `json:"limit"`
    HasMore    bool   `json:"has_more"`
    NextCursor string `json:"next_cursor,omitempty"`
}

// ListResponse wraps paginated data
type ListResponse[T any] struct {
    Data       []T                `json:"data"`
    Pagination PaginationResponse `json:"pagination"`
}

// ParsePagination extracts pagination params from request
func ParsePagination(r *http.Request) PaginationParams {
    limit := 20 // Default
    if l := r.URL.Query().Get("limit"); l != "" {
        if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
            limit = parsed
        }
    }
    return PaginationParams{
        Limit:  limit,
        Cursor: r.URL.Query().Get("cursor"),
    }
}
```

### Offset-Based Pagination (Alternative)

For simpler use cases or when total count is needed:

**Request:**
```
GET /api/v1/users?page=2&per_page=20
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

> ⚠️ **Note:** Offset pagination is less efficient with DynamoDB. Use cursor-based pagination for large datasets.

---

## Filtering and Sorting

### Filter Query Parameters

Use query parameters for filtering collections:

```
GET /api/v1/users?status=active&role=admin&created_after=2024-01-01
```

### Filter Conventions

| Pattern | Example | Description |
|---------|---------|-------------|
| Exact match | `?status=active` | Field equals value |
| Multiple values | `?status=active,pending` | OR condition |
| Range (greater than) | `?created_after=2024-01-01` | Date/number > value |
| Range (less than) | `?created_before=2024-12-31` | Date/number < value |
| Search | `?q=search+term` | Full-text search |
| Nested field | `?metadata.region=us-west` | Dot notation for nested |

### Sorting

Use `sort` parameter with field name. Prefix with `-` for descending:

```
GET /api/v1/users?sort=name          # Ascending by name
GET /api/v1/users?sort=-created_at   # Descending by created_at
GET /api/v1/users?sort=-created_at,name  # Multiple sort fields
```

### Go Implementation

```go
// FilterParams holds parsed filter parameters
type FilterParams struct {
    Status    string
    CreatedAfter time.Time
    CreatedBefore time.Time
    Search    string
    SortField string
    SortDesc  bool
}

// ParseFilters extracts filter params from request
func ParseFilters(r *http.Request) FilterParams {
    q := r.URL.Query()
    params := FilterParams{
        Status: q.Get("status"),
        Search: q.Get("q"),
    }
    
    // Parse dates
    if after := q.Get("created_after"); after != "" {
        if t, err := time.Parse(time.RFC3339, after); err == nil {
            params.CreatedAfter = t
        }
    }
    
    // Parse sort
    if sort := q.Get("sort"); sort != "" {
        if strings.HasPrefix(sort, "-") {
            params.SortField = strings.TrimPrefix(sort, "-")
            params.SortDesc = true
        } else {
            params.SortField = sort
        }
    }
    
    return params
}
```

---

## Request Validation

All incoming requests must be validated [NFR-SEC-004].

### Validation Rules

1. **Type validation** — Correct data types for all fields
2. **Required fields** — Present and non-empty
3. **Format validation** — Email, UUID, date formats
4. **Range validation** — Min/max for numbers and strings
5. **Business rules** — Domain-specific constraints

### Go Validation Pattern

```go
// CreateUserRequest defines the request body for user creation
type CreateUserRequest struct {
    Name  string `json:"name" validate:"required,min=1,max=255"`
    Email string `json:"email" validate:"required,email"`
    Role  string `json:"role" validate:"required,oneof=admin user viewer"`
}

// Validate validates the request and returns field errors
func (r *CreateUserRequest) Validate() map[string]string {
    errors := make(map[string]string)
    
    if strings.TrimSpace(r.Name) == "" {
        errors["name"] = "is required"
    } else if len(r.Name) > 255 {
        errors["name"] = "must be 255 characters or less"
    }
    
    if r.Email == "" {
        errors["email"] = "is required"
    } else if !isValidEmail(r.Email) {
        errors["email"] = "must be a valid email address"
    }
    
    validRoles := map[string]bool{"admin": true, "user": true, "viewer": true}
    if !validRoles[r.Role] {
        errors["role"] = "must be one of: admin, user, viewer"
    }
    
    return errors
}

// Handler usage
func CreateUserHandler(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Request body must be valid JSON")
        return
    }
    
    if errors := req.Validate(); len(errors) > 0 {
        WriteErrorWithDetails(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request parameters", errors)
        return
    }
    
    // Proceed with valid request...
}
```

### Common Validation Patterns

```go
// Email validation
func isValidEmail(email string) bool {
    // RFC 5322 compliant regex (simplified)
    re := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
    return re.MatchString(email)
}

// UUID validation
func isValidUUID(id string) bool {
    re := regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
    return re.MatchString(id)
}

// Date validation
func parseDate(s string) (time.Time, error) {
    return time.Parse(time.RFC3339, s)
}
```

---

## OpenAPI Specification

### Approach: Code-First with Comments

For the DS App Skeleton, we use a **code-first** approach with structured comments that can be parsed into OpenAPI specs.

### Recommended Tools

| Tool | Purpose |
|------|---------|
| [swaggo/swag](https://github.com/swaggo/swag) | Generate OpenAPI from Go comments |
| [oapi-codegen](https://github.com/deepmap/oapi-codegen) | Generate Go code from OpenAPI (spec-first alternative) |

### Comment Format (swaggo)

```go
// GetUser godoc
// @Summary Get user by ID
// @Description Retrieves a user by their unique identifier
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID" format(uuid)
// @Param X-Tenant-ID header string true "Tenant ID"
// @Success 200 {object} User
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/users/{id} [get]
func GetUserHandler(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

### Generated Spec Location

```
backend/
├── docs/
│   ├── swagger.json    # Generated OpenAPI spec
│   ├── swagger.yaml    # YAML format
│   └── docs.go         # Embedded documentation
```

### Generation Command

```bash
# Install swag CLI
go install github.com/swaggo/swag/cmd/swag@latest

# Generate spec from comments
cd backend
swag init -g cmd/api/main.go -o docs

# Serve Swagger UI (optional)
# Add github.com/swaggo/http-swagger to serve at /swagger/*
```

### Future: Spec-First Approach

For larger APIs, consider switching to spec-first with `oapi-codegen`:

1. Write OpenAPI spec in `api/openapi.yaml`
2. Generate Go types and server interfaces
3. Implement handlers matching interfaces

This ensures spec and code stay in sync.

---

## Security Considerations

### Input Sanitization

```go
// Always trim and sanitize user input
name := strings.TrimSpace(req.Name)
description := html.EscapeString(req.Description)  // If outputting to HTML
```

### SQL/NoSQL Injection Prevention

```go
// ✅ Use parameterized queries (DynamoDB example)
pk := dynamo.BuildTenantKey(tenantID, "USER", userID)  // Safe
input := &dynamodb.GetItemInput{
    TableName: aws.String(tableName),
    Key: map[string]types.AttributeValue{
        "pk": &types.AttributeValueMemberS{Value: pk},
    },
}

// ❌ Never concatenate user input into queries
query := "SELECT * FROM users WHERE name = '" + userInput + "'"  // DANGEROUS
```

### Rate Limiting Response

```go
func RateLimitMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if isRateLimited(r) {
            w.Header().Set("Retry-After", "60")
            WriteError(w, http.StatusTooManyRequests, "RATE_LIMITED", "Too many requests. Please retry after 60 seconds.")
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

### Tenant Isolation

Every data access must include tenant scope:

```go
func GetResourceHandler(w http.ResponseWriter, r *http.Request) {
    tenantID := auth.GetTenantID(r.Context())
    if tenantID == "" {
        WriteError(w, http.StatusBadRequest, "TENANT_REQUIRED", "X-Tenant-ID header is required")
        return
    }
    
    // Build tenant-scoped key
    pk := dynamo.BuildTenantKey(tenantID, "RESOURCE", resourceID)
    // Query with tenant scope...
}
```

---

## Examples

### Complete CRUD Example

```go
// ==================== Types ====================

type Project struct {
    ID          string    `json:"id"`
    TenantID    string    `json:"tenant_id"`
    Name        string    `json:"name"`
    Description string    `json:"description,omitempty"`
    Status      string    `json:"status"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type CreateProjectRequest struct {
    Name        string `json:"name"`
    Description string `json:"description,omitempty"`
}

type UpdateProjectRequest struct {
    Name        *string `json:"name,omitempty"`
    Description *string `json:"description,omitempty"`
    Status      *string `json:"status,omitempty"`
}

// ==================== Handlers ====================

// ListProjectsHandler returns paginated projects for current tenant
// GET /api/v1/projects?limit=20&cursor=xxx&status=active&sort=-created_at
func ListProjectsHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    tenantID := auth.GetTenantID(ctx)
    
    pagination := ParsePagination(r)
    filters := ParseFilters(r)
    
    projects, nextCursor, err := repo.ListProjects(ctx, tenantID, pagination, filters)
    if err != nil {
        slog.Error("failed to list projects", "error", err, "tenant_id", tenantID)
        WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve projects")
        return
    }
    
    WriteJSON(w, http.StatusOK, ListResponse[Project]{
        Data: projects,
        Pagination: PaginationResponse{
            Limit:      pagination.Limit,
            HasMore:    nextCursor != "",
            NextCursor: nextCursor,
        },
    })
}

// CreateProjectHandler creates a new project
// POST /api/v1/projects
func CreateProjectHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    tenantID := auth.GetTenantID(ctx)
    userID := auth.GetUser(ctx).ID
    
    var req CreateProjectRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Request body must be valid JSON")
        return
    }
    
    if errors := validateCreateProject(&req); len(errors) > 0 {
        WriteErrorWithDetails(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request", errors)
        return
    }
    
    project := &Project{
        ID:          uuid.New().String(),
        TenantID:    tenantID,
        Name:        strings.TrimSpace(req.Name),
        Description: req.Description,
        Status:      "active",
        CreatedAt:   time.Now().UTC(),
        UpdatedAt:   time.Now().UTC(),
    }
    
    if err := repo.CreateProject(ctx, project); err != nil {
        slog.Error("failed to create project", "error", err, "tenant_id", tenantID)
        WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create project")
        return
    }
    
    slog.Info("project created", "project_id", project.ID, "tenant_id", tenantID, "user_id", userID)
    
    w.Header().Set("Location", "/api/v1/projects/"+project.ID)
    WriteJSON(w, http.StatusCreated, project)
}

// GetProjectHandler returns a single project
// GET /api/v1/projects/{id}
func GetProjectHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    tenantID := auth.GetTenantID(ctx)
    projectID := r.PathValue("id")
    
    if !isValidUUID(projectID) {
        WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid project ID format")
        return
    }
    
    project, err := repo.GetProject(ctx, tenantID, projectID)
    if err != nil {
        slog.Error("failed to get project", "error", err, "project_id", projectID)
        WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve project")
        return
    }
    if project == nil {
        WriteError(w, http.StatusNotFound, "NOT_FOUND", "Project not found")
        return
    }
    
    WriteJSON(w, http.StatusOK, project)
}

// UpdateProjectHandler updates an existing project
// PATCH /api/v1/projects/{id}
func UpdateProjectHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    tenantID := auth.GetTenantID(ctx)
    projectID := r.PathValue("id")
    
    var req UpdateProjectRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Request body must be valid JSON")
        return
    }
    
    project, err := repo.GetProject(ctx, tenantID, projectID)
    if err != nil || project == nil {
        WriteError(w, http.StatusNotFound, "NOT_FOUND", "Project not found")
        return
    }
    
    // Apply partial updates
    if req.Name != nil {
        project.Name = strings.TrimSpace(*req.Name)
    }
    if req.Description != nil {
        project.Description = *req.Description
    }
    if req.Status != nil {
        project.Status = *req.Status
    }
    project.UpdatedAt = time.Now().UTC()
    
    if err := repo.UpdateProject(ctx, project); err != nil {
        WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update project")
        return
    }
    
    WriteJSON(w, http.StatusOK, project)
}

// DeleteProjectHandler deletes a project
// DELETE /api/v1/projects/{id}
func DeleteProjectHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    tenantID := auth.GetTenantID(ctx)
    projectID := r.PathValue("id")
    
    if err := repo.DeleteProject(ctx, tenantID, projectID); err != nil {
        slog.Error("failed to delete project", "error", err, "project_id", projectID)
        WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete project")
        return
    }
    
    slog.Info("project deleted", "project_id", projectID, "tenant_id", tenantID)
    w.WriteHeader(http.StatusNoContent)
}

// ==================== Route Registration ====================

func RegisterProjectRoutes(mux *http.ServeMux) {
    mux.HandleFunc("GET /api/v1/projects", ListProjectsHandler)
    mux.HandleFunc("POST /api/v1/projects", CreateProjectHandler)
    mux.HandleFunc("GET /api/v1/projects/{id}", GetProjectHandler)
    mux.HandleFunc("PATCH /api/v1/projects/{id}", UpdateProjectHandler)
    mux.HandleFunc("DELETE /api/v1/projects/{id}", DeleteProjectHandler)
}
```

### Example API Responses

**Successful List (200 OK):**
```json
{
  "data": [
    {
      "id": "proj-abc123",
      "tenant_id": "tenant-xyz",
      "name": "My Project",
      "description": "A sample project",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:22:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "has_more": true,
    "next_cursor": "eyJpZCI6InByb2otYWJjMTIzIn0="
  }
}
```

**Successful Create (201 Created):**
```
HTTP/1.1 201 Created
Location: /api/v1/projects/proj-def456
Content-Type: application/json

{
  "id": "proj-def456",
  "tenant_id": "tenant-xyz",
  "name": "New Project",
  "status": "active",
  "created_at": "2024-02-19T06:30:00Z",
  "updated_at": "2024-02-19T06:30:00Z"
}
```

**Validation Error (400 Bad Request):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "name": "is required",
      "email": "must be a valid email address"
    },
    "request_id": "req-abc123"
  }
}
```

**Not Found (404):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found",
    "request_id": "req-xyz789"
  }
}
```

---

## Requirements Traceability

| Standard | Requirements |
|----------|--------------|
| Error response format | NFR-SEC-004 |
| Request validation | NFR-SEC-004, NFR-SEC-001 |
| Tenant header requirement | FR-TENANT-004 |
| Structured logging | NFR-MON-001, NFR-MON-004 |
| Response time targets | NFR-PERF-002 (<500ms p95) |

---

## Checklist for New Endpoints

Before adding a new API endpoint, verify:

- [ ] Uses correct HTTP method for the operation
- [ ] URL follows `/api/v1/{resource}` pattern
- [ ] Response uses standard JSON format
- [ ] Errors use `ErrorResponse` structure
- [ ] Request body is validated with field-level errors
- [ ] Tenant ID is extracted and used for data access
- [ ] Appropriate status codes for all scenarios
- [ ] Structured logging with context fields
- [ ] OpenAPI comments added for documentation
- [ ] Unit tests cover happy path and error cases

---

*Document version: 1.0.0*
*Last updated: 2026-02-19*
