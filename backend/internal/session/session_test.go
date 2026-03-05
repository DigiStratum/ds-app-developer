// Package session tests for session store and session management.
// Tests FR-SESSION-001, FR-SESSION-002, FR-TENANT-001
package session

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// Tests FR-SESSION-001: Anonymous sessions are created on first visit
func TestStore_Create_CreatesAnonymousSession(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}

	session := store.Create("tenant-123")

	if session == nil {
		t.Fatal("expected session to be created")
	}
	if session.ID == "" {
		t.Error("expected session ID to be set")
	}
	if session.TenantID != "tenant-123" {
		t.Errorf("expected tenant ID 'tenant-123', got %q", session.TenantID)
	}
	if !session.IsGuest {
		t.Error("expected session to be guest")
	}
	if session.IsAuthenticated() {
		t.Error("expected session to not be authenticated")
	}
	if session.CreatedAt.IsZero() {
		t.Error("expected CreatedAt to be set")
	}
	if session.ExpiresAt.IsZero() {
		t.Error("expected ExpiresAt to be set")
	}
	if session.ExpiresAt.Before(time.Now()) {
		t.Error("expected ExpiresAt to be in the future")
	}
}

func TestStore_Create_GeneratesUniqueIDs(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}

	session1 := store.Create("tenant-1")
	session2 := store.Create("tenant-1")

	if session1.ID == session2.ID {
		t.Error("expected unique session IDs")
	}
}

func TestStore_Get_ReturnsExistingSession(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	created := store.Create("tenant-123")

	retrieved := store.Get(created.ID)

	if retrieved == nil {
		t.Fatal("expected to retrieve session")
	}
	if retrieved.ID != created.ID {
		t.Errorf("expected ID %q, got %q", created.ID, retrieved.ID)
	}
}

func TestStore_Get_ReturnsNilForNonexistent(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}

	retrieved := store.Get("nonexistent-id")

	if retrieved != nil {
		t.Error("expected nil for nonexistent session")
	}
}

func TestStore_Get_ReturnsNilForExpired(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}

	// Create expired session
	session := &Session{
		ID:        "expired-session",
		TenantID:  "tenant",
		ExpiresAt: time.Now().Add(-1 * time.Hour), // Expired an hour ago
	}
	store.sessions[session.ID] = session

	retrieved := store.Get(session.ID)

	if retrieved != nil {
		t.Error("expected nil for expired session")
	}
}

// Tests FR-SESSION-002: Authentication upgrades session without replacing it
func TestStore_Upgrade_ConvertsGuestToAuthenticated(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	session := store.Create("tenant-123")
	originalID := session.ID

	upgraded := store.Upgrade(session.ID, "user-456")

	if upgraded == nil {
		t.Fatal("expected upgraded session")
	}
	if upgraded.ID != originalID {
		t.Error("expected session ID to be preserved after upgrade")
	}
	if upgraded.UserID != "user-456" {
		t.Errorf("expected user ID 'user-456', got %q", upgraded.UserID)
	}
	if upgraded.IsGuest {
		t.Error("expected session to no longer be guest")
	}
	if !upgraded.IsAuthenticated() {
		t.Error("expected session to be authenticated")
	}
}

func TestStore_Upgrade_RefreshesExpiry(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	session := store.Create("tenant-123")
	originalExpiry := session.ExpiresAt

	// Wait a tiny bit
	time.Sleep(10 * time.Millisecond)

	upgraded := store.Upgrade(session.ID, "user-456")

	if !upgraded.ExpiresAt.After(originalExpiry) {
		t.Error("expected expiry to be refreshed on upgrade")
	}
}

func TestStore_Upgrade_ReturnsNilForNonexistent(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}

	upgraded := store.Upgrade("nonexistent", "user-123")

	if upgraded != nil {
		t.Error("expected nil for nonexistent session upgrade")
	}
}

// Tests FR-TENANT-001: Sessions can switch tenant context
func TestStore_SetTenant_UpdatesTenantID(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	session := store.Create("initial-tenant")

	updated := store.SetTenant(session.ID, "new-tenant")

	if updated == nil {
		t.Fatal("expected updated session")
	}
	if updated.TenantID != "new-tenant" {
		t.Errorf("expected tenant ID 'new-tenant', got %q", updated.TenantID)
	}
}

func TestStore_Delete_RemovesSession(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	session := store.Create("tenant-123")

	store.Delete(session.ID)

	retrieved := store.Get(session.ID)
	if retrieved != nil {
		t.Error("expected session to be deleted")
	}
}

func TestStore_GetOrCreate_ReturnsExisting(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	existing := store.Create("tenant-123")

	retrieved := store.GetOrCreate(existing.ID, "different-tenant")

	if retrieved.ID != existing.ID {
		t.Error("expected existing session to be returned")
	}
	// Existing session should keep its tenant
	if retrieved.TenantID != "tenant-123" {
		t.Error("expected existing session tenant to be preserved")
	}
}

func TestStore_GetOrCreate_CreatesNewWithProvidedID(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	providedID := "dsaccount-session-12345"

	session := store.GetOrCreate(providedID, "tenant-456")

	if session.ID != providedID {
		t.Errorf("expected provided ID %q, got %q", providedID, session.ID)
	}
	if session.TenantID != "tenant-456" {
		t.Errorf("expected tenant 'tenant-456', got %q", session.TenantID)
	}
}

