package repository

import (
	"context"
	"errors"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
)

// DynamoDB implements Repository using AWS DynamoDB
type DynamoDB struct {
	client    *dynamodb.Client
	tableName string
}

// NewDynamoDB creates a new DynamoDB repository
func NewDynamoDB(tableName string) (*DynamoDB, error) {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		return nil, err
	}

	return &DynamoDB{
		client:    dynamodb.NewFromConfig(cfg),
		tableName: tableName,
	}, nil
}

// DynamoDB key structure:
// Users: PK=USER#<id>, SK=USER#<id>
// Users by email: PK=EMAIL#<email>, SK=EMAIL#<email>
// Users by API key: PK=APIKEY#<key>, SK=APIKEY#<key>
// Sessions: PK=SESSION#<token>, SK=SESSION#<token>

type userItem struct {
	PK        string `dynamodbav:"PK"`
	SK        string `dynamodbav:"SK"`
	ID        string `dynamodbav:"ID"`
	Email     string `dynamodbav:"Email"`
	Name      string `dynamodbav:"Name"`
	Role      string `dynamodbav:"Role"`
	APIKey    string `dynamodbav:"APIKey,omitempty"`
	SSOUserID string `dynamodbav:"SSOUserID,omitempty"`
	CreatedAt string `dynamodbav:"CreatedAt"`
	UpdatedAt string `dynamodbav:"UpdatedAt"`
}

type sessionItem struct {
	PK        string `dynamodbav:"PK"`
	SK        string `dynamodbav:"SK"`
	Token     string `dynamodbav:"Token"`
	UserID    string `dynamodbav:"UserID"`
	ExpiresAt int64  `dynamodbav:"ExpiresAt"`
	CreatedAt string `dynamodbav:"CreatedAt"`
	TTL       int64  `dynamodbav:"TTL"`
}

// GetUserByID retrieves a user by ID
func (d *DynamoDB) GetUserByID(ctx context.Context, id string) (*User, error) {
	result, err := d.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(d.tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: "USER#" + id},
			"SK": &types.AttributeValueMemberS{Value: "USER#" + id},
		},
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, errors.New("user not found")
	}

	var item userItem
	if err := attributevalue.UnmarshalMap(result.Item, &item); err != nil {
		return nil, err
	}

	return d.itemToUser(&item), nil
}

// GetUserByEmail retrieves a user by email
func (d *DynamoDB) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	// First, get the user ID from the email index
	result, err := d.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(d.tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: "EMAIL#" + email},
			"SK": &types.AttributeValueMemberS{Value: "EMAIL#" + email},
		},
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, errors.New("user not found")
	}

	// Extract user ID and fetch full user
	var ref struct {
		UserID string `dynamodbav:"UserID"`
	}
	if err := attributevalue.UnmarshalMap(result.Item, &ref); err != nil {
		return nil, err
	}

	return d.GetUserByID(ctx, ref.UserID)
}

// GetUserByAPIKey retrieves a user by API key
func (d *DynamoDB) GetUserByAPIKey(ctx context.Context, apiKey string) (*User, error) {
	result, err := d.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(d.tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: "APIKEY#" + apiKey},
			"SK": &types.AttributeValueMemberS{Value: "APIKEY#" + apiKey},
		},
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, errors.New("user not found")
	}

	var ref struct {
		UserID string `dynamodbav:"UserID"`
	}
	if err := attributevalue.UnmarshalMap(result.Item, &ref); err != nil {
		return nil, err
	}

	return d.GetUserByID(ctx, ref.UserID)
}

