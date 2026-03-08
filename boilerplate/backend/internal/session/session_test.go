package session

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

// Tests: Store.Create creates a new session
func TestStore_Create_CreatesSession(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}

	session := store.Create("tenant-1")

	if session == nil {
		t.Fatal("expected non-nil session")
	}
	if session.ID == "" {
		t.Error("expected session ID to be set")
	}
	if session.TenantID != "tenant-1" {
		t.Errorf("expected TenantID 'tenant-1', got %q", session.TenantID)
	}
	if !session.IsGuest {
		t.Error("expected session to be guest")
	}
}

// Tests: Store.Get retrieves existing session
func TestStore_Get_RetrievesSession(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	session := store.Create("tenant-1")

	retrieved := store.Get(session.ID)

	if retrieved == nil {
		t.Fatal("expected to retrieve session")
	}
	if retrieved.ID != session.ID {
		t.Errorf("expected ID %q, got %q", session.ID, retrieved.ID)
	}
}

// Tests: Store.Get returns nil for non-existent session
func TestStore_Get_ReturnsNilForMissing(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}

	retrieved := store.Get("non-existent")

	if retrieved != nil {
		t.Error("expected nil for non-existent session")
	}
}

// Tests: Store.Get returns nil for expired session
func TestStore_Get_ReturnsNilForExpired(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	session := &Session{
		ID:        "expired-session",
		ExpiresAt: time.Now().Add(-1 * time.Hour), // Expired
	}
	store.sessions[session.ID] = session

	retrieved := store.Get(session.ID)

	if retrieved != nil {
		t.Error("expected nil for expired session")
	}
}

// Tests: Store.Upgrade upgrades session to authenticated
func TestStore_Upgrade_AddsUserID(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	session := store.Create("tenant-1")

	upgraded := store.Upgrade(session.ID, "user-123")

	if upgraded == nil {
		t.Fatal("expected non-nil upgraded session")
	}
	if upgraded.UserID != "user-123" {
		t.Errorf("expected UserID 'user-123', got %q", upgraded.UserID)
	}
	if upgraded.IsGuest {
		t.Error("expected upgraded session to not be guest")
	}
}

// Tests: Store.Upgrade returns nil for missing session
func TestStore_Upgrade_ReturnsNilForMissing(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}

	upgraded := store.Upgrade("non-existent", "user-123")

	if upgraded != nil {
		t.Error("expected nil for missing session")
	}
}

// Tests: Store.SetTenant updates tenant
func TestStore_SetTenant_UpdatesTenant(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	session := store.Create("")

	updated := store.SetTenant(session.ID, "new-tenant")

	if updated == nil {
		t.Fatal("expected non-nil session")
	}
	if updated.TenantID != "new-tenant" {
		t.Errorf("expected TenantID 'new-tenant', got %q", updated.TenantID)
	}
}

// Tests: Store.Delete removes session
func TestStore_Delete_RemovesSession(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	session := store.Create("tenant-1")

	store.Delete(session.ID)

	if store.Get(session.ID) != nil {
		t.Error("expected session to be deleted")
	}
}

// Tests: Store.GetOrCreate retrieves existing session
func TestStore_GetOrCreate_RetrievesExisting(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	existing := &Session{
		ID:        "existing-123",
		TenantID:  "tenant-1",
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	store.sessions[existing.ID] = existing

	session := store.GetOrCreate("existing-123", "tenant-2")

	if session.TenantID != "tenant-1" {
		t.Error("expected to retrieve existing session with original tenant")
	}
}

// Tests: Store.GetOrCreate creates new session when missing
func TestStore_GetOrCreate_CreatesNew(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}

	session := store.GetOrCreate("new-session-id", "tenant-1")

	if session == nil {
		t.Fatal("expected non-nil session")
	}
	if session.ID != "new-session-id" {
		t.Errorf("expected ID 'new-session-id', got %q", session.ID)
	}
}

// Tests: Store.Save persists session
func TestStore_Save_PersistsSession(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	session := &Session{
		ID:       "saved-session",
		TenantID: "tenant-1",
	}

	store.Save(session)

	if store.sessions["saved-session"] == nil {
		t.Error("expected session to be saved")
	}
}

