// Package models defines domain models for {{APP_NAME}}.
package models

import "time"

// Example model - replace with your domain models.

// Item represents a generic item in the system.
type Item struct {
	ID        string    `json:"id" dynamodbav:"id"`
	TenantID  string    `json:"tenant_id" dynamodbav:"tenant_id"`
	Name      string    `json:"name" dynamodbav:"name"`
	CreatedAt time.Time `json:"created_at" dynamodbav:"created_at"`
	UpdatedAt time.Time `json:"updated_at" dynamodbav:"updated_at"`
}
