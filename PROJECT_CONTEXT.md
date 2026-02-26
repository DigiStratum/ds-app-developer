# PROJECT_CONTEXT.md — DS Developer

> Sub-agents: Read this BEFORE starting any work on this project.

## Overview
DS Developer is the developer portal and central home for DigiStratum shared packages. It serves two purposes:
1. **Developer Portal** — Web app at developer.digistratum.com for developer resources
2. **Shared Packages** — Reusable libraries that all DS apps depend on (layout, components, auth, etc.)

**This repo exports the packages that other apps consume.** When updating shared code, all consuming apps may need updates.

## Architecture

### Tech Stack
- **Frontend:** React 18, Vite, TailwindCSS 4
- **Backend:** Go 1.23, AWS Lambda (arm64), HTTP API Gateway
- **Database:** DynamoDB (table: `ds-app-developer`)
- **Hosting:** CloudFront (E1FPMBSERH3QXR) → S3 + Lambda

### Shared Packages (packages/)
| Package | Purpose | Consumers |
|---------|---------|-----------|
| `layout` | DSHeader, DSFooter, DSAppShell, GdprBanner | All DS apps |
| `components` | Shared UI components | All DS apps |
| `ds-auth-go` | Go auth utilities | Go backends |
| `ds-auth-ts` | TypeScript auth utilities | Frontends |
| `ds-cdk` | CDK constructs | All infra |
| `ds-dynamo` | DynamoDB utilities | Go backends |
| `ds-api` | API client utilities | Frontends |
| `cdk-constructs` | Reusable CDK patterns | All infra |

### Repo Structure
```
ds-app-developer/
├── backend/
│   ├── cmd/api/             # Lambda entry point
│   ├── internal/
│   │   ├── api/             # HTTP handlers
│   │   ├── session/         # Session middleware (uses dsauth)
│   │   └── ...
│   └── pkg/dsauth/          # SSO validation package (CANONICAL SOURCE)
├── frontend/
│   └── src/
├── packages/                 # SHARED LIBRARIES
│   ├── layout/              # DSHeader, DSFooter, etc.
│   ├── components/          # Shared UI components
│   ├── ds-auth-go/          # Go auth utilities
│   └── ...
├── apps/                     # Example/template apps
├── infra/                    # CDK
└── scripts/
```

## Dependencies

| Dependency | Purpose |
|------------|---------|
| DSAccount | SSO authentication |

## Deployment

### Frontend
```bash
cd ~/repos/digistratum/ds-app-developer/frontend
npm run build
aws s3 sync dist s3://ds-app-developer-frontend-171949636152 --delete
aws cloudfront create-invalidation --distribution-id E1FPMBSERH3QXR --paths "/*"
```

### Backend
```bash
cd ~/repos/digistratum/ds-app-developer/backend
GOOS=linux GOARCH=arm64 go build -o bootstrap ./cmd/api
zip -j /tmp/ds-app-developer-lambda.zip bootstrap
aws lambda update-function-code --function-name ds-app-developer-api --zip-file fileb:///tmp/ds-app-developer-lambda.zip
```

### Environment Variables (Lambda: ds-app-developer-api)
| Variable | Value | Purpose |
|----------|-------|---------|
| DSACCOUNT_SSO_URL | https://account.digistratum.com | SSO provider URL |
| DSACCOUNT_APP_ID | developer | App ID registered in DSAccount |
| DSACCOUNT_APP_SECRET | (secret) | For token exchange |
| DYNAMODB_TABLE | ds-app-developer | Main DynamoDB table |

## SSO Integration

### How it works
Developer uses `pkg/dsauth` which is the **canonical source** for SSO validation:
1. Session middleware checks for `ds_session` cookie
2. Validates against DSAccount via `GET /api/auth/me`
3. Falls back to local session store if DSAccount validation fails
4. `/api/session` endpoint returns session state for frontend

### Key Files
- `backend/pkg/dsauth/` — Canonical dsauth package (copy to other apps)
- `backend/internal/session/middleware.go` — Session middleware using dsauth
- `backend/internal/api/handlers.go` — GetSessionHandler validates SSO

### Endpoints
- Session status: `GET /api/session`
- Login redirect: `GET /api/auth/login`
- Callback: `GET /api/auth/callback`
- Logout: `GET /api/auth/logout`

## Shared Package Development

### Making changes to shared packages
1. Edit the package in `packages/[name]/`
2. Test locally with a consuming app
3. Commit and push
4. Update consuming apps to pick up changes

### How apps consume packages
Apps use `file:` dependencies in package.json:
```json
{
  "@digistratum/layout": "file:../../ds-app-developer/packages/layout"
}
```

**Note:** This requires ds-app-developer to be checked out at the correct relative path.

### Future: npm publishing
Eventually packages should be published to npm for cleaner dependency management.

## Known Issues & Gotchas

### Gotcha 1: Package path dependency
**Symptom:** App build fails with "cannot find module @digistratum/layout"
**Cause:** Apps use `file:../../ds-app-developer/packages/layout` — relative path
**Fix:** Ensure ds-app-developer is cloned at correct relative path

### Gotcha 2: /api/session vs /api/auth/me
**Symptom:** Frontend doesn't recognize authenticated user
**Cause:** Frontend calls `/api/session`, backend handler must validate ds_session
**Fix:** GetSessionHandler must call DSAccount `/api/auth/me` (NOT `/api/sso/userinfo`)

### Gotcha 3: dsauth package is duplicated
**Symptom:** Different apps have different dsauth behavior
**Cause:** dsauth was copied to multiple repos, they've diverged
**Fix:** Use Developer's `pkg/dsauth` as canonical source, other apps should import

### Gotcha 4: Historical name "ds-app-skeleton"
**Symptom:** Code/docs reference ds-app-skeleton
**Cause:** Repo was renamed from ds-app-skeleton to ds-app-developer
**Fix:** Update references; both refer to same repo

## Testing

### Local Development
```bash
# Backend
cd backend && go run ./cmd/api

# Frontend
cd frontend && npm run dev
```

### Package Development
```bash
cd packages/layout
npm run build
# Then test in a consuming app
```

## Contacts
- **Primary:** @skelly
- **Repo:** https://github.com/DigiStratum/ds-app-developer