// Tests: Session.IsAuthenticated returns correct value
func TestSession_IsAuthenticated(t *testing.T) {
	tests := []struct {
		name   string
		userID string
		want   bool
	}{
		{"with_user", "user-123", true},
		{"without_user", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			session := &Session{UserID: tt.userID}
			if session.IsAuthenticated() != tt.want {
				t.Errorf("IsAuthenticated() = %v, want %v", session.IsAuthenticated(), tt.want)
			}
		})
	}
}

// Tests: GetSession retrieves from context
func TestGetSession_RetrievesFromContext(t *testing.T) {
	session := &Session{ID: "ctx-session"}
	ctx := SetSession(context.Background(), session)

	retrieved := GetSession(ctx)

	if retrieved == nil {
		t.Fatal("expected non-nil session")
	}
	if retrieved.ID != "ctx-session" {
		t.Errorf("expected ID 'ctx-session', got %q", retrieved.ID)
	}
}

// Tests: GetSession returns nil for empty context
func TestGetSession_ReturnsNilForEmpty(t *testing.T) {
	ctx := context.Background()

	session := GetSession(ctx)

	if session != nil {
		t.Error("expected nil for empty context")
	}
}

// Tests: getCookieDomain returns correct domain
func TestGetCookieDomain(t *testing.T) {
	tests := []struct {
		host string
		want string
	}{
		{"app.example.com", ".example.com"},
		{"sub.app.example.com", ".example.com"},
		{"localhost", ""},
		{"localhost:3000", ""},
		{"127.0.0.1", ""},
		{"example.com", ".example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.host, func(t *testing.T) {
			got := getCookieDomain(tt.host)
			if got != tt.want {
				t.Errorf("getCookieDomain(%q) = %q, want %q", tt.host, got, tt.want)
			}
		})
	}
}

// Tests: SetSessionCookie creates cookie with correct attributes
func TestSetSessionCookie_SetsCorrectAttributes(t *testing.T) {
	session := &Session{
		ID:        "session-123",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Host = "localhost:3000"
	w := httptest.NewRecorder()

	SetSessionCookie(w, r, session)

	cookies := w.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatal("expected at least one cookie")
	}

	found := false
	for _, c := range cookies {
		if c.Name == "ds_session" {
			found = true
			if c.Value != "session-123" {
				t.Errorf("expected value 'session-123', got %q", c.Value)
			}
			if !c.HttpOnly {
				t.Error("expected HttpOnly to be true")
			}
		}
	}
	if !found {
		t.Error("expected ds_session cookie")
	}
}

// Tests: SetSessionCookie sets secure flag based on ENV
func TestSetSessionCookie_SecureFlag(t *testing.T) {
	originalEnv := os.Getenv("ENV")
	defer func() { _ = os.Setenv("ENV", originalEnv) }()

	_ = os.Setenv("ENV", "local")

	session := &Session{ID: "session-123", ExpiresAt: time.Now().Add(time.Hour)}
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Host = "localhost"
	w := httptest.NewRecorder()

	SetSessionCookie(w, r, session)

	cookies := w.Result().Cookies()
	for _, c := range cookies {
		if c.Name == "ds_session" {
			if c.Secure {
				t.Error("expected Secure=false for local ENV")
			}
		}
	}
}

// Tests: ClearSessionCookie clears cookie
func TestClearSessionCookie_ClearsCookie(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Host = "localhost"
	w := httptest.NewRecorder()

	ClearSessionCookie(w, r)

	cookies := w.Result().Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == "ds_session" {
			found = true
			if c.MaxAge != -1 {
				t.Errorf("expected MaxAge -1, got %d", c.MaxAge)
			}
		}
	}
	if !found {
		t.Error("expected ds_session cookie to be set for clearing")
	}
}

// Tests: GetSessionIDFromRequest extracts from cookie
func TestGetSessionIDFromRequest_FromCookie(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.AddCookie(&http.Cookie{Name: "ds_session", Value: "cookie-session"})

	id := GetSessionIDFromRequest(r)

	if id != "cookie-session" {
		t.Errorf("expected 'cookie-session', got %q", id)
	}
}

