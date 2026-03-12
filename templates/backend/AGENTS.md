# Backend — AGENTS.md

## Go Conventions

- **Go 1.21+** required
- Standard library preferred over external packages
- Use `internal/` for non-exported packages

---

## Project Structure

```
backend/
├── cmd/
│   └── api/
│       └── main.go     # Lambda entry point
├── internal/
│   ├── api/            # HTTP handlers
│   │   ├── handler.go  # Main handler + router
│   │   └── *.go        # Feature handlers
│   ├── db/             # Database operations
│   └── domain/         # Business logic
└── go.mod
```

---

## Handler Pattern

All handlers follow this pattern:

```go
func (h *Handler) featureHandler(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case "GET":
        h.getFeature(w, r)
    case "POST":
        h.createFeature(w, r)
    default:
        h.jsonError(w, "Method not allowed", "METHOD_NOT_ALLOWED", http.StatusMethodNotAllowed)
    }
}
```

---

## Authentication

JWT validation is handled by the ecosystem account service. Use the `auth` middleware:

```go
mux.HandleFunc("/api/protected", h.cors(h.auth(h.protectedHandler)))
```

**Available from auth context:**
- `r.Header.Get("X-User-ID")` — authenticated user ID
- `r.Header.Get("X-Tenant-ID")` — current tenant ID
- `r.Header.Get("X-Roles")` — comma-separated roles

---

## DynamoDB Access

Use the `db` package for all database operations:

```go
// Get item
item, err := h.db.GetItem(ctx, "pk", "sk")

// Put item
err := h.db.PutItem(ctx, item)

// Query
items, err := h.db.Query(ctx, "pk", "sk-prefix")
```

**Key design:**
- Partition key: typically `TENANT#<id>` or `USER#<id>`
- Sort key: entity type + ID (e.g., `ISSUE#123`)

---

## Error Responses

Always use `jsonError` for consistent error format:

```go
h.jsonError(w, "Human message", "ERROR_CODE", http.StatusBadRequest)
```

Response format:
```json
{
  "error": "Human message",
  "code": "ERROR_CODE"
}
```

---

## Logging

Use standard `log` package:

```go
log.Printf("Operation completed: user=%s tenant=%s", userID, tenantID)
```

Logs go to CloudWatch automatically.

---

## Testing

```bash
go test ./...           # Unit tests
go test -race ./...     # Race detection
```

---

## Local Development

```bash
cd backend
go run cmd/api/main.go
# Runs on http://localhost:8080
```

Environment variables:
- `DYNAMODB_TABLE` — DynamoDB table name
- `AWS_REGION` — AWS region
- `LOCAL_DEV=true` — enables local mode

---

## References

| Doc | Purpose |
|-----|---------|
| [API-STANDARDS.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/API-STANDARDS.md) | REST conventions |
| [DATABASE.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/DATABASE.md) | DynamoDB patterns |
| [SECURITY.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/SECURITY.md) | Security requirements |
| [LOGGING.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/LOGGING.md) | Logging standards |
