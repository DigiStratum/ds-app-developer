# ds-testing-go

Reusable Go testing utilities for DigiStratum services.

## Installation

```bash
go get github.com/DigiStratum/ds-testing-go@latest
```

## Features

### DynamoDB Local Testing

Create isolated DynamoDB tables for each test with automatic cleanup:

```go
package myservice_test

import (
    "testing"
    dstesting "github.com/DigiStratum/ds-testing-go"
)

func TestUserRepository(t *testing.T) {
    // Creates a unique table that's automatically cleaned up
    db := dstesting.NewTestDB(t)
    
    // Seed test data
    user := dstesting.NewUserFixture().
        WithTenant("tenant-1").
        WithEmail("user@test.com")
    
    if err := db.PutItem(user.ToAttributeValues()); err != nil {
        t.Fatal(err)
    }
    
    // Use db.Client and db.TableName in your repository tests
    repo := NewUserRepository(db.Client, db.TableName)
    
    result, err := repo.GetByEmail("user@test.com")
    // assertions...
}
```

### Custom Table Schema

Use a custom schema for non-standard table designs:

```go
schema := &dstesting.TableSchema{
    KeySchema: []types.KeySchemaElement{
        {AttributeName: aws.String("id"), KeyType: types.KeyTypeHash},
    },
    AttributeDefinitions: []types.AttributeDefinition{
        {AttributeName: aws.String("id"), AttributeType: types.ScalarAttributeTypeS},
    },
}

db := dstesting.NewTestDB(t, dstesting.WithSchema(schema))
```

### Test Fixtures

Build complex test scenarios with the fluent builder:

```go
builder := dstesting.NewFixtureBuilder()
builder.
    Add(dstesting.NewTenantFixture().WithID("tenant-1").WithName("Acme Corp")).
    Add(dstesting.NewUserFixture().WithTenant("tenant-1").WithEmail("admin@acme.com")).
    Add(dstesting.NewSessionFixture("user-1").WithTenant("tenant-1"))

if err := builder.Seed(db); err != nil {
    t.Fatal(err)
}
```

### HTTP Test Server

Test HTTP handlers with convenient helpers:

```go
func TestHealthEndpoint(t *testing.T) {
    handler := createMyHandler()
    server := dstesting.NewTestServer(t, handler)
    
    resp := server.Get("/health")
    
    dstesting.AssertStatusOK(t, resp)
    dstesting.AssertContentTypeJSON(t, resp)
    dstesting.AssertJSONContains(t, resp, "status", "healthy")
}
```

### Authenticated Requests

Test with authentication headers:

```go
server := dstesting.NewTestServer(t, handler,
    dstesting.WithDefaultHeaders(dstesting.DefaultAuthHeaders()))

// All requests now include Authorization and X-Tenant-ID headers
resp := server.Get("/api/protected")

// Or per-request:
resp := server.Get("/api/data", dstesting.AuthHeaders("custom-token"))
```

### JSON Response Helpers

```go
// Read typed JSON response
type User struct {
    ID    string `json:"id"`
    Email string `json:"email"`
}

resp := server.Get("/api/users/123")
user := dstesting.ReadJSON[User](t, resp)

// Check array length
resp := server.Get("/api/users")
dstesting.AssertJSONArrayLength(t, resp, 5)
```

### Mock HTTP Servers

Mock external service dependencies:

```go
func TestExternalServiceCall(t *testing.T) {
    mock := dstesting.NewMockHTTPServer()
    defer mock.Close()
    
    mock.OnGet("/api/data", dstesting.RespondOK(map[string]string{
        "key": "value",
    }))
    
    // Configure your service to use mock.URL as the base URL
    svc := NewMyService(mock.URL)
    result, err := svc.FetchData()
    
    // Verify the call was made
    if mock.CallCount() != 1 {
        t.Error("expected 1 call to external service")
    }
}
```

## API Reference

### DynamoDB Testing

| Function | Description |
|----------|-------------|
| `NewTestDB(t, opts...)` | Create isolated test table |
| `WithEndpoint(url)` | Custom DynamoDB endpoint |
| `WithSchema(schema)` | Custom table schema |
| `DefaultTableSchema()` | Standard PK/SK + GSI1 schema |

### TestDB Methods

| Method | Description |
|--------|-------------|
| `PutItem(item)` | Insert an item |
| `GetItem(key)` | Retrieve an item |
| `Query(input)` | Query the table |
| `Scan(input)` | Scan the table |
| `Seed(items...)` | Insert multiple items |
| `Clear()` | Remove all items |
| `Cleanup()` | Delete the table |

### Fixtures

| Fixture | Description |
|---------|-------------|
| `NewUserFixture()` | User with tenant context |
| `NewSessionFixture(userID)` | Session with TTL |
| `NewTenantFixture()` | Tenant metadata |
| `NewGenericFixture(pk, sk, type)` | Any entity type |

### HTTP Testing

| Function | Description |
|----------|-------------|
| `NewTestServer(t, handler, opts...)` | Create test HTTP server |
| `AssertStatus(t, resp, code)` | Check status code |
| `AssertContentTypeJSON(t, resp)` | Check JSON content type |
| `AssertJSONContains(t, resp, key, val)` | Check JSON field |
| `ReadJSON[T](t, resp)` | Parse typed response |

### Mocks

| Function | Description |
|----------|-------------|
| `NewMockHTTPServer()` | Create mock server |
| `RespondJSON(status, body)` | JSON response handler |
| `RespondOK(body)` | 200 OK JSON handler |
| `RespondError(status, msg)` | Error response handler |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DYNAMODB_ENDPOINT` | `http://localhost:8000` | DynamoDB Local endpoint |

## Requirements

- Go 1.21+
- DynamoDB Local (for DynamoDB tests)

### Running DynamoDB Local

```bash
# Docker
docker run -p 8000:8000 amazon/dynamodb-local

# Or use the provided docker-compose in ds-app-skeleton
docker-compose up -d dynamodb
```

## License

MIT
