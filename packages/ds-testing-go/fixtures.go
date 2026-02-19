package dstesting

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
)

// Fixture represents test data that can be inserted into DynamoDB
type Fixture interface {
	// ToAttributeValues converts the fixture to DynamoDB attribute values
	ToAttributeValues() map[string]types.AttributeValue
}

// FixtureBuilder allows constructing complex test scenarios
type FixtureBuilder struct {
	fixtures []Fixture
}

// NewFixtureBuilder creates a new fixture builder
func NewFixtureBuilder() *FixtureBuilder {
	return &FixtureBuilder{
		fixtures: make([]Fixture, 0),
	}
}

// Add adds a fixture to the builder
func (b *FixtureBuilder) Add(f Fixture) *FixtureBuilder {
	b.fixtures = append(b.fixtures, f)
	return b
}

// Build returns all fixtures
func (b *FixtureBuilder) Build() []Fixture {
	return b.fixtures
}

// Seed inserts all fixtures into the test database
func (b *FixtureBuilder) Seed(db *TestDB) error {
	for _, f := range b.fixtures {
		if err := db.PutItem(f.ToAttributeValues()); err != nil {
			return err
		}
	}
	return nil
}

// SeedItems returns all fixtures as attribute value maps
func (b *FixtureBuilder) SeedItems() []map[string]types.AttributeValue {
	items := make([]map[string]types.AttributeValue, len(b.fixtures))
	for i, f := range b.fixtures {
		items[i] = f.ToAttributeValues()
	}
	return items
}

// UserFixture represents a test user entity
type UserFixture struct {
	TenantID  string
	UserID    string
	Email     string
	Name      string
	CreatedAt time.Time
	Extra     map[string]types.AttributeValue
}

// NewUserFixture creates a user fixture with sensible defaults
func NewUserFixture() *UserFixture {
	id := uuid.New().String()[:8]
	return &UserFixture{
		TenantID:  "tenant-test",
		UserID:    "user-" + id,
		Email:     fmt.Sprintf("user-%s@test.local", id),
		Name:      "Test User " + id,
		CreatedAt: time.Now().UTC(),
		Extra:     make(map[string]types.AttributeValue),
	}
}

// WithTenant sets the tenant ID
func (f *UserFixture) WithTenant(tenantID string) *UserFixture {
	f.TenantID = tenantID
	return f
}

// WithID sets the user ID
func (f *UserFixture) WithID(userID string) *UserFixture {
	f.UserID = userID
	return f
}

// WithEmail sets the email
func (f *UserFixture) WithEmail(email string) *UserFixture {
	f.Email = email
	return f
}

// WithName sets the name
func (f *UserFixture) WithName(name string) *UserFixture {
	f.Name = name
	return f
}

// WithAttribute adds a custom attribute
func (f *UserFixture) WithAttribute(key string, value types.AttributeValue) *UserFixture {
	f.Extra[key] = value
	return f
}

// ToAttributeValues converts the fixture to DynamoDB attribute values
func (f *UserFixture) ToAttributeValues() map[string]types.AttributeValue {
	pk := "TENANT#" + f.TenantID + "#USER"
	sk := "USER#" + f.UserID

	attrs := map[string]types.AttributeValue{
		"PK":         &types.AttributeValueMemberS{Value: pk},
		"SK":         &types.AttributeValueMemberS{Value: sk},
		"EntityType": &types.AttributeValueMemberS{Value: "USER"},
		"TenantID":   &types.AttributeValueMemberS{Value: f.TenantID},
		"UserID":     &types.AttributeValueMemberS{Value: f.UserID},
		"Email":      &types.AttributeValueMemberS{Value: f.Email},
		"Name":       &types.AttributeValueMemberS{Value: f.Name},
		"CreatedAt":  &types.AttributeValueMemberS{Value: f.CreatedAt.Format(time.RFC3339)},
		// GSI1 for email lookup
		"GSI1PK": &types.AttributeValueMemberS{Value: "EMAIL#" + f.Email},
		"GSI1SK": &types.AttributeValueMemberS{Value: "TENANT#" + f.TenantID},
	}

	for k, v := range f.Extra {
		attrs[k] = v
	}

	return attrs
}

// SessionFixture represents a test session entity
type SessionFixture struct {
	TenantID  string
	SessionID string
	UserID    string
	ExpiresAt time.Time
	Extra     map[string]types.AttributeValue
}

// NewSessionFixture creates a session fixture with sensible defaults
func NewSessionFixture(userID string) *SessionFixture {
	return &SessionFixture{
		TenantID:  "tenant-test",
		SessionID: "session-" + uuid.New().String()[:8],
		UserID:    userID,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		Extra:     make(map[string]types.AttributeValue),
	}
}

// WithTenant sets the tenant ID
func (f *SessionFixture) WithTenant(tenantID string) *SessionFixture {
	f.TenantID = tenantID
	return f
}

