package integration

import (
	"fmt"
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

// WithTenant adds a tenant with users
func (b *FixtureBuilder) WithTenant(tenantID, tenantName string, users ...UserInfo) *FixtureBuilder {
	b.fixtures = append(b.fixtures, TenantFixture(tenantID, tenantName))
	for _, u := range users {
		b.fixtures = append(b.fixtures, UserFixture(tenantID, u.ID, u.Email))
	}
	return b
}

// UserInfo holds user information for fixture building
type UserInfo struct {
	ID    string
	Email string
}

// WithSession adds a session for a user
func (b *FixtureBuilder) WithSession(tenantID, userID string) *FixtureBuilder {
	sessionID := "session-" + userID
	b.fixtures = append(b.fixtures, SessionFixture(tenantID, sessionID, userID, time.Now().Add(24*time.Hour)))
	return b
}

// WithUser adds a single user to a tenant
func (b *FixtureBuilder) WithUser(tenantID, userID, email string) *FixtureBuilder {
	b.fixtures = append(b.fixtures, UserFixture(tenantID, userID, email))
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
