package models

import "time"

// BaseModel provides common fields for all entities
type BaseModel struct {
	ID        string    `json:"id" dynamodbav:"id"`
	TenantID  string    `json:"tenant_id" dynamodbav:"tenant_id"`
	CreatedAt time.Time `json:"created_at" dynamodbav:"created_at"`
	UpdatedAt time.Time `json:"updated_at" dynamodbav:"updated_at"`
}

// Example domain model - replace with your app's models
type Example struct {
	BaseModel
	Name        string `json:"name" dynamodbav:"name"`
	Description string `json:"description" dynamodbav:"description"`
}
