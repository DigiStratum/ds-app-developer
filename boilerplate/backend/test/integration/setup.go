// Package integration provides integration testing utilities for the backend.
// These tests exercise full HTTP handler stacks with real middleware and database.
package integration

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
)

const (
	// DefaultDynamoDBLocalEndpoint is the default endpoint for DynamoDB Local
	DefaultDynamoDBLocalEndpoint = "http://localhost:8000"
)

// TestDB provides an isolated DynamoDB table for tests
type TestDB struct {
	Client    *dynamodb.Client
	TableName string
	Endpoint  string
}

// NewTestDB creates a new test database with a unique table name for test isolation.
// Each test gets its own table to prevent interference between parallel tests.
func NewTestDB(t *testing.T) *TestDB {
	t.Helper()

	// Generate unique table name for test isolation
	tableName := fmt.Sprintf("test-%s-%s", sanitizeTestName(t.Name()), uuid.New().String()[:8])

	endpoint := os.Getenv("DYNAMODB_ENDPOINT")
	if endpoint == "" {
		endpoint = DefaultDynamoDBLocalEndpoint
	}

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
		o.BaseEndpoint = aws.String(endpoint)
	})

	// Create table with schema matching production
	createTestTable(t, client, tableName)

	return &TestDB{
		Client:    client,
		TableName: tableName,
		Endpoint:  endpoint,
	}
}

// createTestTable creates a test table matching the production schema
func createTestTable(t *testing.T, client *dynamodb.Client, tableName string) {
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
		t.Fatalf("failed to create table %s: %v", tableName, err)
	}

	// Wait for table to be active
	waiter := dynamodb.NewTableExistsWaiter(client)
	if err := waiter.Wait(context.Background(), &dynamodb.DescribeTableInput{
		TableName: aws.String(tableName),
	}, 30); err != nil {
		t.Fatalf("table %s did not become active: %v", tableName, err)
	}
}

// Cleanup deletes the test table
func (db *TestDB) Cleanup() {
	_, _ = db.Client.DeleteTable(context.Background(), &dynamodb.DeleteTableInput{
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
	paginator := dynamodb.NewScanPaginator(db.Client, &dynamodb.ScanInput{
		TableName: aws.String(db.TableName),
	})

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(context.Background())
		if err != nil {
			return fmt.Errorf("scan failed: %w", err)
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
				return fmt.Errorf("delete failed: %w", err)
			}
		}
	}
	return nil
}

// sanitizeTestName removes characters that are invalid in DynamoDB table names
func sanitizeTestName(name string) string {
	result := make([]byte, 0, len(name))
	for i := 0; i < len(name); i++ {
		c := name[i]
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' {
			result = append(result, c)
		} else if c == '/' {
			result = append(result, '-')
		}
	}
	return string(result)
}
