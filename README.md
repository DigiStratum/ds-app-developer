# DS Developer

This repo serves three purposes:

1. **Shared Packages** — Reusable libraries that all DS apps depend on (layout, components, CDK constructs, backend utilities)
2. **Boilerplate/Reference App** — Template application demonstrating how to use the shared packages correctly
3. **Developer Portal** — The deployed instance of the boilerplate app at developer.digistratum.com, hosting API docs and developer resources

**This repo exports the packages that other apps consume.** When updating shared code, all consuming apps may need updates.

> **Note:** This repo was previously named `ds-app-skeleton`. Some docs/code may still reference the old name.

## Structure

```
ds-app-developer/
├── backend/
│   ├── cmd/api/             # Lambda entry point
│   ├── internal/
│   │   ├── api/             # HTTP handlers
│   │   ├── session/         # Session middleware
│   │   └── ...
│   └── pkg/dsauth/          # SSO validation package (CANONICAL SOURCE)
├── frontend/
│   └── src/
├── packages/                 # SHARED LIBRARIES
│   ├── layout/              # DSHeader, DSFooter, DSAppShell
│   ├── components/          # Shared UI components
│   ├── cdk-constructs/      # Reusable CDK patterns
│   └── backend-utils/       # Go utilities (auth, dynamo, secrets)
├── apps/                     # Example/template apps
├── infra/                    # CDK
└── scripts/
```

## Shared Packages

| Package | Type | Purpose | Status |
|---------|------|---------|--------|
| `@digistratum/layout` | npm | DSHeader, DSFooter, DSAppShell, GdprBanner | ✅ Active |
| `@digistratum/components` | npm | Shared UI components | ✅ Active |
| `@digistratum/cdk-constructs` | npm | Reusable CDK patterns | ✅ Active |
| `backend-utils` | Go module | Auth, dynamo, secrets, middleware | ⚠️ Exists but not imported — apps copy `pkg/dsauth` instead |

> **Note:** The Go packages are currently copy-pasted between repos rather than imported as modules. This is a known tech debt item.

### Using the Packages

**React Frontend:**
```tsx
import { DSAppShell } from '@digistratum/layout';
import { Button, Card, Modal } from '@digistratum/components';

function App() {
  return (
    <DSAppShell appName="MyApp" auth={authContext} theme={themeContext}>
      <Card title="Welcome">
        <Button onClick={handleClick}>Get Started</Button>
      </Card>
    </DSAppShell>
  );
}
```

**Go Backend:**
```go
import (
    "github.com/digistratum/backend-utils/auth"
    "github.com/digistratum/backend-utils/middleware"
    "github.com/digistratum/backend-utils/secrets"
)

handler := middleware.Chain(
    middleware.Recovery,
    middleware.Logging,
    auth.Middleware(authConfig),
)(yourHandler)
```

**CDK Infrastructure:**
```typescript
import { ApiLambda, DataTable, SpaHosting } from '@digistratum/cdk-constructs';

const table = new DataTable(this, 'Data', { appName: 'myapp', environment: 'prod' });
const api = new ApiLambda(this, 'Api', { appName: 'myapp', environment: 'prod' });
```

## Architecture

### Tech Stack
- **Frontend:** React 18, Vite, TailwindCSS 4
- **Backend:** Go 1.23, AWS Lambda (arm64), HTTP API Gateway
- **Database:** DynamoDB (table: `ds-app-developer`)
- **Hosting:** CloudFront → S3 + Lambda
- **Domain:** developer.digistratum.com

### SSO Integration

Developer uses `pkg/dsauth` which is the **canonical source** for SSO validation that other DS apps should copy.

#### SSO Endpoints

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/api/auth/login` | GET | Initiates SSO login | `?return_to=/path` (optional) | 302 redirect to DSAccount |
| `/api/auth/callback` | GET | OAuth callback — receives auth code from DSAccount | `?code=XXX&state=YYY` | Sets `ds_session` cookie, redirects |
| `/api/auth/logout` | POST | Clears session | (none) | Clears cookie, 200 OK |
| `/api/session` | GET | Returns session state for frontend | `ds_session` cookie | `{authenticated: bool, user: {...}}` |

#### OAuth Flow
1. Frontend calls `/api/session` → gets `{authenticated: false}`
2. Frontend redirects to `/api/auth/login?return_to=/current-page`
3. Backend redirects to `https://account.digistratum.com/api/sso/authorize?app_id=developer&redirect_uri=.../callback`
4. User authenticates at DSAccount
5. DSAccount redirects to `/api/auth/callback?code=XXX`
6. Backend exchanges code, sets `ds_session` cookie, redirects to `return_to`

**Key Files:**
- `backend/pkg/dsauth/` — Canonical dsauth package (copy to other apps)
- `backend/internal/session/middleware.go` — Session middleware using dsauth

## Development

```bash
# Backend
cd backend && go run ./cmd/api

# Frontend
cd frontend && npm run dev

# Build packages
npm run build:packages
```

## Deployment

