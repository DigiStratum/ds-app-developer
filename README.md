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

| Package | Purpose | Consumers |
|---------|---------|-----------|
| `@digistratum/layout` | DSHeader, DSFooter, DSAppShell, GdprBanner | All DS frontends |
| `@digistratum/components` | Shared UI components | All DS frontends |
| `@digistratum/cdk-constructs` | Reusable CDK patterns | All DS infra |
| `backend-utils` (Go) | Auth, dynamo, secrets, middleware | All DS backends |

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

Packages are automatically published to GitHub Package Registry on merge to `main`.

### Installing from GitHub Package Registry

1. Create `.npmrc` in your project:
   ```
   @digistratum:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NPM_TOKEN}
   ```

2. Set `NPM_TOKEN` to a GitHub PAT with `read:packages` scope

3. Install:
   ```bash
   npm install @digistratum/layout @digistratum/components
   ```

### Current: File Dependencies (Pre-Publishing)
Apps currently use `file:` dependencies:
```json
{
  "@digistratum/layout": "file:../../ds-app-developer/packages/layout"
}
```
**Note:** Requires ds-app-developer to be checked out at correct relative path.

## Known Issues & Gotchas

### Package path dependency
**Symptom:** App build fails with "cannot find module @digistratum/layout"  
**Cause:** Apps use `file:../../ds-app-developer/packages/layout` — relative path  
**Fix:** Ensure ds-app-developer is cloned at correct relative path

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

## Dependencies

| Dependency | Type | Location | Purpose |
|------------|------|----------|---------|
| DSAccount | Service | https://account.digistratum.com | SSO authentication |

## License

Proprietary - DigiStratum LLC
