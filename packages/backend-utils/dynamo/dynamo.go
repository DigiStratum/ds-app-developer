// Package dynamo provides DynamoDB utilities and tenant-aware key builders.
package dynamo

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

// Repository provides base DynamoDB operations
type Repository struct {
	client    *dynamodb.Client
	tableName string
}

// NewRepository creates a new repository instance
func NewRepository(ctx context.Context, tableName string) (*Repository, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := dynamodb.NewFromConfig(cfg)

	// Allow table name override for testing
	if override := os.Getenv("DYNAMODB_TABLE"); override != "" {
		tableName = override
	}

	return &Repository{
		client:    client,
		tableName: tableName,
	}, nil
}

// Client returns the DynamoDB client for custom operations
func (r *Repository) Client() *dynamodb.Client {
	return r.client
}

// TableName returns the table name
func (r *Repository) TableName() string {
	return r.tableName
}

// BuildTenantKey builds a partition key with tenant prefix for tenant-scoped data
func BuildTenantKey(tenantID, entityType, entityID string) string {
	if tenantID == "" {
		tenantID = "PERSONAL"
	}
	return fmt.Sprintf("TENANT#%s#%s#%s", tenantID, entityType, entityID)
}

// BuildTenantPrefix builds a partition key prefix for queries
func BuildTenantPrefix(tenantID, entityType string) string {
	if tenantID == "" {
		tenantID = "PERSONAL"
	}
	return fmt.Sprintf("TENANT#%s#%s#", tenantID, entityType)
}

// BuildGlobalKey builds a partition key for global (non-tenant) data
func BuildGlobalKey(entityType, entityID string) string {
	return fmt.Sprintf("GLOBAL#%s#%s", entityType, entityID)
}

// BuildSortKey builds a sort key with optional timestamp
func BuildSortKey(parts ...string) string {
	result := ""
	for i, part := range parts {
		if i > 0 {
			result += "#"
		}
		result += part
	}
	return result
}
