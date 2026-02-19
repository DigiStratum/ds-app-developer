// Package dsauth provides SSO authentication utilities for DigiStratum applications.
// It integrates with DSAccount for centralized authentication and multi-tenant support.
package dsauth

// User represents an authenticated user from DSAccount SSO.
type User struct {
	ID       string   `json:"id"`
	Email    string   `json:"email"`
	Name     string   `json:"name"`
	Tenants  []string `json:"tenants"`
}

// Config holds the configuration for DSAuth middleware and handlers.
type Config struct {
	// SSOBaseURL is the base URL for DSAccount SSO (e.g., "https://account.digistratum.com")
	SSOBaseURL string

	// AppID is the application ID registered with DSAccount
	AppID string

	// AppURL is the base URL of this application (for redirect_uri)
	AppURL string

	// SessionCookieName is the name of the session cookie (default: "ds_session")
	SessionCookieName string

	// SessionMaxAge is the session duration (default: 24 hours)
	SessionMaxAge int

	// TokenValidator is an optional custom function to validate tokens
	// If nil, uses the default DSAccount validation
	TokenValidator func(token string) (*User, error)
}

// DefaultConfig returns a Config with sensible defaults.
// You must still set SSOBaseURL, AppID, and AppURL.
func DefaultConfig() Config {
	return Config{
		SessionCookieName: "ds_session",
		SessionMaxAge:     86400, // 24 hours
	}
}
