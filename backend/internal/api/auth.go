package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/digistratum/ds-app-skeleton/internal/repository"
)

type contextKey string

const userContextKey contextKey = "user"

// authMiddleware validates session tokens
func (h *Handler) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try session cookie first
		cookie, err := r.Cookie("session")
		if err == nil && cookie.Value != "" {
			if user, err := h.sessions.ValidateSession(r.Context(), cookie.Value); err == nil {
				ctx := context.WithValue(r.Context(), userContextKey, user)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
		}

		// Try Authorization header
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			if user, err := h.sessions.ValidateSession(r.Context(), token); err == nil {
				ctx := context.WithValue(r.Context(), userContextKey, user)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
		}

		// Try API key
		apiKey := r.Header.Get("X-API-Key")
		if apiKey != "" {
			if user, err := h.repo.GetUserByAPIKey(r.Context(), apiKey); err == nil {
				ctx := context.WithValue(r.Context(), userContextKey, user)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
		}

		h.errorResponse(w, http.StatusUnauthorized, "Authentication required")
	})
}

// getUserFromContext extracts user from request context
func getUserFromContext(r *http.Request) *repository.User {
	if user, ok := r.Context().Value(userContextKey).(*repository.User); ok {
		return user
	}
	return nil
}

// me returns the current authenticated user
func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user == nil {
		h.errorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	h.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"id":    user.ID,
		"email": user.Email,
		"name":  user.Name,
		"role":  user.Role,
	})
}

// logout ends the current session
func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	// Clear session cookie
	cookie, err := r.Cookie("session")
	if err == nil && cookie.Value != "" {
		h.sessions.InvalidateSession(r.Context(), cookie.Value)
	}

	// Clear cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	h.jsonResponse(w, http.StatusOK, map[string]string{"message": "Logged out"})
}

// refreshSession extends the current session
func (h *Handler) refreshSession(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil || cookie.Value == "" {
		h.errorResponse(w, http.StatusUnauthorized, "No session")
		return
	}

	expiresAt, err := h.sessions.RefreshSession(r.Context(), cookie.Value)
	if err != nil {
		h.errorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	h.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"expires_at": expiresAt.Unix(),
	})
}

// generateState creates a random state token for CSRF protection
func generateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// ssoInitiate starts the SSO login flow
func (h *Handler) ssoInitiate(w http.ResponseWriter, r *http.Request) {
	if !h.ssoClient.Enabled() {
		h.errorResponse(w, http.StatusServiceUnavailable, "SSO not configured")
		return
	}

	// Generate state for CSRF protection
	state := generateState()

	// Store return URL in state cookie
	returnURL := r.URL.Query().Get("return_url")
	if returnURL == "" {
		returnURL = "/"
	}

	// Set state cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "sso_state",
		Value:    state + "|" + returnURL,
		Path:     "/",
		MaxAge:   600, // 10 minutes
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	// Redirect to DSAccount
	authURL := h.ssoClient.GetAuthorizationURL(state)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// ssoCallback handles the OAuth callback from DSAccount
func (h *Handler) ssoCallback(w http.ResponseWriter, r *http.Request) {
	if !h.ssoClient.Enabled() {
		h.errorResponse(w, http.StatusServiceUnavailable, "SSO not configured")
		return
	}

	// Verify state
	stateCookie, err := r.Cookie("sso_state")
	if err != nil {
		h.errorResponse(w, http.StatusBadRequest, "Missing state cookie")
		return
	}

	parts := strings.SplitN(stateCookie.Value, "|", 2)
	expectedState := parts[0]
	returnURL := "/"
	if len(parts) > 1 {
		returnURL = parts[1]
	}

	state := r.URL.Query().Get("state")
	if state != expectedState {
		h.errorResponse(w, http.StatusBadRequest, "Invalid state")
		return
	}

	// Check for error from DSAccount
	if errMsg := r.URL.Query().Get("error"); errMsg != "" {
		h.errorResponse(w, http.StatusUnauthorized, "SSO error: "+errMsg)
		return
	}

	// Exchange code for token
	code := r.URL.Query().Get("code")
	if code == "" {
		h.errorResponse(w, http.StatusBadRequest, "Missing authorization code")
		return
	}

	tokenResp, err := h.ssoClient.ExchangeCode(code)
	if err != nil {
		h.errorResponse(w, http.StatusUnauthorized, "Failed to exchange code: "+err.Error())
		return
	}

	// Get user info
	userInfo, err := h.ssoClient.GetUserInfo(tokenResp.AccessToken)
	if err != nil {
		h.errorResponse(w, http.StatusUnauthorized, "Failed to get user info: "+err.Error())
		return
	}

	// Find or create user
	user, err := h.repo.GetUserByEmail(r.Context(), userInfo.Email)
	if err != nil {
		// Create new user from SSO
		user = &repository.User{
			Email:     userInfo.Email,
			Name:      userInfo.Name,
			Role:      "user",
			SSOUserID: userInfo.ID,
		}
		if err := h.repo.CreateUser(r.Context(), user); err != nil {
			h.errorResponse(w, http.StatusInternalServerError, "Failed to create user")
			return
		}
	}

	// Create session
	token, expiresAt, err := h.sessions.CreateSession(r.Context(), user)
	if err != nil {
		h.errorResponse(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	// Clear state cookie
	http.SetCookie(w, &http.Cookie{
		Name:   "sso_state",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	// Redirect to return URL
	http.Redirect(w, r, returnURL, http.StatusFound)
}
