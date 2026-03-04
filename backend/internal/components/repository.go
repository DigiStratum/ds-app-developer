package components

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	internaldynamo "github.com/DigiStratum/ds-app-developer/backend/internal/dynamo"
)

// Repository provides component storage operations using DynamoDB.
// Components are NOT tenant-scoped - they are global registry items.
//
// Key structure:
//   - PK: COMPONENT#{name}
//   - SK: METADATA (for component) or VERSION#{version} (for versions)
type Repository struct {
	repo *internaldynamo.Repository
}

// NewRepository creates a new component repository.
func NewRepository(repo *internaldynamo.Repository) *Repository {
	return &Repository{repo: repo}
}

// buildComponentPK builds the partition key for a component
func buildComponentPK(name string) string {
	return fmt.Sprintf("COMPONENT#%s", name)
}

// RegisterComponent creates a new component in the registry.
// Returns an error if a component with this name already exists.
func (r *Repository) RegisterComponent(ctx context.Context, component *Component) error {
	pk := buildComponentPK(component.Name)
	sk := "METADATA"

	item, err := attributevalue.MarshalMap(component)
	if err != nil {
		return fmt.Errorf("failed to marshal component: %w", err)
	}

	item["PK"] = &types.AttributeValueMemberS{Value: pk}
	item["SK"] = &types.AttributeValueMemberS{Value: sk}

	// Use conditional expression to prevent overwriting existing component
	_, err = r.repo.Client().PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.repo.TableName()),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(PK)"),
	})
	if err != nil {
		var condErr *types.ConditionalCheckFailedException
		if errors.As(err, &condErr) {
			return fmt.Errorf("component %s already exists", component.Name)
		}
		return fmt.Errorf("failed to register component: %w", err)
	}

	return nil
}

// GetComponent retrieves a component by name.
// Returns nil if the component does not exist.
func (r *Repository) GetComponent(ctx context.Context, name string) (*Component, error) {
	pk := buildComponentPK(name)
	sk := "METADATA"

	result, err := r.repo.Client().GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.repo.TableName()),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: pk},
			"SK": &types.AttributeValueMemberS{Value: sk},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get component: %w", err)
	}

	if result.Item == nil {
		return nil, nil
	}

	var component Component
	if err := attributevalue.UnmarshalMap(result.Item, &component); err != nil {
		return nil, fmt.Errorf("failed to unmarshal component: %w", err)
	}

	return &component, nil
}

// ListComponents retrieves all components.
// This uses a Scan which is acceptable since components are global (not tenant-scoped).
func (r *Repository) ListComponents(ctx context.Context) ([]*Component, error) {
	var components []*Component

	paginator := dynamodb.NewScanPaginator(r.repo.Client(), &dynamodb.ScanInput{
		TableName:        aws.String(r.repo.TableName()),
		FilterExpression: aws.String("begins_with(PK, :prefix) AND SK = :sk"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":prefix": &types.AttributeValueMemberS{Value: "COMPONENT#"},
			":sk":     &types.AttributeValueMemberS{Value: "METADATA"},
		},
	})

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to scan components: %w", err)
		}

		for _, item := range page.Items {
			var component Component
			if err := attributevalue.UnmarshalMap(item, &component); err != nil {
				return nil, fmt.Errorf("failed to unmarshal component: %w", err)
			}
			components = append(components, &component)
		}
	}

	return components, nil
}

// UpdateComponent updates component metadata.
func (r *Repository) UpdateComponent(ctx context.Context, component *Component) error {
	pk := buildComponentPK(component.Name)
	sk := "METADATA"

	component.UpdatedAt = time.Now()

	item, err := attributevalue.MarshalMap(component)
	if err != nil {
		return fmt.Errorf("failed to marshal component: %w", err)
	}

	item["PK"] = &types.AttributeValueMemberS{Value: pk}
	item["SK"] = &types.AttributeValueMemberS{Value: sk}

	// Ensure component exists
	_, err = r.repo.Client().PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.repo.TableName()),
		Item:                item,
		ConditionExpression: aws.String("attribute_exists(PK)"),
	})
	if err != nil {
		var condErr *types.ConditionalCheckFailedException
		if errors.As(err, &condErr) {
			return fmt.Errorf("component %s not found", component.Name)
		}
		return fmt.Errorf("failed to update component: %w", err)
	}

	return nil
}