// Tests: GetSessionIDFromRequest extracts from header
func TestGetSessionIDFromRequest_FromHeader(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("Authorization", "Bearer header-session")

	id := GetSessionIDFromRequest(r)

	if id != "header-session" {
		t.Errorf("expected 'header-session', got %q", id)
	}
}

// Tests: GetSessionIDFromRequest returns empty for no auth
func TestGetSessionIDFromRequest_NoAuth(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)

	id := GetSessionIDFromRequest(r)

	if id != "" {
		t.Errorf("expected empty string, got %q", id)
	}
}

// Tests: GetStore returns singleton
func TestGetStore_ReturnsSingleton(t *testing.T) {
	store1 := GetStore()
	store2 := GetStore()

	if store1 != store2 {
		t.Error("expected GetStore to return same instance")
	}
}

// Tests: generateSessionID creates unique IDs
func TestGenerateSessionID_CreatesUniqueIDs(t *testing.T) {
	ids := make(map[string]bool)
	for i := 0; i < 100; i++ {
		id := generateSessionID()
		if ids[id] {
			t.Errorf("duplicate session ID generated: %s", id)
		}
		ids[id] = true
	}
}

// Tests: generateSessionID creates proper length
func TestGenerateSessionID_ProperLength(t *testing.T) {
	id := generateSessionID()

	// 32 bytes hex encoded = 64 characters
	if len(id) != 64 {
		t.Errorf("expected 64 character ID, got %d", len(id))
	}
}

// Tests: Session fields are accessible
func TestSession_Fields(t *testing.T) {
	now := time.Now()
	session := &Session{
		ID:        "test-id",
		TenantID:  "tenant-1",
		UserID:    "user-1",
		IsGuest:   false,
		CreatedAt: now,
		ExpiresAt: now.Add(time.Hour),
	}

	if session.ID != "test-id" {
		t.Error("ID not accessible")
	}
	if session.TenantID != "tenant-1" {
		t.Error("TenantID not accessible")
	}
	if session.UserID != "user-1" {
		t.Error("UserID not accessible")
	}
	if session.IsGuest {
		t.Error("IsGuest should be false")
	}
	if session.CreatedAt.IsZero() {
		t.Error("CreatedAt not set")
	}
	if session.ExpiresAt.IsZero() {
		t.Error("ExpiresAt not set")
	}
}

// Tests: Cookie prefers cookie over header
func TestGetSessionIDFromRequest_CookieOverHeader(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.AddCookie(&http.Cookie{Name: "ds_session", Value: "cookie-session"})
	r.Header.Set("Authorization", "Bearer header-session")

	id := GetSessionIDFromRequest(r)

	if id != "cookie-session" {
		t.Errorf("expected cookie to take precedence, got %q", id)
	}
}

// Tests: Store.GetOrCreate creates when expired
func TestStore_GetOrCreate_CreatesWhenExpired(t *testing.T) {
	store := &Store{sessions: make(map[string]*Session)}
	expired := &Session{
		ID:        "expired-session",
		TenantID:  "old-tenant",
		ExpiresAt: time.Now().Add(-1 * time.Hour),
	}
	store.sessions[expired.ID] = expired

	session := store.GetOrCreate("expired-session", "new-tenant")

	if session.TenantID != "new-tenant" {
		t.Errorf("expected new session with tenant 'new-tenant', got %q", session.TenantID)
	}
}

// Tests for session middleware

// Tests: isAPIRequest returns true for JSON Accept header
func TestIsAPIRequest_JSONAccept(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("Accept", "application/json")

	if !isAPIRequest(r) {
		t.Error("expected true for JSON Accept header")
	}
}

// Tests: isAPIRequest returns true for JSON Content-Type
func TestIsAPIRequest_JSONContentType(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/", nil)
	r.Header.Set("Content-Type", "application/json")

	if !isAPIRequest(r) {
		t.Error("expected true for JSON Content-Type header")
	}
}

// Tests: isAPIRequest returns true for XHR
func TestIsAPIRequest_XHR(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("X-Requested-With", "XMLHttpRequest")

	if !isAPIRequest(r) {
		t.Error("expected true for XHR request")
	}
}

