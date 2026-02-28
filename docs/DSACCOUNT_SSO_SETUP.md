# DSAccount SSO Setup for ds-app-developer

## Overview

ds-app-developer uses DSAccount for SSO authentication. This document covers the required configuration and known issues.

## Required Configuration

### 1. Register App in DSAccount

The app must be registered in DSAccount with:

- **App ID:** `developer`
- **Name:** `DS App Developer`
- **Redirect URIs:** Must include:
  - `https://developer.digistratum.com/api/auth/callback` (production)
  - `http://localhost:8080/api/auth/callback` (local dev, optional)

### 2. Environment Variables (Lambda)

The Lambda function requires these environment variables:

| Variable | Description | Source |
|----------|-------------|--------|
| `DSACCOUNT_SSO_URL` | DSAccount base URL | CDK (developer-stack.ts) |
| `DSACCOUNT_APP_ID` | App identifier | CDK (developer-stack.ts) |
| `DSACCOUNT_APP_SECRET` | App secret for token exchange | AWS Secrets Manager |
| `APP_URL` | This app's base URL | CDK (developer-stack.ts) |

### 3. Register Redirect URI via Admin API

A super-admin needs to register the redirect URI:

```bash
# Get existing apps (requires super-admin session token)
curl -X GET "https://account.digistratum.com/api/admin/apps" \
  -H "Authorization: Bearer $SESSION_TOKEN"

# Update redirect URIs for developer app
curl -X PUT "https://account.digistratum.com/api/admin/apps/developer/redirect-uris" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "redirect_uris": [
      "https://developer.digistratum.com/api/auth/callback",
      "http://localhost:8080/api/auth/callback"
    ]
  }'
```

## SSO Flow

1. User clicks "Sign In" on developer.digistratum.com
2. Developer redirects to DSAccount: `/api/sso/authorize?app_id=developer&redirect_uri=https://developer.digistratum.com/api/auth/callback&state=/`
3. DSAccount authenticates user (shows login if needed)
4. DSAccount redirects back: `https://developer.digistratum.com/api/auth/callback?code=XXX&state=/`
5. Developer exchanges code for JWT via DSAccount's `/api/sso/token`
6. Developer sets `ds_session` cookie (domain: `.digistratum.com`)
7. User redirected to original path (from `state` param)

## Cookie Strategy

The `ds_session` cookie is set with:
- `Domain: .digistratum.com` - Shared across all subdomains
- `HttpOnly: true` - Not accessible via JavaScript
- `Secure: true` - HTTPS only
- `SameSite: Lax` - CSRF protection while allowing navigation

This allows future cross-subdomain SSO where authenticated users don't need to re-login when navigating between digistratum apps.

## Known Issues / Requirements for DSAccount

### Issue #284: Cross-subdomain SSO Cookie Domain

**Current State:** DSAccount sets `session_token` cookie without a Domain, scoping it only to `account.digistratum.com`.

**Required Change:** For true cross-subdomain SSO, DSAccount should set its session cookie with `Domain: .digistratum.com` so users stay logged in across:
- account.digistratum.com
- developer.digistratum.com
- kanban.digistratum.com
- etc.

**Current Workaround:** Each app (like developer) sets its own `ds_session` cookie after SSO callback. Users must complete SSO flow per-app, but at least they're redirected back correctly.

### Redirect URI Registration

The redirect_uri `https://developer.digistratum.com/api/auth/callback` MUST be registered in DSAccount's app configuration, or the authorize endpoint will reject requests with `INVALID_REDIRECT_URI`.

## Troubleshooting

### "redirect_uri is required" error
- LoginHandler must include `redirect_uri` parameter (fixed in #284)

### "redirect_uri is not registered for this app" error
- Contact super-admin to update app's redirect_uris in DSAccount

### Session not detected after login
- Check browser cookies for `ds_session` cookie
- Verify cookie domain is `.digistratum.com`
- Check CORS settings allow credentials

## References

- [DSAccount Integration Guide](https://github.com/DigiStratum/DSAccount/blob/main/docs/INTEGRATIONS.md)
- [DSAccount API Reference](https://github.com/DigiStratum/DSAccount/blob/main/docs/INTEGRATIONS.md#api-reference)