// CreateUser creates a new user
func (d *DynamoDB) CreateUser(ctx context.Context, user *User) error {
	if user.ID == "" {
		user.ID = uuid.New().String()
	}
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	item := d.userToItem(user)

	// Write user item
	userAV, err := attributevalue.MarshalMap(item)
	if err != nil {
		return err
	}

	// Write email index item
	emailItem := map[string]types.AttributeValue{
		"PK":     &types.AttributeValueMemberS{Value: "EMAIL#" + user.Email},
		"SK":     &types.AttributeValueMemberS{Value: "EMAIL#" + user.Email},
		"UserID": &types.AttributeValueMemberS{Value: user.ID},
	}

	// Use TransactWrite to ensure atomicity
	_, err = d.client.TransactWriteItems(ctx, &dynamodb.TransactWriteItemsInput{
		TransactItems: []types.TransactWriteItem{
			{
				Put: &types.Put{
					TableName: aws.String(d.tableName),
					Item:      userAV,
				},
			},
			{
				Put: &types.Put{
					TableName: aws.String(d.tableName),
					Item:      emailItem,
				},
			},
		},
	})

	return err
}

// UpdateUser updates an existing user
func (d *DynamoDB) UpdateUser(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now()
	item := d.userToItem(user)

	av, err := attributevalue.MarshalMap(item)
	if err != nil {
		return err
	}

	_, err = d.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(d.tableName),
		Item:      av,
	})

	return err
}

// GetSession retrieves a session by token
func (d *DynamoDB) GetSession(ctx context.Context, token string) (*Session, error) {
	result, err := d.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(d.tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: "SESSION#" + token},
			"SK": &types.AttributeValueMemberS{Value: "SESSION#" + token},
		},
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, errors.New("session not found")
	}

	var item sessionItem
	if err := attributevalue.UnmarshalMap(result.Item, &item); err != nil {
		return nil, err
	}

	return d.itemToSession(&item), nil
}

// CreateSession creates a new session
func (d *DynamoDB) CreateSession(ctx context.Context, session *Session) error {
	session.CreatedAt = time.Now()
	item := d.sessionToItem(session)

	av, err := attributevalue.MarshalMap(item)
	if err != nil {
		return err
	}

	_, err = d.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(d.tableName),
		Item:      av,
	})

	return err
}

// UpdateSession updates an existing session
func (d *DynamoDB) UpdateSession(ctx context.Context, session *Session) error {
	item := d.sessionToItem(session)

	av, err := attributevalue.MarshalMap(item)
	if err != nil {
		return err
	}

	_, err = d.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(d.tableName),
		Item:      av,
	})

	return err
}

// DeleteSession deletes a session
func (d *DynamoDB) DeleteSession(ctx context.Context, token string) error {
	_, err := d.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(d.tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: "SESSION#" + token},
			"SK": &types.AttributeValueMemberS{Value: "SESSION#" + token},
		},
	})

	return err
}

// Helper methods for conversion
func (d *DynamoDB) userToItem(user *User) *userItem {
	return &userItem{
		PK:        "USER#" + user.ID,
		SK:        "USER#" + user.ID,
		ID:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		Role:      user.Role,
		APIKey:    user.APIKey,
		SSOUserID: user.SSOUserID,
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
		UpdatedAt: user.UpdatedAt.Format(time.RFC3339),
	}
}

func (d *DynamoDB) itemToUser(item *userItem) *User {
	createdAt, _ := time.Parse(time.RFC3339, item.CreatedAt)
	updatedAt, _ := time.Parse(time.RFC3339, item.UpdatedAt)

	return &User{
		ID:        item.ID,
		Email:     item.Email,
		Name:      item.Name,
		Role:      item.Role,
		APIKey:    item.APIKey,
		SSOUserID: item.SSOUserID,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}
}

func (d *DynamoDB) sessionToItem(session *Session) *sessionItem {
	return &sessionItem{
		PK:        "SESSION#" + session.Token,
		SK:        "SESSION#" + session.Token,
		Token:     session.Token,
		UserID:    session.UserID,
		ExpiresAt: session.ExpiresAt.Unix(),
		CreatedAt: session.CreatedAt.Format(time.RFC3339),
		TTL:       session.ExpiresAt.Unix(), // DynamoDB TTL
	}
}

func (d *DynamoDB) itemToSession(item *sessionItem) *Session {
	createdAt, _ := time.Parse(time.RFC3339, item.CreatedAt)

	return &Session{
		Token:     item.Token,
		UserID:    item.UserID,
		ExpiresAt: time.Unix(item.ExpiresAt, 0),
		CreatedAt: createdAt,
	}
}
