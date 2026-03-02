# AGENTS.md - DS App Development Guidelines

> Guidelines for AI agents working on DS ecosystem apps.

## Shared Packages - CHECK BEFORE CREATING

Before creating new components, hooks, or utilities, check if they exist in shared packages:

| Package | Contains | When to Use |
|---------|----------|-------------|
| `@digistratum/layout` | Shell, header, footer, navigation, GDPR | Layout and navigation UI |
| `@digistratum/ds-core` | Theme, hooks, utilities, primitives | Core functionality |

**Rule:** If it should be consistent across DS apps, it belongs in a shared package.

---

## Session Management (CRITICAL)

**DSAccount owns all session management.** This app MUST NOT:

- ❌ Set the `ds_session` cookie
- ❌ Clear the `ds_session` cookie
- ❌ Modify the `ds_session` cookie

This app MUST:

- ✅ Read `ds_session` cookie to get session ID
- ✅ Validate sessions via DSAccount `/api/auth/me`
- ✅ Redirect to DSAccount for login/logout

---

## Auth Handler Contract

| Handler | Purpose | Cookie Behavior |
|---------|---------|-----------------|
| `LoginHandler` | Redirect to DSAccount SSO | None |
| `CallbackHandler` | Validate auth code, redirect | None |
| `LogoutHandler` | Redirect to DSAccount logout | None |

---

## Project Structure

```
├── frontend/           # React SPA
│   ├── src/
│   │   ├── components/ # App-specific components
│   │   ├── pages/      # Route pages
│   │   └── hooks/      # App-specific hooks
│   └── package.json    # Uses @digistratum/* packages
├── backend/            # Go Lambda
│   ├── cmd/api/        # Lambda entrypoint
│   └── internal/       # Business logic
├── cdk/                # AWS CDK infrastructure
└── .github/workflows/  # CI/CD
```

---

## Adding New UI Components

### App-Specific (stays in this repo)
```
frontend/src/components/MyComponent.tsx
```

### Reusable (goes to shared package)
1. Add to `@digistratum/layout` or `@digistratum/ds-core`
2. Update that package's AGENTS.md inventory
3. Publish new version
4. Import in this app

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DSACCOUNT_SSO_URL` | Yes | DSAccount base URL |
| `DSACCOUNT_APP_ID` | Yes | Registered app ID |
| `DSACCOUNT_APP_SECRET` | Yes | From Secrets Manager |
| `APP_URL` | Yes | This app's public URL |
| `NPM_TOKEN` | Build | GitHub PAT for @digistratum packages |

---

## Quick Commands

```bash
# Frontend dev
cd frontend && npm run dev

# Backend build
cd backend && go build ./...

# Deploy (via CDK)
cd cdk && npx cdk deploy --all

# Run tests
cd backend && go test ./...
cd frontend && npm test
```

---

## Questions?

- Layout/shell issues → Check `@digistratum/layout` AGENTS.md
- Core utilities → Check `@digistratum/ds-core` AGENTS.md
- SSO issues → Check DSAccount integration docs
