# DS Developer DynamoDB Schema

## Overview

DS Developer uses a **single-table design** with tenant-scoped partition keys. As the boilerplate app, this schema is minimal and intended to be extended for each new application.

## Table Configuration

| Property | Value |
|----------|-------|
| Table Name | `ds-app-developer` (prod) |
| Partition Key | `PK` (String) |
| Sort Key | `SK` (String) |
| Billing Mode | PAY_PER_REQUEST |

## Key Patterns

All data is tenant-scoped using the helper functions in `internal/dynamo/repository.go`:

```go
// Build a fully-qualified key
pk := dynamo.BuildTenantKey(tenantID, "ENTITY", entityID)
// Result: "TENANT#{tenantID}#ENTITY#{entityID}"

// Build a prefix for queries  
prefix := dynamo.BuildTenantPrefix(tenantID, "ENTITY")
// Result: "TENANT#{tenantID}#ENTITY#"
```

### Standard Key Format

| Entity | PK Format | SK Format |
|--------|-----------|-----------|
| User data | `TENANT#{tenantId}#USER#{userId}` | `PROFILE` |
| User settings | `TENANT#{tenantId}#USER#{userId}` | `SETTINGS` |
| Resource | `TENANT#{tenantId}#RESOURCE#{id}` | `META` |

### Personal (No Tenant)

For users without an organization:
```
PK: TENANT#PERSONAL#USER#{userId}
SK: PROFILE
```

## Extending the Schema

When adding new entity types:

1. **Define the key pattern** in this document
2. **Use tenant scoping** — always use `BuildTenantKey()` or `BuildTenantPrefix()`
3. **Add GSIs if needed** for access patterns beyond the primary key
4. **Consider TTL** for temporary data (sessions, codes, etc.)

### Example: Adding a "Project" Entity

```go
// Key pattern
PK: TENANT#{tenantId}#PROJECT#{projectId}
SK: META

// List all projects in tenant
prefix := dynamo.BuildTenantPrefix(tenantID, "PROJECT")
// Query with begins_with(PK, prefix)
```

## Multi-Tenancy

- All queries MUST be scoped by tenant ID
- Tenant ID comes from authenticated session (via DSAccount SSO)
- Use `FR-TENANT-003` requirement reference when implementing tenant-scoped queries

## Global Secondary Indexes

Add GSIs as needed for specific access patterns. Document them here.

| GSI Name | PK | SK | Purpose |
|----------|----|----|---------|
| (none yet) | | | |

## Notes

- This is a boilerplate schema — extend for your application
- See DSCRM's `DYNAMODB_SCHEMA.md` for a full single-table design example
- See DSAccount's `DYNAMODB_SCHEMA.md` for a multi-table design example
