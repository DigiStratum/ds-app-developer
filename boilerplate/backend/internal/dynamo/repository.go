// Package dynamo provides DynamoDB repository operations.
package dynamo

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

// Repository provides DynamoDB operations.
type Repository struct {
	client    *dynamodb.Client
	tableName string
}

// NewRepository creates a new DynamoDB repository.
func NewRepository(client *dynamodb.Client, tableName string) *Repository {
	return &Repository{
		client:    client,
		tableName: tableName,
	}
}

// BuildTenantKey creates a tenant-scoped partition key.
// Format: TENANT#{tenantID}#{entityType}#{entityID}
// This ensures all queries are scoped to a tenant (FR-TENANT-003).
func BuildTenantKey(tenantID, entityType, entityID string) string {
	return fmt.Sprintf("TENANT#%s#%s#%s", tenantID, entityType, entityID)
}

// Example methods - implement based on your needs:

// GetItem retrieves an item by partition key.
func (r *Repository) GetItem(ctx context.Context, pk string) (map[string]interface{}, error) {
	// TODO: Implement DynamoDB GetItem
	return nil, fmt.Errorf("not implemented")
}

// PutItem stores an item.
func (r *Repository) PutItem(ctx context.Context, pk string, item map[string]interface{}) error {
	// TODO: Implement DynamoDB PutItem
	return fmt.Errorf("not implemented")
}

// QueryByTenant queries items for a tenant.
func (r *Repository) QueryByTenant(ctx context.Context, tenantID, entityType string) ([]map[string]interface{}, error) {
	// TODO: Implement DynamoDB Query with tenant-scoped key condition
	return nil, fmt.Errorf("not implemented")
}
