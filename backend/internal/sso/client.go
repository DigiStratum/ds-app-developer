package sso

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// Config holds SSO configuration
type Config struct {
	DSAccountURL string // DSAccount base URL (e.g., "https://account.digistratum.com")
	AppID        string // App's ID in DSAccount
	AppSecret    string // App's secret from DSAccount
	RedirectURI  string // OAuth callback URL
}

// Client handles SSO operations with DSAccount
type Client struct {
	config     Config
	httpClient *http.Client
}

// TokenResponse is the response from the token endpoint
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// UserInfo is the response from the userinfo endpoint
type UserInfo struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

// NewClient creates a new SSO client
func NewClient(cfg Config) *Client {
	return &Client{
		config: cfg,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Enabled returns true if SSO is configured
func (c *Client) Enabled() bool {
	return c.config.DSAccountURL != "" && c.config.AppID != "" && c.config.AppSecret != ""
}

// GetConfig returns the SSO configuration (with masked secret)
func (c *Client) GetConfig() Config {
	cfg := c.config
	if len(cfg.AppSecret) > 8 {
		cfg.AppSecret = cfg.AppSecret[:4] + "****" + cfg.AppSecret[len(cfg.AppSecret)-4:]
	} else if cfg.AppSecret != "" {
		cfg.AppSecret = "****"
	}
	return cfg
}

// GetAuthorizationURL returns the URL to redirect users to for SSO login
func (c *Client) GetAuthorizationURL(state string) string {
	params := url.Values{}
	params.Set("app_id", c.config.AppID)
	params.Set("redirect_uri", c.config.RedirectURI)
	if state != "" {
		params.Set("state", state)
	}

	return fmt.Sprintf("%s/api/sso/authorize?%s", c.config.DSAccountURL, params.Encode())
}

// ExchangeCode exchanges an authorization code for an access token
func (c *Client) ExchangeCode(code string) (*TokenResponse, error) {
	reqBody := map[string]string{
		"code":       code,
		"app_id":     c.config.AppID,
		"app_secret": c.config.AppSecret,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal token request: %w", err)
	}

	resp, err := c.httpClient.Post(
		c.config.DSAccountURL+"/api/sso/token",
		"application/json",
		bytes.NewReader(jsonBody),
	)
	if err != nil {
		return nil, fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %w", err)
	}

	return &tokenResp, nil
}

// GetUserInfo fetches user info using the access token
func (c *Client) GetUserInfo(accessToken string) (*UserInfo, error) {
	req, err := http.NewRequest("GET", c.config.DSAccountURL+"/api/sso/userinfo", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create userinfo request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("userinfo request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var userInfo UserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode userinfo response: %w", err)
	}

	return &userInfo, nil
}
