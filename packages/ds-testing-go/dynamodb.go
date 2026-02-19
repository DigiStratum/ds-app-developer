// Package dstesting provides reusable testing utilities for DigiStratum Go services.
package dstesting

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

// TestDB provides an isolated DynamoDB table for tests.
// Each test gets its own table to prevent interference between parallel tests.
type TestDB struct {
	Client    *dynamodb.Client
	TableName string
	Endpoint  string
	t         *testing.T
}

// TestDBOption configures TestDB behavior
type TestDBOption func(*testDBConfig)

type testDBConfig struct {
	endpoint          string
	customSchema      *TableSchema
	skipTableCreation bool
}

// TableSchema defines the DynamoDB table schema for test tables
type TableSchema struct {
	KeySchema              []types.KeySchemaElement
	AttributeDefinitions   []types.AttributeDefinition
	GlobalSecondaryIndexes []types.GlobalSecondaryIndex
	LocalSecondaryIndexes  []types.LocalSecondaryIndex
}

// DefaultTableSchema returns the standard single-table design schema
// with PK/SK keys and one GSI (GSI1PK/GSI1SK)
func DefaultTableSchema() *TableSchema {
	return &TableSchema{
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
	}
}

// WithEndpoint sets a custom DynamoDB endpoint
func WithEndpoint(endpoint string) TestDBOption {
	return func(c *testDBConfig) {
		c.endpoint = endpoint
	}
}

// WithSchema sets a custom table schema
func WithSchema(schema *TableSchema) TestDBOption {
	return func(c *testDBConfig) {
		c.customSchema = schema
	}
}

// WithoutTableCreation skips table creation (for using existing tables)
func WithoutTableCreation() TestDBOption {
	return func(c *testDBConfig) {
		c.skipTableCreation = true
	}
}

// NewTestDB creates a new test database with a unique table name for test isolation.
// Each test gets its own table to prevent interference between parallel tests.
//
// Example:
//
//	func TestMyFeature(t *testing.T) {
//	    db := dstesting.NewTestDB(t)
//	    defer db.Cleanup()
//
//	    // Use db.Client and db.TableName in your test
//	}
func NewTestDB(t *testing.T, opts ...TestDBOption) *TestDB {
	t.Helper()

	cfg := &testDBConfig{
		endpoint:     os.Getenv("DYNAMODB_ENDPOINT"),
		customSchema: DefaultTableSchema(),
	}
	if cfg.endpoint == "" {
		cfg.endpoint = DefaultDynamoDBLocalEndpoint
	}

	for _, opt := range opts {
		opt(cfg)
	}

	// Generate unique table name for test isolation
	tableName := fmt.Sprintf("test-%s-%s", sanitizeTestName(t.Name()), uuid.New().String()[:8])

	// Configure client for DynamoDB Local
	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion("us-east-1"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			"fake", "fake", "",
		)),
	)
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	client := dynamodb.NewFromConfig(awsCfg, func(o *dynamodb.Options) {
		o.BaseEndpoint = aws.String(cfg.endpoint)
	})

	db := &TestDB{
		Client:    client,
		TableName: tableName,
		Endpoint:  cfg.endpoint,
		t:         t,
	}

	if !cfg.skipTableCreation {
		db.createTable(cfg.customSchema)
	}

	// Register cleanup
	t.Cleanup(func() { db.Cleanup() })

	return db
}

// createTable creates a test table with the given schema
func (db *TestDB) createTable(schema *TableSchema) {
	db.t.Helper()

	input := &dynamodb.CreateTableInput{
		TableName:            aws.String(db.TableName),
		KeySchema:            schema.KeySchema,
		AttributeDefinitions: schema.AttributeDefinitions,
		BillingMode:          types.BillingModePayPerRequest,
	}

	if len(schema.GlobalSecondaryIndexes) > 0 {
		input.GlobalSecondaryIndexes = schema.GlobalSecondaryIndexes
	}
	if len(schema.LocalSecondaryIndexes) > 0 {
		input.LocalSecondaryIndexes = schema.LocalSecondaryIndexes
	}

	_, err := db.Client.CreateTable(context.Background(), input)
	if err != nil {
		db.t.Fatalf("failed to create table %s: %v", db.TableName, err)
	}

	// Wait for table to be active
	waiter := dynamodb.NewTableExistsWaiter(db.Client)
	if err := waiter.Wait(context.Background(), &dynamodb.DescribeTableInput{
		TableName: aws.String(db.TableName),
	}, 30); err != nil {
		db.t.Fatalf("table %s did not become active: %v", db.TableName, err)
	}
}

// Cleanup deletes the test table
func (db *TestDB) Cleanup() {
	_, _ = db.Client.DeleteTable(context.Background(), &dynamodb.DeleteTableInput{
		TableName: aws.String(db.TableName),
	})
}

// PutItem adds an item to the test table
func (db *TestDB) PutItem(item map[string]types.AttributeValue) error {
	_, err := db.Client.PutItem(context.Background(), &dynamodb.PutItemInput{
		TableName: aws.String(db.TableName),
		Item:      item,
	})
	return err
}

// GetItem retrieves an item from the test table
func (db *TestDB) GetItem(key map[string]types.AttributeValue) (*dynamodb.GetItemOutput, error) {
	return db.Client.GetItem(context.Background(), &dynamodb.GetItemInput{
		TableName: aws.String(db.TableName),
		Key:       key,
	})
}

// Query performs a query on the test table
func (db *TestDB) Query(input *dynamodb.QueryInput) (*dynamodb.QueryOutput, error) {
	input.TableName = aws.String(db.TableName)
	return db.Client.Query(context.Background(), input)
}

// Scan performs a scan on the test table
func (db *TestDB) Scan(input *dynamodb.ScanInput) (*dynamodb.ScanOutput, error) {
	input.TableName = aws.String(db.TableName)
	return db.Client.Scan(context.Background(), input)
}

// Clear removes all items from the table (for test cleanup between subtests)
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

// Seed inserts multiple items into the test table
func (db *TestDB) Seed(items ...map[string]types.AttributeValue) error {
	for _, item := range items {
		if err := db.PutItem(item); err != nil {
			return err
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