func TestStore_Save_PersistsSession(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	session := &Session{
		ID:        "manual-session",
		TenantID:  "tenant",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	store.Save(session)

	retrieved := store.Get("manual-session")
	if retrieved == nil {
		t.Error("expected session to be saved")
	}
}

// Test Session methods
func TestSession_IsAuthenticated(t *testing.T) {
	tests := []struct {
		name     string
		userID   string
		expected bool
	}{
		{"empty user ID", "", false},
		{"with user ID", "user-123", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			session := &Session{UserID: tt.userID}
			if session.IsAuthenticated() != tt.expected {
				t.Errorf("expected IsAuthenticated() = %v for userID %q", tt.expected, tt.userID)
			}
		})
	}
}

// Test context helpers
func TestSetSession_GetSession(t *testing.T) {
	session := &Session{ID: "test-session", TenantID: "tenant-123"}
	ctx := context.Background()

	ctx = SetSession(ctx, session)
	retrieved := GetSession(ctx)

	if retrieved == nil {
		t.Fatal("expected session from context")
	}
	if retrieved.ID != session.ID {
		t.Errorf("expected ID %q, got %q", session.ID, retrieved.ID)
	}
}

func TestGetSession_ReturnsNilForEmptyContext(t *testing.T) {
	ctx := context.Background()

	retrieved := GetSession(ctx)

	if retrieved != nil {
		t.Error("expected nil for empty context")
	}
}

// Test cookie domain extraction
func TestGetCookieDomain_ExtractsDomain(t *testing.T) {
	tests := []struct {
		host     string
		expected string
	}{
		{"app.digistratum.com", ".digistratum.com"},
		{"developer.digistratum.com", ".digistratum.com"},
		{"localhost", ""},
		{"localhost:3000", ""},
		{"127.0.0.1", ""},
		{"127.0.0.1:8080", ""},
		{"app.example.io:8080", ".example.io"},
	}

	for _, tt := range tests {
		t.Run(tt.host, func(t *testing.T) {
			result := getCookieDomain(tt.host)
			if result != tt.expected {
				t.Errorf("getCookieDomain(%q) = %q, want %q", tt.host, result, tt.expected)
			}
		})
	}
}

// Test GetSessionIDFromRequest
func TestGetSessionIDFromRequest_FromCookie(t *testing.T) {
	req := httptest.NewRequest("GET", "/test", nil)
	req.AddCookie(&http.Cookie{Name: "ds_session", Value: "session-from-cookie"})

	sessionID := GetSessionIDFromRequest(req)

	if sessionID != "session-from-cookie" {
		t.Errorf("expected 'session-from-cookie', got %q", sessionID)
	}
}

func TestGetSessionIDFromRequest_FromAuthHeader(t *testing.T) {
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer session-from-header")

	sessionID := GetSessionIDFromRequest(req)

	if sessionID != "session-from-header" {
		t.Errorf("expected 'session-from-header', got %q", sessionID)
	}
}

func TestGetSessionIDFromRequest_CookieTakesPrecedence(t *testing.T) {
	req := httptest.NewRequest("GET", "/test", nil)
	req.AddCookie(&http.Cookie{Name: "ds_session", Value: "cookie-session"})
	req.Header.Set("Authorization", "Bearer header-session")

	sessionID := GetSessionIDFromRequest(req)

	if sessionID != "cookie-session" {
		t.Errorf("expected cookie to take precedence, got %q", sessionID)
	}
}

func TestGetSessionIDFromRequest_ReturnsEmptyWhenNone(t *testing.T) {
	req := httptest.NewRequest("GET", "/test", nil)

	sessionID := GetSessionIDFromRequest(req)

	if sessionID != "" {
		t.Errorf("expected empty string, got %q", sessionID)
	}
}

// Test SetSessionCookie
func TestSetSessionCookie_SetsCookie(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.Host = "localhost:3000"

	session := &Session{
		ID:        "test-session-id",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	SetSessionCookie(rec, req, session)

	cookies := rec.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatal("expected cookie to be set")
	}

	var sessionCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "ds_session" {
			sessionCookie = c
			break
		}
	}

	if sessionCookie == nil {
		t.Fatal("expected ds_session cookie")
	}
	if sessionCookie.Value != "test-session-id" {
		t.Errorf("expected value 'test-session-id', got %q", sessionCookie.Value)
	}
	if !sessionCookie.HttpOnly {
		t.Error("expected HttpOnly to be true")
	}
}

// Test ClearSessionCookie
func TestClearSessionCookie_ClearsCookie(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.Host = "localhost:3000"

	ClearSessionCookie(rec, req)

	cookies := rec.Result().Cookies()
	var sessionCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "ds_session" {
			sessionCookie = c
			break
		}
	}

	if sessionCookie == nil {
		t.Fatal("expected ds_session cookie (with MaxAge=-1)")
	}
	if sessionCookie.MaxAge != -1 {
		t.Errorf("expected MaxAge=-1 for clearing, got %d", sessionCookie.MaxAge)
	}
}

// Test generateSessionID
func TestGenerateSessionID_ProducesValidIDs(t *testing.T) {
	id1 := generateSessionID()
	id2 := generateSessionID()

	// Should be 64 characters (32 bytes hex encoded)
	if len(id1) != 64 {
		t.Errorf("expected 64 character ID, got %d", len(id1))
	}

	// Should be unique
	if id1 == id2 {
		t.Error("expected unique session IDs")
	}

	// Should be valid hex
	for _, c := range id1 {
		if !strings.ContainsRune("0123456789abcdef", c) {
			t.Errorf("expected hex character, got %c", c)
			break
		}
	}
}
