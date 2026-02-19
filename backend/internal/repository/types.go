package repository

import (
	"context"
	"time"
)

// User represents a user in the system
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"` // "admin", "user"
	APIKey    string    `json:"-"`    // For API authentication
	SSOUserID string    `json:"-"`    // DSAccount user ID
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Session represents an active user session
type Session struct {
	Token     string    `json:"token"`
	UserID    string    `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// Repository defines the data access interface
type Repository interface {
	// User operations
	GetUserByID(ctx context.Context, id string) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByAPIKey(ctx context.Context, apiKey string) (*User, error)
	CreateUser(ctx context.Context, user *User) error
	UpdateUser(ctx context.Context, user *User) error

	// Session operations
	GetSession(ctx context.Context, token string) (*Session, error)
	CreateSession(ctx context.Context, session *Session) error
	UpdateSession(ctx context.Context, session *Session) error
	DeleteSession(ctx context.Context, token string) error

	// Add your app-specific operations here
	// Example:
	// ListItems(ctx context.Context, userID string) ([]*Item, error)
	// GetItem(ctx context.Context, id string) (*Item, error)
	// CreateItem(ctx context.Context, item *Item) error
	// UpdateItem(ctx context.Context, item *Item) error
	// DeleteItem(ctx context.Context, id string) error
}
