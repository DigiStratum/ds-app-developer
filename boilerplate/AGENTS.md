# AGENTS.md - App Boilerplate Development Guidelines

## Overview

This boilerplate creates DS ecosystem apps with pre-integrated SSO authentication, 
theme support, and the AppShell layout. Apps inherit these capabilities automatically
when scaffolded via `create-app.sh`.

## Critical Architecture Rules

### Session Management (DO NOT VIOLATE)

**DSAccount owns all session management.** Consumer apps MUST NOT:

1. ❌ Set the `ds_session` cookie
2. ❌ Clear the `ds_session` cookie  
3. ❌ Modify the `ds_session` cookie in any way
4. ❌ Create local sessions using the `ds_session` cookie name

Consumer apps MUST:

1. ✅ Read `ds_session` cookie to get session ID
2. ✅ Validate sessions by calling DSAccount `/api/auth/me` with `Authorization: Bearer <session_id>`
3. ✅ Redirect to DSAccount for login/logout (don't implement local auth)

### Why This Matters

The `ds_session` cookie is shared across `*.digistratum.com` via `Domain=.digistratum.com`.
If a consumer app writes to this cookie, it will:
- Overwrite DSAccount's session with invalid data
- Break SSO for all other apps
- Cause authentication loops and failures

### Auth Handler Contract

The `internal/auth/handlers.go` file provides three handlers:

| Handler | Purpose | Cookie Behavior |
|---------|---------|-----------------|
| `LoginHandler` | Redirect to DSAccount `/api/sso/authorize` | None - just redirects |
| `CallbackHandler` | Exchange auth code, redirect to app | None - just validates & redirects |
| `LogoutHandler` | Redirect to DSAccount `/api/sso/logout` | None - DSAccount clears cookie |

**If you need to modify these handlers: DO NOT add any `http.SetCookie` calls.**

### Session Validation Pattern

```go
// Correct: Read cookie, validate with DSAccount
cookie, err := r.Cookie("ds_session")
if err != nil {
    // No session - treat as guest
    return
}

req, _ := http.NewRequest("GET", dsAccountURL+"/api/auth/me", nil)
req.Header.Set("Authorization", "Bearer "+cookie.Value)

resp, err := client.Do(req)
if err != nil || resp.StatusCode != 200 {
    // Invalid session - treat as guest
    return
}
// Parse user from response...
```

### App-Specific Data

If your app needs to store session-specific data:

1. Use a **different cookie name** (e.g., `{app_name}_prefs`)
2. Or store in **localStorage/sessionStorage** on the frontend
3. Or use **DynamoDB** with the session ID as a key (read-only from cookie)

Never overload `ds_session` with app-specific data.

## Extending the Boilerplate

### Adding API Endpoints

1. Add handlers to `internal/api/handlers.go` or create new packages
2. Wire routes in `cmd/lambda/main.go`
3. Protected routes should use `session.RequireAuth(mux)` middleware

### Adding Frontend Pages

1. Add components to `frontend/src/pages/`
2. Add routes in `frontend/src/App.tsx`
3. Use `useAuth()` hook to check authentication state

### Environment Variables

Required for SSO (set by CDK or deploy workflow):

| Variable | Description |
|----------|-------------|
| `DSACCOUNT_SSO_URL` | DSAccount base URL (e.g., `https://account.digistratum.com`) |
| `DSACCOUNT_APP_ID` | App ID registered in DSAccount |
| `DSACCOUNT_APP_SECRET` | App secret from Secrets Manager |
| `APP_URL` | This app's public URL (for redirects) |

### Testing Locally

```bash
# Backend
cd backend && go test ./...

# Frontend  
cd frontend && npm test

# E2E (requires running backend)
cd frontend && npm run e2e
```

## Common Mistakes

### ❌ Wrong: Setting session cookie in callback

```go
// DON'T DO THIS
func CallbackHandler(w http.ResponseWriter, r *http.Request) {
    // ... exchange code ...
    http.SetCookie(w, &http.Cookie{
        Name:  "ds_session",
        Value: tokenResp.AccessToken,  // WRONG!
    })
}
```

### ✅ Correct: Just redirect after validation

```go
func CallbackHandler(w http.ResponseWriter, r *http.Request) {
    // ... exchange code (validates auth) ...
    // DSAccount already set the cookie - just redirect
    http.Redirect(w, r, redirectURL, http.StatusFound)
}
```

### ❌ Wrong: Clearing cookie on logout

```go
// DON'T DO THIS
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
    http.SetCookie(w, &http.Cookie{
        Name:   "ds_session",
        MaxAge: -1,  // WRONG!
    })
    http.Redirect(w, r, dsAccountLogout, http.StatusFound)
}
```

### ✅ Correct: Let DSAccount handle cookie

```go
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
    // Redirect to DSAccount - it will clear the cookie
    http.Redirect(w, r, dsAccountLogout+"?redirect_uri="+appURL, http.StatusFound)
}
```

## Deployment Checklist

1. [ ] App registered in DSAccount with correct `redirect_uri`
2. [ ] `DSACCOUNT_APP_SECRET` in Secrets Manager
3. [ ] Deploy workflow injects secret into Lambda env
4. [ ] CloudFront routes `/api/*` to API Gateway origin
5. [ ] Test full SSO flow: login → callback → app → logout → return

## Questions?

If unsure about SSO integration, check DSAccount's API documentation or 
consult the ds-app-developer reference implementation.
