# Agentic Development Guidelines - DS App Skeleton

> Guidelines for AI agents working on this codebase.

## Before You Start

1. **Read REQUIREMENTS.md** - Understand what the app must do
2. **Check this file** - Understand coding conventions
3. **Review recent commits** - Understand current state

## Requirements Reference

All work must trace to requirements in [REQUIREMENTS.md](./REQUIREMENTS.md).

When implementing features:
- Reference the requirement ID in commit messages: `feat(auth): implement SSO redirect [FR-AUTH-002]`
- Reference requirement ID in test descriptions: `// Tests FR-AUTH-002: Unauthenticated redirect`
- Update REQUIREMENTS.md traceability table when adding tests

## Project Structure

```
ds-app-skeleton/
├── REQUIREMENTS.md      # What the app must do (source of truth)
├── AGENTS.md           # This file - how to work on the code
├── README.md           # Setup and overview
├── backend/            # Go Lambda handlers
│   ├── cmd/api/        # Main entry point
│   ├── internal/       # Private packages
│   │   ├── api/        # HTTP handlers
│   │   ├── auth/       # Auth middleware
│   │   ├── dynamo/     # Database layer
│   │   └── models/     # Domain models
│   └── go.mod
├── frontend/           # React + TypeScript
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/      # Route pages
│   │   ├── hooks/      # Custom hooks
│   │   ├── api/        # API client
│   │   └── i18n/       # Translations
│   └── package.json
├── cdk/                # Infrastructure as Code
│   ├── lib/            # CDK stacks
│   └── bin/            # CDK app entry
├── docs/               # Additional documentation
└── .github/workflows/  # CI/CD pipelines
```

## Coding Standards

### Go Backend
- Table-driven tests
- Errors wrapped with context: `fmt.Errorf("failed to get user: %w", err)`
- Structured logging: `log.Info("user created", "user_id", id, "tenant", tenantID)`
- All handlers return JSON with standard error format
- Repository pattern for database access

### React Frontend
- Functional components with hooks
- TypeScript strict mode
- Components in PascalCase, hooks in camelCase
- CSS via Tailwind v3 utility classes
- react-i18next for translations

### Testing
- Test file next to implementation: `handler.go` → `handler_test.go`
- Descriptive test names: `TestGetUser_WhenNotFound_Returns404`
- Mock external dependencies
- Reference requirement IDs in test comments

### Git Commits
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Reference requirement IDs: `[FR-XXX-NNN]`
- Reference issue numbers: `(#123)`

Example: `feat(auth): implement tenant context middleware [FR-TENANT-003] (#255)`

## Multi-Tenant Patterns

Every database query must be tenant-scoped:
```go
// ✅ Correct - includes tenant
items, err := repo.GetByTenant(ctx, tenantID, filters)

// ❌ Wrong - missing tenant scope
items, err := repo.GetAll(ctx, filters)
```

API handlers extract tenant from context:
```go
tenantID := auth.GetTenantID(ctx)
if tenantID == "" {
    return api.Error(http.StatusBadRequest, "tenant context required")
}
```

## Error Handling

Standard error response format:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "details": {"user_id": "123"},
    "request_id": "abc-123"
  }
}
```

## When Stuck

1. Re-read REQUIREMENTS.md for the feature
2. Check existing similar code for patterns
3. Run tests to understand expected behavior
4. If still stuck, document what you tried and ask

---
*Skeleton version: 1.0.0*
