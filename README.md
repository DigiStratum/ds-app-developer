# DS App Skeleton

DigiStratum application boilerplate with shared packages. Derived applications IMPORT these packages instead of copying code.

## Structure

```
ds-app-skeleton/
├── packages/
│   ├── layout/           # @digistratum/layout - App shell components
│   │   ├── src/
│   │   │   ├── DSAppShell.tsx    # Main layout wrapper
│   │   │   ├── DSHeader.tsx      # Standard header/nav
│   │   │   ├── DSFooter.tsx      # Footer with GDPR
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── components/       # @digistratum/components - Reusable UI
│   │   ├── src/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── cdk-constructs/   # @digistratum/cdk-constructs - AWS CDK
│   │   ├── src/
│   │   │   ├── api-lambda.ts
│   │   │   ├── data-table.ts
│   │   │   ├── spa-hosting.ts
│   │   │   └── ...
│   │   └── package.json
│   │
│   └── backend-utils/    # github.com/digistratum/backend-utils (Go)
│       ├── auth/         # Auth middleware
│       ├── secrets/      # Secrets Manager with caching
│       ├── dynamo/       # DynamoDB utilities
│       ├── middleware/   # Common HTTP middleware
│       └── go.mod
│
├── apps/
│   └── developer/        # DS Developer app (uses packages)
│       ├── frontend/
│       ├── backend/
│       └── cdk/
│
└── package.json          # Workspace root (npm workspaces)
```

## Using the Packages

### In a New DS App

```tsx
// Import layout shell
import { DSAppShell } from '@digistratum/layout';

// Import components
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

### Go Backend

```go
import (
    "github.com/digistratum/backend-utils/auth"
    "github.com/digistratum/backend-utils/middleware"
    "github.com/digistratum/backend-utils/secrets"
)

// Use middleware
handler := middleware.Chain(
    middleware.Recovery,
    middleware.CorrelationID,
    middleware.Logging,
    auth.Middleware(authConfig),
)(yourHandler)

// Get cached secrets
secret, _ := secrets.Get(ctx, "my-secret-name")
```

### CDK Infrastructure

```typescript
import { ApiLambda, DataTable, SpaHosting } from '@digistratum/cdk-constructs';

const table = new DataTable(this, 'Data', { appName: 'myapp', environment: 'prod' });
const api = new ApiLambda(this, 'Api', { appName: 'myapp', environment: 'prod', codePath: './dist' });
```

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build:packages

# Run the developer app
npm run dev
```

## Package Publishing

Packages are published to GitHub Packages:
- npm packages: `https://npm.pkg.github.com` (private, @digistratum scope)
- Go module: `github.com/digistratum/backend-utils`

### Publishing Workflow

Packages are automatically published to GitHub Package Registry on merge to `main`:

1. **Bump version** in the package's `package.json` as part of your PR (follow semver)
2. **Merge to main** — CI detects changes and publishes new versions
3. If the version already exists in the registry, publish is skipped (no failure)

### Installing from GitHub Package Registry

To consume these packages in other repos:

1. Create a `.npmrc` file in your project root:
   ```
   @digistratum:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NPM_TOKEN}
   ```

2. Set `NPM_TOKEN` environment variable to a GitHub PAT with `read:packages` scope

3. Install packages:
   ```bash
   npm install @digistratum/layout @digistratum/components @digistratum/cdk-constructs
   ```

## Documentation

- [REQUIREMENTS.md](./REQUIREMENTS.md) - Full requirements document
- [AGENTS.md](./AGENTS.md) - Agent guidelines
- [docs/](./docs/) - Additional documentation

## License

Proprietary - DigiStratum LLC