// Tests: isAPIRequest returns false for browser request
func TestIsAPIRequest_Browser(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("Accept", "text/html")

	if isAPIRequest(r) {
		t.Error("expected false for browser request")
	}
}

// Tests: isAPIRequest returns false for empty headers
func TestIsAPIRequest_EmptyHeaders(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)

	if isAPIRequest(r) {
		t.Error("expected false for empty headers")
	}
}

// Tests: RequireAuth returns 401 for API request without session
func TestRequireAuth_APIRequest_Returns401(t *testing.T) {
	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	middleware := RequireAuth(handler)
	r := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
	r.Header.Set("Accept", "application/json")
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, r)

	if called {
		t.Error("handler should not be called")
	}
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// Tests: RequireAuth redirects browser request without session
func TestRequireAuth_BrowserRequest_Redirects(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	})

	middleware := RequireAuth(handler)
	r := httptest.NewRequest(http.MethodGet, "/protected", nil)
	r.Header.Set("Accept", "text/html")
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, r)

	if w.Code != http.StatusFound {
		t.Errorf("expected status 302, got %d", w.Code)
	}
	location := w.Header().Get("Location")
	if location == "" {
		t.Error("expected Location header")
	}
}

// Tests: RequireAuth passes through for authenticated session
func TestRequireAuth_AuthenticatedSession_PassesThrough(t *testing.T) {
	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	session := &Session{ID: "test", UserID: "user-123", IsGuest: false}
	middleware := RequireAuth(handler)
	r := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
	ctx := SetSession(r.Context(), session)
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, r)

	if !called {
		t.Error("handler should be called for authenticated session")
	}
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

// Tests: RequireAuth rejects guest session
func TestRequireAuth_GuestSession_Rejects(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	})

	session := &Session{ID: "test", IsGuest: true}
	middleware := RequireAuth(handler)
	r := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
	r.Header.Set("Accept", "application/json")
	ctx := SetSession(r.Context(), session)
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// Tests: Middleware creates session for new requests
func TestMiddleware_CreatesSession(t *testing.T) {
	var capturedSession *Session
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedSession = GetSession(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	middleware := Middleware(handler)
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, r)

	if capturedSession == nil {
		t.Error("expected session in context")
	}
	if capturedSession != nil && capturedSession.ID == "" {
		t.Error("expected session to have ID")
	}
}

// Tests: Middleware sets session cookie for new sessions
func TestMiddleware_SetsSessionCookie(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := Middleware(handler)
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Host = "localhost"
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, r)

	cookies := w.Result().Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == "ds_session" {
			found = true
			if c.Value == "" {
				t.Error("expected non-empty cookie value")
			}
		}
	}
	if !found {
		t.Error("expected ds_session cookie")
	}
}

// Tests: Middleware extracts tenant from header
func TestMiddleware_ExtractsTenantFromHeader(t *testing.T) {
	var capturedSession *Session
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedSession = GetSession(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	middleware := Middleware(handler)
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Host = "localhost"
	r.Header.Set("X-Tenant-ID", "tenant-xyz")
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, r)

	if capturedSession == nil {
		t.Fatal("expected session in context")
	}
	if capturedSession.TenantID != "tenant-xyz" {
		t.Errorf("expected TenantID 'tenant-xyz', got %q", capturedSession.TenantID)
	}
}

// Tests: getDSAuthConfig returns nil when env vars not set
func TestGetDSAuthConfig_ReturnsNilWithoutEnvVars(t *testing.T) {
	// Clear config cache
	dsauthConfig = nil

	originalURL := os.Getenv("DSACCOUNT_SSO_URL")
	originalAppID := os.Getenv("DSACCOUNT_APP_ID")
	defer func() {
		_ = os.Setenv("DSACCOUNT_SSO_URL", originalURL)
		_ = os.Setenv("DSACCOUNT_APP_ID", originalAppID)
		dsauthConfig = nil // Clear cache again
	}()

	_ = os.Setenv("DSACCOUNT_SSO_URL", "")
	_ = os.Setenv("DSACCOUNT_APP_ID", "")

	cfg := getDSAuthConfig()

	if cfg != nil {
		t.Error("expected nil config without env vars")
	}
}
