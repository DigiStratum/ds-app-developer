package auth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"time"
)

// tokenResponse represents DSAccount's /api/sso/token response
type tokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// CallbackHandler handles SSO callback [FR-AUTH-001]
// This exchanges the authorization code with DSAccount for a session token,
// then sets the ds_session cookie to use across *.digistratum.com
func CallbackHandler(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}

	slog.Info("SSO callback received", "code_length", len(code))

	// Exchange code for token with DSAccount
	ssoURL := os.Getenv("DSACCOUNT_SSO_URL")
	if ssoURL == "" {
		ssoURL = "https://account.digistratum.com"
	}

	appID := os.Getenv("DSACCOUNT_APP_ID")
	appSecret := os.Getenv("DSACCOUNT_APP_SECRET")

	tokenReq := map[string]string{
		"code":       code,
		"app_id":     appID,
		"app_secret": appSecret,
	}
	tokenBody, _ := json.Marshal(tokenReq)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(ssoURL+"/api/sso/token", "application/json", bytes.NewReader(tokenBody))
	if err != nil {
		slog.Error("failed to exchange code for token", "error", err)
		http.Error(w, "Failed to authenticate", http.StatusInternalServerError)
		return
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		slog.Error("token exchange failed", "status", resp.StatusCode, "body", string(body))
		http.Error(w, "Authentication failed", http.StatusUnauthorized)
		return
	}

	var tokenResp tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		slog.Error("failed to decode token response", "error", err)
		http.Error(w, "Failed to process authentication", http.StatusInternalServerError)
		return
	}

	slog.Info("token exchange successful", "token_type", tokenResp.TokenType, "expires_in", tokenResp.ExpiresIn)

	// NOTE: We do NOT set ds_session cookie here.
	// DSAccount already set it when the user logged in.
	// The cookie is shared across *.digistratum.com subdomains.

	// Get redirect URL from state param (how OAuth returns our original redirect)
	redirectURL := r.URL.Query().Get("state")
	if redirectURL == "" {
		redirectURL = "/"
	}

	// Validate redirect URL to prevent open redirect
	// Only allow relative paths or same-origin
	if len(redirectURL) > 0 && redirectURL[0] != '/' {
		redirectURL = "/"
	}

	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// LogoutHandler handles logout [FR-AUTH-004]
// Clears the session cookie and redirects to DSAccount logout
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// Clear the ds_session cookie
	cookie := &http.Cookie{
		Name:     "ds_session",
		Value:    "",
		Path:     "/",
		Domain:   ".digistratum.com",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	}
	http.SetCookie(w, cookie)

	slog.Info("session cookie cleared on logout")

	// Redirect to DSAccount logout (with return URL)
	ssoURL := os.Getenv("DSACCOUNT_SSO_URL")
	if ssoURL == "" {
		ssoURL = "https://account.digistratum.com"
	}
	
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "https://developer.digistratum.com"
	}
	
	// Include redirect_uri so DSAccount can redirect back after logout
	http.Redirect(w, r, fmt.Sprintf("%s/api/sso/logout?redirect_uri=%s", ssoURL, appURL), http.StatusFound)
}

// LoginHandler initiates the SSO login flow [FR-AUTH-001]
// Redirects to DSAccount's authorize endpoint with:
// - app_id: identifies this app (DSAccount uses registered redirect_uri)
// - state: preserves the user's intended destination through the auth flow
// SECURITY: redirect_uri is NOT passed in URL - DSAccount uses the registered value
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	ssoURL := os.Getenv("DSACCOUNT_SSO_URL")
	if ssoURL == "" {
		ssoURL = "https://account.digistratum.com"
	}

	// Preserve the user's intended destination through the auth flow (passed as state)
	redirectPath := r.URL.Query().Get("redirect")
	if redirectPath == "" {
		redirectPath = "/"
	}

	// Build the OAuth authorize URL with properly encoded parameters
	// SECURITY: Only app_id is passed. redirect_uri comes from DSAccount app registration
	// to prevent open redirect vulnerabilities.
	params := url.Values{}
	params.Set("app_id", os.Getenv("DSACCOUNT_APP_ID"))
	params.Set("state", redirectPath)

	authURL := ssoURL + "/api/sso/authorize?" + params.Encode()

	slog.Info("initiating SSO login", "auth_url", authURL)
	http.Redirect(w, r, authURL, http.StatusFound)
}
