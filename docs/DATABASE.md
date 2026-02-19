# Database Patterns - DS App Skeleton

> This document defines DynamoDB patterns for all DigiStratum applications.
> Applications based on ds-app-skeleton inherit these patterns.

---

## Table of Contents

1. [Overview](#overview)
2. [Single-Table Design](#single-table-design)
3. [Key Design Patterns](#key-design-patterns)
4. [GSI Strategies](#gsi-strategies)
5. [Repository Pattern](#repository-pattern)
6. [Common Access Patterns](#common-access-patterns)
7. [Migration & Seeding](#migration--seeding)
8. [Best Practices](#best-practices)

---

## Overview

### Why DynamoDB?

| Benefit | Description |
|---------|-------------|
| **Serverless** | Pay-per-request, no capacity management |
| **Multi-tenant ready** | Partition key isolation built-in |
| **Low latency** | Single-digit millisecond reads |
| **Scalability** | Handles any traffic pattern |
| **AWS integration** | Native Lambda integration, IAM policies |

### Table Configuration

```typescript
// From infra/lib/app-stack.ts
const table = new dynamodb.Table(this, 'Table', {
  tableName: `${appName}-${environment}`,
  partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
  pointInTimeRecovery: isProd,
  timeToLiveAttribute: 'TTL',
});
```

**Key decisions:**
- **PAY_PER_REQUEST** - No capacity planning, cost scales with usage
- **Point-in-time recovery** - Enabled for prod, continuous backups
- **TTL attribute** - Automatic expiration for sessions, temp data
- **RETAIN in prod** - Prevents accidental deletion

---

## Single-Table Design

### What is Single-Table Design?

Instead of creating multiple tables (users, orders, products), we store all entity types in one table using composite keys. This enables:

- **Efficient queries** - Fetch related data in a single request
- **Transactions** - ACID operations across entity types
- **Simplified operations** - One table to monitor, backup, restore

### Entity Storage Pattern

All entities share the same table but are distinguished by their key patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE TABLE                              │
├─────────────────────────────────────────────────────────────┤
│ PK                              │ SK              │ Data... │
├─────────────────────────────────┼─────────────────┼─────────┤
│ TENANT#acme#USER#user-123       │ PROFILE         │ {...}   │
│ TENANT#acme#USER#user-123       │ SETTINGS        │ {...}   │
│ TENANT#acme#PROJECT#proj-456    │ METADATA        │ {...}   │
│ TENANT#acme#PROJECT#proj-456    │ MEMBER#user-123 │ {...}   │
│ TENANT#PERSONAL#USER#user-789   │ PROFILE         │ {...}   │
└─────────────────────────────────┴─────────────────┴─────────┘
```

---

## Key Design Patterns

### Primary Key Structure

**Format:** `TENANT#{tenantId}#{entityType}#{entityId}`

```go
// backend/internal/dynamo/repository.go

// BuildTenantKey builds a partition key with tenant prefix [FR-TENANT-003]
func BuildTenantKey(tenantID, entityType, entityID string) string {
    if tenantID == "" {
        tenantID = "PERSONAL"
    }
    return fmt.Sprintf("TENANT#%s#%s#%s", tenantID, entityType, entityID)
}

// BuildTenantPrefix builds a partition key prefix for queries [FR-TENANT-003]
func BuildTenantPrefix(tenantID, entityType string) string {
    if tenantID == "" {
        tenantID = "PERSONAL"
    }
    return fmt.Sprintf("TENANT#%s#%s#", tenantID, entityType)
}
```

### Key Components

| Component | Purpose | Example |
|-----------|---------|---------|
| `TENANT#` | Namespace prefix | Always present |
| `{tenantId}` | Tenant isolation | `acme-corp`, `PERSONAL` |
| `{entityType}` | Entity classification | `USER`, `PROJECT`, `TASK` |
| `{entityId}` | Unique identifier | UUID or meaningful ID |

### Sort Key Patterns

Sort keys enable hierarchical data and efficient queries within a partition:

| Pattern | Use Case | Example |
|---------|----------|---------|
| `METADATA` | Primary entity data | `SK = METADATA` |
| `PROFILE` | User profile data | `SK = PROFILE` |
| `SETTINGS` | Configuration | `SK = SETTINGS` |
| `{relation}#{id}` | Related entities | `SK = MEMBER#user-123` |
| `{date}#{id}` | Time-series data | `SK = 2026-02-19#event-123` |

### Personal vs Tenant Data

```go
// Personal data (no tenant context)
pk := BuildTenantKey("", "USER", userID)
// Result: TENANT#PERSONAL#USER#user-123

// Tenant-scoped data
pk := BuildTenantKey("acme-corp", "USER", userID)
// Result: TENANT#acme-corp#USER#user-123
```

---

## GSI Strategies

### GSI1: Secondary Access Pattern

```typescript
// From infra/lib/app-stack.ts
table.addGlobalSecondaryIndex({
  indexName: 'GSI1',
  partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL,
});
```

### When to Use GSI1

| Access Pattern | Main Table | GSI1 |
|----------------|------------|------|
| Get user by ID | ✅ PK query | - |
| List user's projects | ✅ PK query | - |
| Find user by email | - | ✅ GSI1PK = email |
| List all projects by date | - | ✅ GSI1SK sort |

### GSI Key Patterns

**Pattern 1: Inverted Index**
```
// Main table: Get project and its members
PK = TENANT#acme#PROJECT#proj-123
SK = MEMBER#user-456

// GSI1: Get user's project memberships
GSI1PK = TENANT#acme#USER#user-456
GSI1SK = PROJECT#proj-123
```

**Pattern 2: Lookup by Attribute**
```
// Main table: User record
PK = TENANT#acme#USER#user-123
SK = PROFILE
email = "john@example.com"

// GSI1: Find by email
GSI1PK = EMAIL#john@example.com
GSI1SK = TENANT#acme#USER#user-123
```

**Pattern 3: Time-based Queries**
```
// Main table: Event record
PK = TENANT#acme#EVENT#evt-123
SK = METADATA
created_at = "2026-02-19T10:30:00Z"

// GSI1: Query events by date
GSI1PK = TENANT#acme#EVENTS
GSI1SK = 2026-02-19T10:30:00Z#evt-123
```

### Adding More GSIs

Only add GSIs when you have a clear access pattern that can't be served by existing indexes. Each GSI:
- Adds storage cost (full item copy)
- Consumes write capacity (writes replicated)
- Has eventual consistency

```typescript
// Example: Add GSI2 for status-based queries
table.addGlobalSecondaryIndex({
  indexName: 'GSI2',
  partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.KEYS_ONLY, // Minimize storage
});
```

---

## Repository Pattern

### Base Repository

```go
// backend/internal/dynamo/repository.go

type Repository struct {
    client    *dynamodb.Client
    tableName string
}

func NewRepository(tableName string) (*Repository, error) {
    cfg, err := config.LoadDefaultConfig(context.Background())
    if err != nil {
        return nil, fmt.Errorf("failed to load AWS config: %w", err)
    }
    
    client := dynamodb.NewFromConfig(cfg)
    
    if override := os.Getenv("DYNAMODB_TABLE"); override != "" {
        tableName = override
    }
    
    return &Repository{
        client:    client,
        tableName: tableName,
    }, nil
}
```

### Domain-Specific Repositories

Extend the base repository for each entity type:

```go
// backend/internal/repositories/user_repository.go

package repositories

import (
    "context"
    "fmt"
    
    "github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
    "your-app/internal/dynamo"
    "your-app/internal/models"
)

type UserRepository struct {
    *dynamo.Repository
}

func NewUserRepository(repo *dynamo.Repository) *UserRepository {
    return &UserRepository{Repository: repo}
}

// GetUser retrieves a user by ID within tenant scope
func (r *UserRepository) GetUser(ctx context.Context, tenantID, userID string) (*models.User, error) {
    pk := dynamo.BuildTenantKey(tenantID, "USER", userID)
    
    result, err := r.Client().GetItem(ctx, &dynamodb.GetItemInput{
        TableName: aws.String(r.TableName()),
        Key: map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: "PROFILE"},
        },
    })
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    
    if result.Item == nil {
        return nil, nil // Not found
    }
    
    var user models.User
    if err := attributevalue.UnmarshalMap(result.Item, &user); err != nil {
        return nil, fmt.Errorf("failed to unmarshal user: %w", err)
    }
    
    return &user, nil
}

// ListUsers retrieves all users for a tenant
func (r *UserRepository) ListUsers(ctx context.Context, tenantID string) ([]models.User, error) {
    prefix := dynamo.BuildTenantPrefix(tenantID, "USER")
    
    result, err := r.Client().Query(ctx, &dynamodb.QueryInput{
        TableName:              aws.String(r.TableName()),
        KeyConditionExpression: aws.String("begins_with(PK, :prefix) AND SK = :sk"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":prefix": &types.AttributeValueMemberS{Value: prefix},
            ":sk":     &types.AttributeValueMemberS{Value: "PROFILE"},
        },
    })
    if err != nil {
        return nil, fmt.Errorf("failed to query users: %w", err)
    }
    
    var users []models.User
    if err := attributevalue.UnmarshalListOfMaps(result.Items, &users); err != nil {
        return nil, fmt.Errorf("failed to unmarshal users: %w", err)
    }
    
    return users, nil
}

// CreateUser creates a new user
func (r *UserRepository) CreateUser(ctx context.Context, user *models.User) error {
    pk := dynamo.BuildTenantKey(user.TenantID, "USER", user.ID)
    
    item, err := attributevalue.MarshalMap(user)
    if err != nil {
        return fmt.Errorf("failed to marshal user: %w", err)
    }
    
    item["PK"] = &types.AttributeValueMemberS{Value: pk}
    item["SK"] = &types.AttributeValueMemberS{Value: "PROFILE"}
    
    _, err = r.Client().PutItem(ctx, &dynamodb.PutItemInput{
        TableName: aws.String(r.TableName()),
        Item:      item,
    })
    if err != nil {
        return fmt.Errorf("failed to put user: %w", err)
    }
    
    return nil
}
```

### Repository Interface Pattern

Define interfaces for testability:

```go
// backend/internal/repositories/interfaces.go

package repositories

import (
    "context"
    "your-app/internal/models"
)

// UserRepository defines user data operations
type UserRepositoryInterface interface {
    GetUser(ctx context.Context, tenantID, userID string) (*models.User, error)
    ListUsers(ctx context.Context, tenantID string) ([]models.User, error)
    CreateUser(ctx context.Context, user *models.User) error
    UpdateUser(ctx context.Context, user *models.User) error
    DeleteUser(ctx context.Context, tenantID, userID string) error
}

// ProjectRepository defines project data operations
type ProjectRepositoryInterface interface {
    GetProject(ctx context.Context, tenantID, projectID string) (*models.Project, error)
    ListProjects(ctx context.Context, tenantID string) ([]models.Project, error)
    CreateProject(ctx context.Context, project *models.Project) error
    // ...
}
```

---

## Common Access Patterns

### Pattern 1: Get Single Entity

```go
// Get user profile
pk := BuildTenantKey(tenantID, "USER", userID)
sk := "PROFILE"
```

### Pattern 2: List Entities by Type

```go
// List all projects for tenant
prefix := BuildTenantPrefix(tenantID, "PROJECT")
// Query: PK begins_with prefix, SK = "METADATA"
```

### Pattern 3: Get Entity with Related Data

```go
// Get project with all members
pk := BuildTenantKey(tenantID, "PROJECT", projectID)
// Query: PK = pk (returns METADATA + all MEMBER# items)
```

### Pattern 4: Hierarchical Data

```go
// Store task under project
pk := BuildTenantKey(tenantID, "PROJECT", projectID)
sk := fmt.Sprintf("TASK#%s", taskID)
```

### Pattern 5: Time-Series Data

```go
// Store audit event
pk := BuildTenantKey(tenantID, "AUDIT", "2026-02")  // Monthly partition
sk := fmt.Sprintf("%s#%s", timestamp.Format(time.RFC3339), eventID)
```

### Pattern 6: Many-to-Many Relationships

```go
// User belongs to multiple projects
// Write to both directions:

// 1. Project members list
pk1 := BuildTenantKey(tenantID, "PROJECT", projectID)
sk1 := fmt.Sprintf("MEMBER#%s", userID)

// 2. User's projects (for GSI query)
// Store GSI1PK = TENANT#acme#USER#user-123
// Store GSI1SK = PROJECT#proj-456
```

---

## Migration & Seeding

### Schema Evolution Strategy

DynamoDB is schemaless, so "migrations" are handled differently than relational databases:

**1. Additive Changes (Safe)**
- Adding new attributes to items
- Adding new entity types
- Adding new GSIs

**2. Breaking Changes (Require Migration)**
- Changing key structure
- Renaming attributes
- Changing data types

### Migration Script Pattern

```go
// scripts/migrations/001_add_status_field.go

package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

func main() {
    ctx := context.Background()
    cfg, _ := config.LoadDefaultConfig(ctx)
    client := dynamodb.NewFromConfig(cfg)
    
    tableName := os.Getenv("DYNAMODB_TABLE")
    
    // Scan all PROJECT items
    paginator := dynamodb.NewScanPaginator(client, &dynamodb.ScanInput{
        TableName:        aws.String(tableName),
        FilterExpression: aws.String("begins_with(PK, :prefix)"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":prefix": &types.AttributeValueMemberS{Value: "TENANT#"},
        },
    })
    
    for paginator.HasMorePages() {
        page, err := paginator.NextPage(ctx)
        if err != nil {
            log.Fatal(err)
        }
        
        for _, item := range page.Items {
            // Add default status if missing
            if _, hasStatus := item["status"]; !hasStatus {
                _, err := client.UpdateItem(ctx, &dynamodb.UpdateItemInput{
                    TableName: aws.String(tableName),
                    Key: map[string]types.AttributeValue{
                        "PK": item["PK"],
                        "SK": item["SK"],
                    },
                    UpdateExpression: aws.String("SET #status = :status"),
                    ExpressionAttributeNames: map[string]string{
                        "#status": "status",
                    },
                    ExpressionAttributeValues: map[string]types.AttributeValue{
                        ":status": &types.AttributeValueMemberS{Value: "active"},
                    },
                })
                if err != nil {
                    log.Printf("Failed to update item: %v", err)
                }
            }
        }
    }
    
    fmt.Println("Migration complete")
}
```

### Seeding Pattern

```go
// scripts/seed/seed.go

package main

import (
    "context"
    "fmt"
    "os"
    "time"
    
    "github.com/google/uuid"
    "your-app/internal/dynamo"
    "your-app/internal/models"
    "your-app/internal/repositories"
)

func main() {
    ctx := context.Background()
    tableName := os.Getenv("DYNAMODB_TABLE")
    
    repo, err := dynamo.NewRepository(tableName)
    if err != nil {
        panic(err)
    }
    
    userRepo := repositories.NewUserRepository(repo)
    projectRepo := repositories.NewProjectRepository(repo)
    
    // Seed demo tenant
    tenantID := "demo-tenant"
    
    // Create users
    users := []models.User{
        {
            BaseModel: models.BaseModel{
                ID:        uuid.New().String(),
                TenantID:  tenantID,
                CreatedAt: time.Now(),
                UpdatedAt: time.Now(),
            },
            Email: "alice@example.com",
            Name:  "Alice Demo",
        },
        {
            BaseModel: models.BaseModel{
                ID:        uuid.New().String(),
                TenantID:  tenantID,
                CreatedAt: time.Now(),
                UpdatedAt: time.Now(),
            },
            Email: "bob@example.com",
            Name:  "Bob Demo",
        },
    }
    
    for _, user := range users {
        if err := userRepo.CreateUser(ctx, &user); err != nil {
            fmt.Printf("Failed to create user %s: %v\n", user.Email, err)
        } else {
            fmt.Printf("Created user: %s\n", user.Email)
        }
    }
    
    // Create sample project
    project := models.Project{
        BaseModel: models.BaseModel{
            ID:        uuid.New().String(),
            TenantID:  tenantID,
            CreatedAt: time.Now(),
            UpdatedAt: time.Now(),
        },
        Name:        "Demo Project",
        Description: "A sample project for demonstration",
    }
    
    if err := projectRepo.CreateProject(ctx, &project); err != nil {
        fmt.Printf("Failed to create project: %v\n", err)
    } else {
        fmt.Printf("Created project: %s\n", project.Name)
    }
    
    fmt.Println("Seeding complete")
}
```

### Running Migrations/Seeds

```bash
# Set environment
export DYNAMODB_TABLE=myapp-dev

# Run migration
go run scripts/migrations/001_add_status_field.go

# Run seed (dev only!)
go run scripts/seed/seed.go
```

---

## Best Practices

### DO ✅

| Practice | Reason |
|----------|--------|
| **Always include tenant in PK** | Data isolation, prevents cross-tenant leaks |
| **Use composite sort keys** | Enables range queries, hierarchical data |
| **Marshal/unmarshal with attributevalue** | Type safety, handles DynamoDB types |
| **Use Query over Scan** | Query is efficient, Scan reads entire table |
| **Enable TTL for temporary data** | Automatic cleanup, cost savings |
| **Use transactions for consistency** | ACID operations across items |

### DON'T ❌

| Anti-Pattern | Why It's Bad |
|--------------|--------------|
| **Scan without tenant filter** | Full table read, potential data leak |
| **Store large items (>400KB)** | DynamoDB item size limit |
| **Over-index with GSIs** | Increases storage and write costs |
| **Use Scan for pagination** | Expensive, inconsistent |
| **Store secrets in DynamoDB** | Use Secrets Manager instead |

### Query vs Scan

```go
// ✅ Query - efficient, uses indexes
result, err := client.Query(ctx, &dynamodb.QueryInput{
    TableName:              aws.String(tableName),
    KeyConditionExpression: aws.String("PK = :pk"),
    ExpressionAttributeValues: map[string]types.AttributeValue{
        ":pk": &types.AttributeValueMemberS{Value: pk},
    },
})

// ❌ Scan - reads entire table, expensive
result, err := client.Scan(ctx, &dynamodb.ScanInput{
    TableName: aws.String(tableName),
    FilterExpression: aws.String("tenant_id = :tenant"),
    // Filter happens AFTER reading all data!
})
```

### Pagination Pattern

```go
func (r *Repository) ListWithPagination(ctx context.Context, tenantID string, limit int, lastKey map[string]types.AttributeValue) (*PagedResult, error) {
    input := &dynamodb.QueryInput{
        TableName:              aws.String(r.tableName),
        KeyConditionExpression: aws.String("begins_with(PK, :prefix)"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":prefix": &types.AttributeValueMemberS{Value: BuildTenantPrefix(tenantID, "ITEM")},
        },
        Limit:             aws.Int32(int32(limit)),
        ExclusiveStartKey: lastKey,
    }
    
    result, err := r.client.Query(ctx, input)
    if err != nil {
        return nil, err
    }
    
    return &PagedResult{
        Items:       result.Items,
        LastKey:     result.LastEvaluatedKey,
        HasMorePages: result.LastEvaluatedKey != nil,
    }, nil
}
```

### Transaction Pattern

```go
// Atomic update of multiple items
_, err := client.TransactWriteItems(ctx, &dynamodb.TransactWriteItemsInput{
    TransactItems: []types.TransactWriteItem{
        {
            Update: &types.Update{
                TableName: aws.String(tableName),
                Key: map[string]types.AttributeValue{
                    "PK": &types.AttributeValueMemberS{Value: projectPK},
                    "SK": &types.AttributeValueMemberS{Value: "METADATA"},
                },
                UpdateExpression: aws.String("SET member_count = member_count + :one"),
                ExpressionAttributeValues: map[string]types.AttributeValue{
                    ":one": &types.AttributeValueMemberN{Value: "1"},
                },
            },
        },
        {
            Put: &types.Put{
                TableName: aws.String(tableName),
                Item: memberItem,
            },
        },
    },
})
```

---

## Appendix: Key Format Reference

### Partition Key Formats

| Entity | PK Format |
|--------|-----------|
| User | `TENANT#{tenantId}#USER#{userId}` |
| Project | `TENANT#{tenantId}#PROJECT#{projectId}` |
| Task | `TENANT#{tenantId}#PROJECT#{projectId}` |
| Settings | `TENANT#{tenantId}#SETTINGS#{scope}` |
| Audit | `TENANT#{tenantId}#AUDIT#{yearMonth}` |

### Sort Key Formats

| Entity/Relation | SK Format |
|-----------------|-----------|
| Main entity data | `METADATA` |
| User profile | `PROFILE` |
| User settings | `SETTINGS` |
| Project member | `MEMBER#{userId}` |
| Project task | `TASK#{taskId}` |
| Time-ordered | `{ISO8601}#{itemId}` |

### GSI Key Patterns

| Access Pattern | GSI1PK | GSI1SK |
|----------------|--------|--------|
| User by email | `EMAIL#{email}` | `TENANT#{tenantId}#USER#{userId}` |
| User's projects | `TENANT#{tenantId}#USER#{userId}` | `PROJECT#{projectId}` |
| Items by status | `TENANT#{tenantId}#STATUS#{status}` | `{timestamp}#{itemId}` |

---

*Document version: 1.0.0*
*Last updated: 2026-02-19*