// PublishVersion stores a new version for a component.
// Also updates the component's latest_version.
func (r *Repository) PublishVersion(ctx context.Context, version *Version) error {
	pk := buildComponentPK(version.ComponentName)
	sk := fmt.Sprintf("VERSION#%s", version.Version)

	item, err := attributevalue.MarshalMap(version)
	if err != nil {
		return fmt.Errorf("failed to marshal version: %w", err)
	}

	item["PK"] = &types.AttributeValueMemberS{Value: pk}
	item["SK"] = &types.AttributeValueMemberS{Value: sk}

	// Use transaction to atomically publish version and update latest_version
	_, err = r.repo.Client().TransactWriteItems(ctx, &dynamodb.TransactWriteItemsInput{
		TransactItems: []types.TransactWriteItem{
			{
				// Write the version
				Put: &types.Put{
					TableName:           aws.String(r.repo.TableName()),
					Item:                item,
					ConditionExpression: aws.String("attribute_not_exists(PK)"),
				},
			},
			{
				// Update component's latest_version
				Update: &types.Update{
					TableName: aws.String(r.repo.TableName()),
					Key: map[string]types.AttributeValue{
						"PK": &types.AttributeValueMemberS{Value: pk},
						"SK": &types.AttributeValueMemberS{Value: "METADATA"},
					},
					UpdateExpression: aws.String("SET latest_version = :version, updated_at = :now"),
					ExpressionAttributeValues: map[string]types.AttributeValue{
						":version": &types.AttributeValueMemberS{Value: version.Version},
						":now":     &types.AttributeValueMemberS{Value: time.Now().Format(time.RFC3339)},
					},
					ConditionExpression: aws.String("attribute_exists(PK)"),
				},
			},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to publish version: %w", err)
	}

	return nil
}

// GetVersion retrieves a specific version of a component.
func (r *Repository) GetVersion(ctx context.Context, componentName, version string) (*Version, error) {
	pk := buildComponentPK(componentName)
	sk := fmt.Sprintf("VERSION#%s", version)

	result, err := r.repo.Client().GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.repo.TableName()),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: pk},
			"SK": &types.AttributeValueMemberS{Value: sk},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get version: %w", err)
	}

	if result.Item == nil {
		return nil, nil
	}

	var v Version
	if err := attributevalue.UnmarshalMap(result.Item, &v); err != nil {
		return nil, fmt.Errorf("failed to unmarshal version: %w", err)
	}

	return &v, nil
}

// ListVersions retrieves all versions for a component.
func (r *Repository) ListVersions(ctx context.Context, componentName string) ([]*Version, error) {
	pk := buildComponentPK(componentName)

	result, err := r.repo.Client().Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.repo.TableName()),
		KeyConditionExpression: aws.String("PK = :pk AND begins_with(SK, :prefix)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk":     &types.AttributeValueMemberS{Value: pk},
			":prefix": &types.AttributeValueMemberS{Value: "VERSION#"},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query versions: %w", err)
	}

	var versions []*Version
	for _, item := range result.Items {
		var v Version
		if err := attributevalue.UnmarshalMap(item, &v); err != nil {
			return nil, fmt.Errorf("failed to unmarshal version: %w", err)
		}
		versions = append(versions, &v)
	}

	return versions, nil
}

// DeprecateVersion marks a version as deprecated.
func (r *Repository) DeprecateVersion(ctx context.Context, componentName, version, message string) error {
	pk := buildComponentPK(componentName)
	sk := fmt.Sprintf("VERSION#%s", version)

	_, err := r.repo.Client().UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String(r.repo.TableName()),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: pk},
			"SK": &types.AttributeValueMemberS{Value: sk},
		},
		UpdateExpression: aws.String("SET deprecated = :true, deprecation_message = :msg"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":true": &types.AttributeValueMemberBOOL{Value: true},
			":msg":  &types.AttributeValueMemberS{Value: message},
		},
		ConditionExpression: aws.String("attribute_exists(PK)"),
	})
	if err != nil {
		var condErr *types.ConditionalCheckFailedException
		if errors.As(err, &condErr) {
			return fmt.Errorf("version %s@%s not found", componentName, version)
		}
		return fmt.Errorf("failed to deprecate version: %w", err)
	}

	return nil
}

// DeleteVersion removes a version from the registry.
// This does NOT delete the S3 artifact - that should be handled separately.
func (r *Repository) DeleteVersion(ctx context.Context, componentName, version string) error {
	pk := buildComponentPK(componentName)
	sk := fmt.Sprintf("VERSION#%s", version)

	_, err := r.repo.Client().DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.repo.TableName()),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: pk},
			"SK": &types.AttributeValueMemberS{Value: sk},
		},
		ConditionExpression: aws.String("attribute_exists(PK)"),
	})
	if err != nil {
		var condErr *types.ConditionalCheckFailedException
		if errors.As(err, &condErr) {
			return fmt.Errorf("version %s@%s not found", componentName, version)
		}
		return fmt.Errorf("failed to delete version: %w", err)
	}

	return nil
}