// WithID sets the session ID
func (f *SessionFixture) WithID(sessionID string) *SessionFixture {
	f.SessionID = sessionID
	return f
}

// WithExpiry sets the expiration time
func (f *SessionFixture) WithExpiry(expiresAt time.Time) *SessionFixture {
	f.ExpiresAt = expiresAt
	return f
}

// ToAttributeValues converts the fixture to DynamoDB attribute values
func (f *SessionFixture) ToAttributeValues() map[string]types.AttributeValue {
	pk := "TENANT#" + f.TenantID + "#SESSION"
	sk := "SESSION#" + f.SessionID

	attrs := map[string]types.AttributeValue{
		"PK":         &types.AttributeValueMemberS{Value: pk},
		"SK":         &types.AttributeValueMemberS{Value: sk},
		"EntityType": &types.AttributeValueMemberS{Value: "SESSION"},
		"TenantID":   &types.AttributeValueMemberS{Value: f.TenantID},
		"SessionID":  &types.AttributeValueMemberS{Value: f.SessionID},
		"UserID":     &types.AttributeValueMemberS{Value: f.UserID},
		"ExpiresAt":  &types.AttributeValueMemberS{Value: f.ExpiresAt.Format(time.RFC3339)},
		"TTL":        &types.AttributeValueMemberN{Value: fmt.Sprint(f.ExpiresAt.Unix())},
	}

	for k, v := range f.Extra {
		attrs[k] = v
	}

	return attrs
}

// TenantFixture represents a test tenant entity
type TenantFixture struct {
	TenantID string
	Name     string
	Extra    map[string]types.AttributeValue
}

// NewTenantFixture creates a tenant fixture with sensible defaults
func NewTenantFixture() *TenantFixture {
	id := uuid.New().String()[:8]
	return &TenantFixture{
		TenantID: "tenant-" + id,
		Name:     "Test Tenant " + id,
		Extra:    make(map[string]types.AttributeValue),
	}
}

// WithID sets the tenant ID
func (f *TenantFixture) WithID(tenantID string) *TenantFixture {
	f.TenantID = tenantID
	return f
}

// WithName sets the tenant name
func (f *TenantFixture) WithName(name string) *TenantFixture {
	f.Name = name
	return f
}

// ToAttributeValues converts the fixture to DynamoDB attribute values
func (f *TenantFixture) ToAttributeValues() map[string]types.AttributeValue {
	pk := "TENANT#" + f.TenantID
	sk := "METADATA"

	attrs := map[string]types.AttributeValue{
		"PK":         &types.AttributeValueMemberS{Value: pk},
		"SK":         &types.AttributeValueMemberS{Value: sk},
		"EntityType": &types.AttributeValueMemberS{Value: "TENANT"},
		"TenantID":   &types.AttributeValueMemberS{Value: f.TenantID},
		"Name":       &types.AttributeValueMemberS{Value: f.Name},
	}

	for k, v := range f.Extra {
		attrs[k] = v
	}

	return attrs
}

// GenericFixture allows creating any entity type
type GenericFixture struct {
	PK         string
	SK         string
	EntityType string
	Attributes map[string]types.AttributeValue
}

// NewGenericFixture creates a generic fixture
func NewGenericFixture(pk, sk, entityType string) *GenericFixture {
	return &GenericFixture{
		PK:         pk,
		SK:         sk,
		EntityType: entityType,
		Attributes: make(map[string]types.AttributeValue),
	}
}

// WithAttribute adds an attribute to the fixture
func (f *GenericFixture) WithAttribute(key string, value types.AttributeValue) *GenericFixture {
	f.Attributes[key] = value
	return f
}

// WithString adds a string attribute
func (f *GenericFixture) WithString(key, value string) *GenericFixture {
	f.Attributes[key] = &types.AttributeValueMemberS{Value: value}
	return f
}

// WithNumber adds a number attribute
func (f *GenericFixture) WithNumber(key string, value int64) *GenericFixture {
	f.Attributes[key] = &types.AttributeValueMemberN{Value: fmt.Sprint(value)}
	return f
}

// WithBool adds a boolean attribute
func (f *GenericFixture) WithBool(key string, value bool) *GenericFixture {
	f.Attributes[key] = &types.AttributeValueMemberBOOL{Value: value}
	return f
}

// ToAttributeValues converts the fixture to DynamoDB attribute values
func (f *GenericFixture) ToAttributeValues() map[string]types.AttributeValue {
	attrs := map[string]types.AttributeValue{
		"PK":         &types.AttributeValueMemberS{Value: f.PK},
		"SK":         &types.AttributeValueMemberS{Value: f.SK},
		"EntityType": &types.AttributeValueMemberS{Value: f.EntityType},
	}

	for k, v := range f.Attributes {
		attrs[k] = v
	}

	return attrs
}
