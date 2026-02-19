package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/digistratum/ds-app-skeleton/internal/repository"
)

// SessionManager handles session creation and validation
type SessionManager struct {
	repo           repository.Repository
	jwtSecret      []byte
	sessionTimeout int // minutes
}

// NewSessionManager creates a new session manager
func NewSessionManager(repo repository.Repository, jwtSecret []byte, sessionTimeout int) *SessionManager {
	return &SessionManager{
		repo:           repo,
		jwtSecret:      jwtSecret,
		sessionTimeout: sessionTimeout,
	}
}

// CreateSession creates a new session for a user
func (m *SessionManager) CreateSession(ctx context.Context, user *repository.User) (string, time.Time, error) {
	// Generate session token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", time.Time{}, err
	}
	token := hex.EncodeToString(tokenBytes)

	expiresAt := time.Now().Add(time.Duration(m.sessionTimeout) * time.Minute)

	session := &repository.Session{
		Token:     token,
		UserID:    user.ID,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
	}

	if err := m.repo.CreateSession(ctx, session); err != nil {
		return "", time.Time{}, err
	}

	return token, expiresAt, nil
}

// ValidateSession validates a session token and returns the user
func (m *SessionManager) ValidateSession(ctx context.Context, token string) (*repository.User, error) {
	session, err := m.repo.GetSession(ctx, token)
	if err != nil {
		return nil, err
	}

	if time.Now().After(session.ExpiresAt) {
		m.repo.DeleteSession(ctx, token)
		return nil, errors.New("session expired")
	}

	user, err := m.repo.GetUserByID(ctx, session.UserID)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// RefreshSession extends a session's expiration
func (m *SessionManager) RefreshSession(ctx context.Context, token string) (time.Time, error) {
	session, err := m.repo.GetSession(ctx, token)
	if err != nil {
		return time.Time{}, err
	}

	if time.Now().After(session.ExpiresAt) {
		m.repo.DeleteSession(ctx, token)
		return time.Time{}, errors.New("session expired")
	}

	newExpiry := time.Now().Add(time.Duration(m.sessionTimeout) * time.Minute)
	session.ExpiresAt = newExpiry

	if err := m.repo.UpdateSession(ctx, session); err != nil {
		return time.Time{}, err
	}

	return newExpiry, nil
}

// InvalidateSession deletes a session
func (m *SessionManager) InvalidateSession(ctx context.Context, token string) error {
	return m.repo.DeleteSession(ctx, token)
}
