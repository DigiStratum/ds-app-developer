# Integration Testing Patterns - DS App Skeleton

> This document defines integration testing patterns for all DigiStratum applications.
> Applications based on ds-app-skeleton inherit these patterns.
> See [TEST-TEMPLATES.md](./TEST-TEMPLATES.md) for unit test patterns.

---

## Table of Contents

1. [Overview](#overview)
2. [Go Backend Integration Tests](#go-backend-integration-tests)
3. [Database Test Isolation](#database-test-isolation)
4. [Test Fixtures](#test-fixtures)
5. [Test Environment Setup/Teardown](#test-environment-setupteardown)
6. [React Frontend Integration Tests](#react-frontend-integration-tests)
7. [End-to-End Testing](#end-to-end-testing)
8. [CI/CD Integration](#cicd-integration)
9. [Requirements Traceability](#requirements-traceability)

---

## Overview

### Types of Tests

| Type | Scope | Speed | Isolation |
|------|-------|-------|-----------|
| **Unit** | Single function/method | Fast (ms) | Full - no external deps |
| **Integration** | Multiple components | Medium (s) | Partial - uses test doubles for external services |
| **E2E** | Full system | Slow (min) | None - real services |

### When to Use Integration Tests

Use integration tests when:
- Testing HTTP handlers with middleware chains
- Testing database queries and transactions
- Testing API contracts and error responses
- Testing authentication/authorization flows
- Testing multi-component interactions (e.g., service → repository → database)

### Integration Test Principles

1. **Test real interactions** - Integration tests should exercise actual HTTP routing, middleware, and serialization
2. **Isolate external services** - Use DynamoDB Local or mocks for database, mock external APIs
3. **Test boundaries** - Focus on component integration points, not internal logic
4. **Use realistic data** - Test fixtures should represent production-like scenarios
5. **Clean state** - Each test starts with known state, cleans up after itself

---

## Go Backend Integration Tests

### File Organization

```
backend/
├── internal/
│   ├── api/
│   │   ├── handlers.go
│   │   └── handlers_test.go      # Unit tests for handlers
│   ├── auth/
│   │   ├── middleware.go
│   │   └── middleware_test.go    # Unit tests for middleware
│   └── dynamo/
│       └── repository.go
├── test/
│   └── integration/              # Integration test package
│       ├── api_test.go           # Full API integration tests
│       ├── fixtures.go           # Test data fixtures
│       ├── helpers.go            # Test utilities
│       └── setup.go              # Environment setup/teardown
└── go.mod
```

### API Integration Test Pattern

```go
// backend/test/integration/api_test.go
package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestAPI runs integration tests against the full HTTP handler stack.
// These tests exercise routing, middleware, handlers, and serialization.

// TestHealthEndpoint_ReturnsHealthy tests NFR-AVAIL-003
func TestHealthEndpoint_ReturnsHealthy(t *testing.T) {
	// Arrange
	server := NewTestServer(t)
	defer server.Close()

	// Act
	resp := server.Get("/health")
	defer resp.Body.Close()

	// Assert
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	var body map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&body)

	if body["status"] != "healthy" {
		t.Errorf("expected status=healthy, got %v", body["status"])
	}
}

// TestGetCurrentUser_Authenticated tests FR-AUTH-003
func TestGetCurrentUser_Authenticated(t *testing.T) {
	// Arrange
	server := NewTestServer(t)
	defer server.Close()

	// Use test fixture with valid auth
	req := server.NewRequest("GET", "/api/me")
	req.Header.Set("Authorization", "Bearer "+TestToken)
	req.Header.Set("X-Tenant-ID", "test-tenant")

	// Act
	resp := server.Do(req)
	defer resp.Body.Close()

	// Assert
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	var user struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	}
	json.NewDecoder(resp.Body).Decode(&user)

	if user.Email == "" {
		t.Error("expected user email in response")
	}
}

// TestGetCurrentUser_Unauthenticated tests FR-AUTH-002
func TestGetCurrentUser_Unauthenticated(t *testing.T) {
	// Arrange
	server := NewTestServer(t)
	defer server.Close()

	// No Authorization header
	req := server.NewRequest("GET", "/api/me")

	// Act
	resp := server.Do(req)
	defer resp.Body.Close()

	// Assert - expect redirect to SSO (302) or unauthorized (401) for API
	if resp.StatusCode != http.StatusFound && resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected status 302 or 401, got %d", resp.StatusCode)
	}
}

// TestAPIError_ReturnsStandardFormat tests NFR-SEC-004
func TestAPIError_ReturnsStandardFormat(t *testing.T) {
	// Arrange
	server := NewTestServer(t)
	defer server.Close()

	req := server.NewRequest("GET", "/api/nonexistent-resource")
	req.Header.Set("Authorization", "Bearer "+TestToken)

	// Act
	resp := server.Do(req)
	defer resp.Body.Close()

	// Assert
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", resp.StatusCode)
	}

	var errResp struct {
		Error struct {
			Code      string `json:"code"`
			Message   string `json:"message"`
			RequestID string `json:"request_id"`
		} `json:"error"`
	}
	json.NewDecoder(resp.Body).Decode(&errResp)

	if errResp.Error.Code == "" {
		t.Error("expected error code in response")
	}
	if errResp.Error.RequestID == "" {
		t.Error("expected request_id for correlation")
	}
}

// TestTenantIsolation tests FR-TENANT-003 and FR-TENANT-004
func TestTenantIsolation_QueriesAreTenantScoped(t *testing.T) {
	// Arrange
	server := NewTestServer(t)
	defer server.Close()

	// Seed test data for two tenants
	server.SeedFixture(UserFixture("tenant-a", "user-1", "alice@example.com"))
	server.SeedFixture(UserFixture("tenant-b", "user-2", "bob@example.com"))

	// Act - Request as tenant-a
	req := server.NewRequest("GET", "/api/users")
	req.Header.Set("Authorization", "Bearer "+TestToken)
	req.Header.Set("X-Tenant-ID", "tenant-a")

	resp := server.Do(req)
	defer resp.Body.Close()

	// Assert - Should only see tenant-a's data
	var users []struct {
		Email string `json:"email"`
	}
	json.NewDecoder(resp.Body).Decode(&users)

	for _, u := range users {
		if u.Email == "bob@example.com" {
			t.Error("tenant-a should not see tenant-b's users")
		}
	}
}
```

### Test Server Helper

```go
// backend/test/integration/helpers.go
package integration

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DigiStratum/ds-app-skeleton/backend/cmd/api"
)

// TestServer wraps httptest.Server with helper methods for integration tests
type TestServer struct {
	*httptest.Server
	t     *testing.T
	db    *TestDB
}

// NewTestServer creates a test server with full middleware stack
func NewTestServer(t *testing.T) *TestServer {
	t.Helper()

	// Set up test database
	db := NewTestDB(t)
	t.Cleanup(func() { db.Cleanup() })

	// Set environment for tests
	t.Setenv("DYNAMODB_TABLE", db.TableName)
	t.Setenv("DYNAMODB_ENDPOINT", db.Endpoint)
	t.Setenv("DSACCOUNT_SSO_URL", "https://account.test.local")
	t.Setenv("DSACCOUNT_APP_ID", "test-app")
	t.Setenv("APP_URL", "https://app.test.local")

	// Create handler (uses same init as Lambda)
	handler := api.NewHandler()

	server := httptest.NewServer(handler)
	t.Cleanup(func() { server.Close() })

	return &TestServer{
		Server: server,
		t:      t,
		db:     db,
	}
}

// Get performs a GET request and returns the response
func (s *TestServer) Get(path string) *http.Response {
	resp, err := http.Get(s.URL + path)
	if err != nil {
		s.t.Fatalf("GET %s failed: %v", path, err)
	}
	return resp
}

// NewRequest creates a new request with the test server's base URL
func (s *TestServer) NewRequest(method, path string) *http.Request {
	req, err := http.NewRequest(method, s.URL+path, nil)
	if err != nil {
		s.t.Fatalf("NewRequest failed: %v", err)
	}
	return req
}

// Do executes a request
func (s *TestServer) Do(req *http.Request) *http.Response {
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		s.t.Fatalf("Request failed: %v", err)
	}
	return resp
}

// SeedFixture inserts test data into the database
func (s *TestServer) SeedFixture(fixture Fixture) {
	if err := s.db.Insert(fixture); err != nil {
		s.t.Fatalf("SeedFixture failed: %v", err)
	}
}

// Constants for test authentication
const (
	TestToken   = "test-valid-token"
	TestUserID  = "test-user-123"
	TestTenant  = "test-tenant"
)
```

---

## Database Test Isolation

### Strategy: DynamoDB Local

DynamoDB Local provides a downloadable version of DynamoDB for local development and testing. This is the **recommended approach** for integration tests.

**Advantages:**
- Real DynamoDB behavior (queries, indexes, transactions)
- No cost during testing
- Parallel test execution (separate tables per test)
- No risk of affecting production data

**Disadvantages:**
- Requires Docker or Java runtime
- Some advanced features not supported (streams, TTL behavior)

### DynamoDB Local Setup

```go
// backend/test/integration/setup.go
package integration

import (
	"context"
	"fmt"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
)

const (
	DynamoDBLocalEndpoint = "http://localhost:8000"
)

// TestDB provides isolated DynamoDB table for tests
type TestDB struct {
	Client    *dynamodb.Client
	TableName string
	Endpoint  string
}

// NewTestDB creates a new test database with unique table name
func NewTestDB(t *testing.T) *TestDB {
	t.Helper()

	// Generate unique table name for test isolation
	tableName := fmt.Sprintf("test-%s-%s", t.Name(), uuid.New().String()[:8])

	// Configure client for DynamoDB Local
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion("us-east-1"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			"fake", "fake", "",
		)),
	)
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	client := dynamodb.NewFromConfig(cfg, func(o *dynamodb.Options) {
		o.BaseEndpoint = aws.String(DynamoDBLocalEndpoint)
	})

	// Create table
	createTable(t, client, tableName)

	return &TestDB{
		Client:    client,
		TableName: tableName,
		Endpoint:  DynamoDBLocalEndpoint,
	}
}

// createTable creates a test table matching production schema
func createTable(t *testing.T, client *dynamodb.Client, tableName string) {
	t.Helper()

	_, err := client.CreateTable(context.Background(), &dynamodb.CreateTableInput{
		TableName: aws.String(tableName),
		KeySchema: []types.KeySchemaElement{
			{AttributeName: aws.String("PK"), KeyType: types.KeyTypeHash},
			{AttributeName: aws.String("SK"), KeyType: types.KeyTypeRange},
		},
		AttributeDefinitions: []types.AttributeDefinition{
			{AttributeName: aws.String("PK"), AttributeType: types.ScalarAttributeTypeS},
			{AttributeName: aws.String("SK"), AttributeType: types.ScalarAttributeTypeS},
			{AttributeName: aws.String("GSI1PK"), AttributeType: types.ScalarAttributeTypeS},
			{AttributeName: aws.String("GSI1SK"), AttributeType: types.ScalarAttributeTypeS},
		},
		GlobalSecondaryIndexes: []types.GlobalSecondaryIndex{
			{
				IndexName: aws.String("GSI1"),
				KeySchema: []types.KeySchemaElement{
					{AttributeName: aws.String("GSI1PK"), KeyType: types.KeyTypeHash},
					{AttributeName: aws.String("GSI1SK"), KeyType: types.KeyTypeRange},
				},
				Projection: &types.Projection{ProjectionType: types.ProjectionTypeAll},
			},
		},
		BillingMode: types.BillingModePayPerRequest,
	})

	if err != nil {
		t.Fatalf("failed to create table: %v", err)
	}
}

// Cleanup deletes the test table
func (db *TestDB) Cleanup() {
	db.Client.DeleteTable(context.Background(), &dynamodb.DeleteTableInput{
		TableName: aws.String(db.TableName),
	})
}

// Insert adds a fixture item to the table
func (db *TestDB) Insert(fixture Fixture) error {
	_, err := db.Client.PutItem(context.Background(), &dynamodb.PutItemInput{
		TableName: aws.String(db.TableName),
		Item:      fixture.ToAttributeValues(),
	})
	return err
}

// Clear removes all items from the table (for test cleanup)
func (db *TestDB) Clear() error {
	// Scan and delete all items
	paginator := dynamodb.NewScanPaginator(db.Client, &dynamodb.ScanInput{
		TableName: aws.String(db.TableName),
	})

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(context.Background())
		if err != nil {
			return err
		}

		for _, item := range page.Items {
			_, err := db.Client.DeleteItem(context.Background(), &dynamodb.DeleteItemInput{
				TableName: aws.String(db.TableName),
				Key: map[string]types.AttributeValue{
					"PK": item["PK"],
					"SK": item["SK"],
				},
			})
			if err != nil {
				return err
			}
		}
	}
	return nil
}
```

### Alternative: In-Memory Mocks

For tests that don't need full DynamoDB behavior, use in-memory mocks:

```go
// backend/test/mocks/repository_mock.go
package mocks

import (
	"context"
	"sync"
)

// MockRepository provides an in-memory implementation for testing
type MockRepository struct {
	mu    sync.RWMutex
	items map[string]map[string]interface{} // PK -> SK -> Item
}

func NewMockRepository() *MockRepository {
	return &MockRepository{
		items: make(map[string]map[string]interface{}),
	}
}

func (m *MockRepository) PutItem(ctx context.Context, pk, sk string, item interface{}) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.items[pk] == nil {
		m.items[pk] = make(map[string]interface{})
	}
	m.items[pk][sk] = item
	return nil
}

func (m *MockRepository) GetItem(ctx context.Context, pk, sk string) (interface{}, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if items, ok := m.items[pk]; ok {
		return items[sk], nil
	}
	return nil, nil
}

func (m *MockRepository) Query(ctx context.Context, pk string) ([]interface{}, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var results []interface{}
	if items, ok := m.items[pk]; ok {
		for _, item := range items {
			results = append(results, item)
		}
	}
	return results, nil
}

func (m *MockRepository) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.items = make(map[string]map[string]interface{})
}
```

### When to Use Each Approach

| Scenario | DynamoDB Local | In-Memory Mock |
|----------|----------------|----------------|
| Testing query conditions | ✅ | ❌ |
| Testing transactions | ✅ | ❌ |
| Testing GSI queries | ✅ | ❌ |
| Unit testing handlers | ❌ | ✅ |
| Fast iteration | ❌ | ✅ |
| CI/CD pipeline | ✅ | ✅ |

---

## Test Fixtures

### Fixture Pattern

```go
// backend/test/integration/fixtures.go
package integration

import (
	"time"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

// Fixture represents test data that can be inserted into DynamoDB
type Fixture interface {
	ToAttributeValues() map[string]types.AttributeValue
}

// UserFixture creates a test user entity
func UserFixture(tenantID, userID, email string) Fixture {
	return &userFixture{
		TenantID:  tenantID,
		UserID:    userID,
		Email:     email,
		Name:      "Test User",
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
}

type userFixture struct {
	TenantID  string
	UserID    string
	Email     string
	Name      string
	CreatedAt string
}

func (f *userFixture) ToAttributeValues() map[string]types.AttributeValue {
	pk := "TENANT#" + f.TenantID + "#USER"
	sk := "USER#" + f.UserID

	return map[string]types.AttributeValue{
		"PK":         &types.AttributeValueMemberS{Value: pk},
		"SK":         &types.AttributeValueMemberS{Value: sk},
		"EntityType": &types.AttributeValueMemberS{Value: "USER"},
		"TenantID":   &types.AttributeValueMemberS{Value: f.TenantID},
		"UserID":     &types.AttributeValueMemberS{Value: f.UserID},
		"Email":      &types.AttributeValueMemberS{Value: f.Email},
		"Name":       &types.AttributeValueMemberS{Value: f.Name},
		"CreatedAt":  &types.AttributeValueMemberS{Value: f.CreatedAt},
		// GSI1 for email lookup
		"GSI1PK": &types.AttributeValueMemberS{Value: "EMAIL#" + f.Email},
		"GSI1SK": &types.AttributeValueMemberS{Value: "TENANT#" + f.TenantID},
	}
}

// SessionFixture creates a test session entity
func SessionFixture(tenantID, sessionID, userID string, expiresAt time.Time) Fixture {
	return &sessionFixture{
		TenantID:  tenantID,
		SessionID: sessionID,
		UserID:    userID,
		ExpiresAt: expiresAt,
	}
}

type sessionFixture struct {
	TenantID  string
	SessionID string
	UserID    string
	ExpiresAt time.Time
}

func (f *sessionFixture) ToAttributeValues() map[string]types.AttributeValue {
	pk := "TENANT#" + f.TenantID + "#SESSION"
	sk := "SESSION#" + f.SessionID

	return map[string]types.AttributeValue{
		"PK":         &types.AttributeValueMemberS{Value: pk},
		"SK":         &types.AttributeValueMemberS{Value: sk},
		"EntityType": &types.AttributeValueMemberS{Value: "SESSION"},
		"TenantID":   &types.AttributeValueMemberS{Value: f.TenantID},
		"SessionID":  &types.AttributeValueMemberS{Value: f.SessionID},
		"UserID":     &types.AttributeValueMemberS{Value: f.UserID},
		"ExpiresAt":  &types.AttributeValueMemberS{Value: f.ExpiresAt.Format(time.RFC3339)},
		"TTL":        &types.AttributeValueMemberN{Value: fmt.Sprint(f.ExpiresAt.Unix())},
	}
}

// TenantFixture creates a test tenant entity
func TenantFixture(tenantID, name string) Fixture {
	return &tenantFixture{
		TenantID: tenantID,
		Name:     name,
	}
}

type tenantFixture struct {
	TenantID string
	Name     string
}

func (f *tenantFixture) ToAttributeValues() map[string]types.AttributeValue {
	pk := "TENANT#" + f.TenantID
	sk := "METADATA"

	return map[string]types.AttributeValue{
		"PK":         &types.AttributeValueMemberS{Value: pk},
		"SK":         &types.AttributeValueMemberS{Value: sk},
		"EntityType": &types.AttributeValueMemberS{Value: "TENANT"},
		"TenantID":   &types.AttributeValueMemberS{Value: f.TenantID},
		"Name":       &types.AttributeValueMemberS{Value: f.Name},
	}
}
```

### Fixture Builders for Complex Scenarios

```go
// backend/test/integration/fixtures.go (continued)

// FixtureBuilder allows constructing complex test scenarios
type FixtureBuilder struct {
	fixtures []Fixture
}

func NewFixtureBuilder() *FixtureBuilder {
	return &FixtureBuilder{
		fixtures: make([]Fixture, 0),
	}
}

// WithTenant adds a tenant with users
func (b *FixtureBuilder) WithTenant(tenantID, tenantName string, users ...struct{ ID, Email string }) *FixtureBuilder {
	b.fixtures = append(b.fixtures, TenantFixture(tenantID, tenantName))
	for _, u := range users {
		b.fixtures = append(b.fixtures, UserFixture(tenantID, u.ID, u.Email))
	}
	return b
}

// WithSession adds a session for a user
func (b *FixtureBuilder) WithSession(tenantID, userID string) *FixtureBuilder {
	sessionID := "session-" + userID
	b.fixtures = append(b.fixtures, SessionFixture(tenantID, sessionID, userID, time.Now().Add(24*time.Hour)))
	return b
}

// Build returns all fixtures
func (b *FixtureBuilder) Build() []Fixture {
	return b.fixtures
}

// Seed inserts all fixtures into the test database
func (b *FixtureBuilder) Seed(db *TestDB) error {
	for _, f := range b.fixtures {
		if err := db.Insert(f); err != nil {
			return err
		}
	}
	return nil
}

// Example usage:
// fixtures := NewFixtureBuilder().
//     WithTenant("acme", "Acme Corp",
//         struct{ ID, Email string }{"user-1", "alice@acme.com"},
//         struct{ ID, Email string }{"user-2", "bob@acme.com"},
//     ).
//     WithSession("acme", "user-1").
//     Build()
```

---

## Test Environment Setup/Teardown

### Per-Test Isolation

```go
// backend/test/integration/setup.go (continued)

// SetupTest prepares a clean test environment
func SetupTest(t *testing.T) (*TestServer, func()) {
	t.Helper()

	// Create isolated test server and database
	server := NewTestServer(t)

	// Return cleanup function
	cleanup := func() {
		server.Close()
	}

	return server, cleanup
}

// SetupTestWithFixtures prepares environment with pre-seeded data
func SetupTestWithFixtures(t *testing.T, fixtures ...Fixture) (*TestServer, func()) {
	t.Helper()

	server := NewTestServer(t)

	// Seed fixtures
	for _, f := range fixtures {
		server.SeedFixture(f)
	}

	cleanup := func() {
		server.Close()
	}

	return server, cleanup
}
```

### Package-Level Setup

For tests sharing expensive setup (like starting DynamoDB Local):

```go
// backend/test/integration/main_test.go
package integration

import (
	"os"
	"testing"
)

var sharedDB *TestDB

func TestMain(m *testing.M) {
	// Start DynamoDB Local container if not running
	if os.Getenv("SKIP_DYNAMODB_LOCAL") == "" {
		if err := startDynamoDBLocal(); err != nil {
			panic("failed to start DynamoDB Local: " + err.Error())
		}
		defer stopDynamoDBLocal()
	}

	// Run tests
	code := m.Run()

	os.Exit(code)
}

func startDynamoDBLocal() error {
	// Option 1: Use testcontainers-go
	// Option 2: Assume it's running (for CI/CD)
	// Option 3: Shell out to docker-compose
	return nil
}

func stopDynamoDBLocal() {
	// Cleanup
}
```

### Docker Compose for Test Dependencies

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    ports:
      - "8000:8000"
    command: ["-jar", "DynamoDBLocal.jar", "-sharedDb", "-inMemory"]
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:8000 || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 3
```

### Makefile Targets

```makefile
# Makefile

.PHONY: test test-integration test-unit

# Run all tests
test: test-unit test-integration

# Run unit tests only
test-unit:
	cd backend && go test ./internal/... -v

# Start dependencies and run integration tests
test-integration:
	docker-compose -f docker-compose.test.yml up -d
	sleep 2
	cd backend && go test ./test/integration/... -v
	docker-compose -f docker-compose.test.yml down

# Run integration tests (assumes deps are running)
test-integration-fast:
	cd backend && go test ./test/integration/... -v
```

---

## React Frontend Integration Tests

### API Mocking with MSW

```typescript
// frontend/src/__tests__/integration/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.get('/api/me', () => {
    return HttpResponse.json({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      tenants: ['tenant-1', 'tenant-2'],
    });
  }),

  http.get('/api/tenant', ({ request }) => {
    const tenantId = request.headers.get('X-Tenant-ID');
    return HttpResponse.json({
      tenant_id: tenantId || '',
      is_personal: !tenantId,
    });
  }),

  // Example CRUD endpoint
  http.get('/api/users', ({ request }) => {
    const tenantId = request.headers.get('X-Tenant-ID');
    // Return tenant-scoped mock data
    return HttpResponse.json([
      { id: 'user-1', email: 'alice@example.com', tenant_id: tenantId },
    ]);
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: 'new-user-id', ...body },
      { status: 201 }
    );
  }),
];

export const errorHandlers = [
  http.get('/api/error-endpoint', () => {
    return HttpResponse.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          request_id: 'test-request-id',
        },
      },
      { status: 404 }
    );
  }),
];
```

### Setup MSW Server

```typescript
// frontend/src/__tests__/integration/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

// frontend/src/__tests__/integration/setupTests.ts
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './setup';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Component Integration Tests

```typescript
// frontend/src/__tests__/integration/auth-flow.test.tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { server } from './setup';
import { http, HttpResponse } from 'msw';
import App from '../../App';

/**
 * Integration tests for complete auth flow
 * Tests FR-AUTH-001 through FR-AUTH-004
 */
describe('Auth Flow Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('shows authenticated user after login [FR-AUTH-003]', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // Wait for auth check to complete
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('redirects to login when session expires [FR-AUTH-002]', async () => {
    // Override handler to return 401
    server.use(
      http.get('/api/me', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });
  });

  it('switches tenant and updates API header [FR-TENANT-002]', async () => {
    const user = userEvent.setup();
    let capturedTenantHeader: string | null = null;

    server.use(
      http.get('/api/users', ({ request }) => {
        capturedTenantHeader = request.headers.get('X-Tenant-ID');
        return HttpResponse.json([]);
      })
    );

    render(
      <MemoryRouter initialEntries={['/users']}>
        <App />
      </MemoryRouter>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /tenant/i })).toBeInTheDocument();
    });

    // Switch tenant
    await user.selectOptions(
      screen.getByRole('combobox', { name: /tenant/i }),
      'tenant-2'
    );

    // Verify API called with new tenant header
    await waitFor(() => {
      expect(capturedTenantHeader).toBe('tenant-2');
    });
  });
});
```

---

## End-to-End Testing

### Playwright Setup (Optional)

For full E2E tests against deployed environments:

```typescript
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

```typescript
// e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('can login and access dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Wait for auth check
    await page.waitForSelector('[data-testid="login-button"]');
    
    // Click login (redirects to SSO)
    await page.click('[data-testid="login-button"]');
    
    // In E2E with real SSO, would need to handle SSO login flow
    // For local testing, might use mock SSO or bypass
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Backend Unit Tests
        run: |
          cd backend
          go test ./internal/... -v -coverprofile=coverage.out

      - name: Frontend Unit Tests
        run: |
          cd frontend
          npm ci
          npm run test -- --coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      dynamodb-local:
        image: amazon/dynamodb-local:latest
        ports:
          - 8000:8000

    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Wait for DynamoDB Local
        run: |
          timeout 30 sh -c 'until curl -s http://localhost:8000; do sleep 1; done'

      - name: Backend Integration Tests
        env:
          DYNAMODB_ENDPOINT: http://localhost:8000
        run: |
          cd backend
          go test ./test/integration/... -v

      - name: Frontend Integration Tests
        run: |
          cd frontend
          npm ci
          npm run test -- --config vitest.integration.config.ts
```

---

## Requirements Traceability

### Integration Test Coverage Matrix

| Requirement | Test File | Test Function | Status |
|-------------|-----------|---------------|--------|
| FR-AUTH-001 | `api_test.go` | `TestGetCurrentUser_Authenticated` | ✅ |
| FR-AUTH-002 | `api_test.go` | `TestGetCurrentUser_Unauthenticated` | ✅ |
| FR-AUTH-003 | `api_test.go` | `TestGetCurrentUser_Authenticated` | ✅ |
| FR-TENANT-003 | `api_test.go` | `TestTenantIsolation_QueriesAreTenantScoped` | ✅ |
| FR-TENANT-004 | `api_test.go` | `TestTenantIsolation_QueriesAreTenantScoped` | ✅ |
| NFR-AVAIL-003 | `api_test.go` | `TestHealthEndpoint_ReturnsHealthy` | ✅ |
| NFR-SEC-004 | `api_test.go` | `TestAPIError_ReturnsStandardFormat` | ✅ |

### Running Integration Tests

```bash
# Full integration test suite
make test-integration

# Backend only (assumes DynamoDB Local is running)
cd backend && go test ./test/integration/... -v

# Frontend only
cd frontend && npm run test:integration

# With coverage
cd backend && go test ./test/integration/... -v -coverprofile=integration-coverage.out
```

---

## Best Practices Summary

1. **Isolate each test** - Use unique table names or clean up between tests
2. **Use realistic fixtures** - Test data should mirror production patterns
3. **Test error paths** - Integration tests should verify error responses
4. **Keep tests independent** - No test should depend on another test's state
5. **Document requirements** - Link tests to requirements for traceability
6. **Automate in CI** - Integration tests must run in CI pipeline
7. **Mock external services** - Don't hit real external APIs in tests
8. **Use test containers** - Docker makes test dependencies reproducible

---

*Document version: 1.0.0*
*Last updated: 2026-02-19*