### Frontend
```bash
cd ~/repos/digistratum/ds-app-developer/frontend
npm run build
aws s3 sync dist s3://ds-app-developer-frontend-171949636152 --delete
# Get CloudFront distribution ID by domain
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[?contains(@,'developer.digistratum.com')]].Id" \
  --output text)

aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

### Backend
```bash
cd ~/repos/digistratum/ds-app-developer/backend
GOOS=linux GOARCH=arm64 go build -o bootstrap ./cmd/api
zip -j /tmp/ds-app-developer-lambda.zip bootstrap
aws lambda update-function-code --function-name ds-app-developer-api --zip-file fileb:///tmp/ds-app-developer-lambda.zip
```

### Environment Variables (Lambda)
| Variable | Value | Purpose |
|----------|-------|---------|
| DSACCOUNT_SSO_URL | https://account.digistratum.com | SSO provider URL |
| DSACCOUNT_APP_ID | developer | App ID registered in DSAccount |
| DSACCOUNT_APP_SECRET | (secret) | For token exchange |
| DYNAMODB_TABLE | ds-app-developer | Main DynamoDB table |
## Package Publishing

Packages are hosted on the DigiStratum S3 package registry at **packages.digistratum.com**.

### Installing Packages

Packages are public — no authentication required.

1. Add to your project's `.npmrc`:
   ```
   @digistratum:registry=https://packages.digistratum.com
   ```

2. Install:
   ```bash
   npm install @digistratum/layout @digistratum/components
   ```

That's it! No tokens, no PATs, no auth configuration needed.

### Available Packages

| Package | Latest Version | Install |
|---------|---------------|---------|
| `@digistratum/core` | 0.1.3 | `npm install @digistratum/core` |
| `@digistratum/layout` | 0.2.10 | `npm install @digistratum/layout` |

### Legacy: File Dependencies
Previously, apps used `file:` dependencies requiring ds-app-developer to be checked out locally. This is no longer needed — use the S3 registry instead.


## Known Issues & Gotchas

### /api/session vs /api/auth/me
**Symptom:** Frontend doesn't recognize authenticated user  
**Cause:** Frontend calls `/api/session`, backend handler must validate ds_session  
**Fix:** GetSessionHandler must call DSAccount `/api/auth/me` (NOT `/api/sso/userinfo`)

### dsauth package is duplicated
**Symptom:** Different apps have different dsauth behavior  
**Cause:** dsauth was copied to multiple repos, they've diverged  
**Fix:** Use Developer's `pkg/dsauth` as canonical source

### Historical name "ds-app-skeleton"
**Symptom:** Code/docs reference ds-app-skeleton  
**Cause:** Repo was renamed from ds-app-skeleton to ds-app-developer  
**Fix:** Update references; both refer to same repo

## Creating New Apps

Use the boilerplate to scaffold a new DS application with pre-configured backend, frontend, and project structure.

### Quick Start

```bash
# Clone this repo if you haven't already
git clone https://github.com/DigiStratum/ds-app-developer.git
cd ds-app-developer

# Create a new app
./scripts/create-app.sh <app-name> <domain> [destination-path]

# Example
./scripts/create-app.sh ds-crm crm.digistratum.com
```

### What's Included

The boilerplate creates a fully-functional app scaffold with:

| Component | Contents |
|-----------|----------|
| **Backend** | Go 1.23 Lambda handler, auth middleware, DynamoDB repository, health endpoint |
| **Frontend** | React 18 + Vite + TailwindCSS, auth hook, theme hook, i18n setup |
| **Docs** | AGENTS.md, REQUIREMENTS.md, README.md with placeholders replaced |

### Placeholders

The script replaces these placeholders throughout the codebase:

| Placeholder | Replaced With |
|-------------|---------------|
| `{{APP_NAME}}` | Your app name (e.g., `ds-crm`) |
| `{{DOMAIN}}` | Your domain (e.g., `crm.digistratum.com`) |
| `{{APP_DESCRIPTION}}` | Default description (edit after creation) |

### Post-Creation Steps

After running the script:

1. **Review and customize**
   - Update `REQUIREMENTS.md` with your app's requirements
   - Customize `README.md` description
   - Add app-specific routes and components

2. **Set up dependencies**
   ```bash
   cd your-app/backend && go mod tidy
   cd your-app/frontend && npm install
   ```

3. **Copy SSO package**
   ```bash
   # Copy the canonical dsauth package for SSO
   cp -r ds-app-developer/backend/pkg/dsauth your-app/backend/pkg/
   ```

4. **Create GitHub repo**
   ```bash
   gh repo create DigiStratum/your-app --private
   git remote add origin https://github.com/DigiStratum/your-app.git
   git push -u origin main
   ```

5. **Register in DSAccount** — Add your app for SSO

6. **Deploy infrastructure** — Set up CDK stack

### Boilerplate vs Cloning

**Use boilerplate** (this method) when:
- Creating a new DS app from scratch
- You want clean placeholders replaced automatically
- You need minimal, focused scaffolding

**Don't clone ds-app-developer wholesale** because:
- It causes identity issues (wrong app name everywhere)
- Includes packages/ and apps/ directories you don't need
- The Developer Portal specific code will confuse the codebase

---

## Dependencies

| Dependency | Type | Location | Purpose |
|------------|------|----------|---------|
| DSAccount | Service | https://account.digistratum.com | SSO authentication |

