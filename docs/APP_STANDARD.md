# DS App Standard

> **Audience:** Human developers and LLM agents building DigiStratum applications.
> This document defines the canonical structure, conventions, and requirements for DS ecosystem apps.

---

## Table of Contents

1. [Required Directory Structure](#required-directory-structure)
2. [Required Files](#required-files)
3. [Shared Component Usage](#shared-component-usage)
4. [CDK Stack Naming Conventions](#cdk-stack-naming-conventions)
5. [CI/CD Workflow Requirements](#cicd-workflow-requirements)
6. [New App Checklist](#new-app-checklist)

---

## Required Directory Structure

Every DS app must follow this directory layout:

```
{app-name}/
├── AGENTS.md              # AI agent guidelines (required)
├── REQUIREMENTS.md        # Functional/non-functional requirements
├── README.md              # Setup and overview for humans
├── Makefile               # Common dev commands
├── manifest.json          # Service discovery manifest
├── package.json           # Monorepo root config
│
├── backend/               # Go Lambda handlers
│   ├── cmd/
│   │   ├── api/           # Local development entry point
│   │   │   └── main.go
│   │   └── lambda/        # Lambda entry point (production)
│   │       └── main.go
│   ├── internal/          # Private packages
│   │   ├── api/           # HTTP handlers
│   │   ├── auth/          # Auth middleware, context helpers
│   │   ├── dynamo/        # Repository pattern, tenant key builders
│   │   ├── middleware/    # Shared middleware (logging, cors)
│   │   ├── models/        # Domain models with struct tags
│   │   └── {domain}/      # Domain-specific packages
│   ├── pkg/               # Importable packages (if any)
│   ├── test/              # Integration tests
│   │   └── integration/
│   ├── go.mod
│   └── go.sum
│
├── frontend/              # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/           # HTTP client with tenant headers
│   │   ├── components/    # App-specific components
│   │   ├── hooks/         # Custom hooks (useAuth, useTheme)
│   │   ├── i18n/          # Internationalization config
│   │   ├── pages/         # Route page components
│   │   ├── styles/        # Global CSS, Tailwind overrides
│   │   ├── __tests__/     # Test files
│   │   ├── App.tsx        # Route definitions
│   │   ├── main.tsx       # Entry point
│   │   └── types.ts       # Shared TypeScript types
│   ├── e2e/               # Playwright E2E tests
│   ├── public/            # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── cdk/                   # AWS CDK Infrastructure as Code
│   ├── bin/               # CDK app entry point
│   │   └── app.ts
│   ├── lib/               # CDK stacks
│   │   ├── {app}-stack.ts        # Main app stack
│   │   └── constructs/           # Reusable constructs
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                  # Detailed documentation
│   ├── ARCHITECTURE.md    # System architecture, patterns
│   ├── AUTH.md            # DSAccount SSO integration
│   ├── DATABASE.md        # DynamoDB single-table design
│   └── ...
│
├── packages/              # Shared packages (monorepo)
│   └── {package-name}/
│
├── scripts/               # Build and deployment scripts
├── infra/                 # Additional infra configs
└── .github/
    └── workflows/         # CI/CD pipelines
        ├── ci.yml         # Lint, test, build
        └── deploy.yml     # Deployment workflow
```

### Directory Purpose Summary

| Directory | Purpose |
|-----------|---------|
| `backend/cmd/api/` | Local development server entry point |
| `backend/cmd/lambda/` | AWS Lambda handler (production) |
| `backend/internal/` | Private packages (not importable) |
| `backend/pkg/` | Public/importable packages |
| `frontend/src/` | React application source |
| `frontend/e2e/` | End-to-end Playwright tests |
| `cdk/` | Infrastructure as Code |
| `docs/` | Detailed documentation |
| `packages/` | Shared monorepo packages |

---

## Required Files

### manifest.json

Every app **must** have a `manifest.json` at the repository root for service discovery.

**Schema:** [`manifest.schema.json`](../manifest.schema.json)

**Example:**

```json
{
  "$schema": "./manifest.schema.json",
  "$comment": "App manifest for {AppName} service discovery",
  "frontendRoutes": [
    {
      "path": "/",
      "name": "Home",
      "description": "Landing page",
      "authRequired": false
    },
    {
      "path": "/dashboard",
      "name": "Dashboard",
      "description": "Main app dashboard",
      "authRequired": true
    }
  ],
  "backendResources": [
    {
      "name": "health.check",
      "path": "/health",
      "methods": ["GET"],
      "description": "Health check endpoint",
      "authType": "none"
    },
    {
      "name": "auth.callback",
      "path": "/auth/callback",
      "methods": ["GET"],
      "description": "SSO callback endpoint",
      "authType": "none"
    }
  ],
  "dependencies": [
    {
      "appId": "dsaccount",
      "resourceName": "sso.authorize",
      "required": true
    }
  ]
}
```

**Required fields:**

| Field | Type | Description |
|-------|------|-------------|
| `frontendRoutes` | array | Routes exposed by frontend |
| `frontendRoutes[].path` | string | Route path (must start with `/`) |
| `frontendRoutes[].name` | string | Human-readable name |
| `frontendRoutes[].authRequired` | boolean | Whether auth is required |
| `backendResources` | array | API endpoints exposed |
| `backendResources[].name` | string | Canonical name (`resource.action`) |
| `backendResources[].path` | string | API path |
| `backendResources[].methods` | array | HTTP methods supported |
| `dependencies` | array | Dependencies on other DS apps |

### package.json (Root)

Monorepo root package.json must include:

```json
{
  "name": "@digistratum/{app-name}",
  "version": "0.1.0",
  "private": true,
  "description": "DigiStratum {AppName} application",
  "workspaces": [
    "packages/*",
    "frontend",
    "cdk"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "build:packages": "npm run build --workspace=@digistratum/layout --workspace=@digistratum/components",
    "dev": "npm run dev --workspace=frontend",
    "lint": "npm run lint --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "clean": "npm run clean --workspaces --if-present && rm -rf node_modules"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Required fields:**

| Field | Requirement |
|-------|-------------|
| `name` | Format: `@digistratum/{app-name}` |
| `private` | Must be `true` |
| `workspaces` | Must include `packages/*`, `frontend`, `cdk` |
| `engines.node` | `>=18.0.0` |

### AGENTS.md

Every app **must** have an `AGENTS.md` file at the repository root. This file provides AI agents with:

- Context loading priorities
- Coding standards
- Test-driven development workflow
- Common prompts for tasks
- Anti-patterns to avoid

See [ds-app-developer/AGENTS.md](../AGENTS.md) as the reference template.

### REQUIREMENTS.md

Every app **must** have a `REQUIREMENTS.md` documenting:

- Functional requirements (`FR-{DOMAIN}-{NNN}`)
- Non-functional requirements (`NFR-{DOMAIN}-{NNN}`)
- Traceability table linking requirements to tests

---

## Shared Component Usage

DS apps use shared packages from the monorepo. Import patterns:

### @digistratum/ds-core

Core utilities, hooks, and types.

```tsx
// Hooks
import { useAuth, useTheme, useTenant } from '@digistratum/ds-core/hooks';

// Components
import { DSNav, Footer } from '@digistratum/ds-core/components';

// Types
import type { User, Tenant } from '@digistratum/ds-core/types';

// Utils
import { formatDate, buildApiUrl } from '@digistratum/ds-core/utils';
```

### @digistratum/layout

App shell and layout components.

```tsx
import { Layout, Sidebar, Header } from '@digistratum/layout';

function App() {
  return (
    <Layout appName="My App">
      <Header />
      <Sidebar />
      {/* Page content */}
    </Layout>
  );
}
```

### @digistratum/ds-ui

Shared UI component library.

```tsx
import { Button, Card, Modal, Table } from '@digistratum/ds-ui';

// With styles
import '@digistratum/ds-ui/styles';
```

### Package Versioning

Apps should use workspace protocol for local packages:

```json
{
  "dependencies": {
    "@digistratum/ds-core": "workspace:*",
    "@digistratum/layout": "workspace:*"
  }
}
```

For published packages, use semver:

```json
{
  "dependencies": {
    "@digistratum/ds-core": "^0.1.0"
  }
}
```

---

## CDK Stack Naming Conventions

**CRITICAL:** All CDK stacks must follow the naming pattern:

```
{AppName}-{layer}-{env}
```

### Components

| Component | Description | Examples |
|-----------|-------------|----------|
| `{AppName}` | App's canonical stack prefix | `DSProjects`, `DSCRM`, `DSAccount`, `DSDeveloper` |
| `{layer}` | Infrastructure layer | `data`, `app`, `cdn`, `auth` |
| `{env}` | Environment | `dev`, `staging`, `prod` |

### Examples

| Stack Name | Purpose |
|------------|---------|
| `DSProjects-data-prod` | DSProjects production DynamoDB table |
| `DSProjects-app-prod` | DSProjects production Lambda/API Gateway |
| `DSCRM-data-staging` | DSCRM staging DynamoDB table |
| `DSAccount-auth-prod` | DSAccount production auth resources |

### Canonical App Names

| Domain | Repo | App Name | Stack Prefix |
|--------|------|----------|--------------|
| `developer.digistratum.com` | `ds-app-developer` | DS Developer | `DSDeveloper-` |
| `projects.digistratum.com` | `DSKanban` | DS Projects | `DSProjects-` |
| `crm.digistratum.com` | `DSCRM` | DS CRM | `DSCRM-` |
| `account.digistratum.com` | `DSAccount` | DS Account | `DSAccount-` |

### CDK Stack Implementation

```typescript
// cdk/bin/app.ts
const app = new cdk.App();

const env = process.env.ENVIRONMENT || 'dev';

// Data layer stack
new DataStack(app, `DSProjects-data-${env}`, {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-west-2' },
  environment: env,
});

// App layer stack
new AppStack(app, `DSProjects-app-${env}`, {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-west-2' },
  environment: env,
});
```

### Resource Naming Within Stacks

Resources within stacks should use the app prefix:

```typescript
// DynamoDB table
const table = new dynamodb.Table(this, 'Table', {
  tableName: `dsprojects-${environment}`,  // lowercase, hyphenated
  // ...
});

// Lambda function
const handler = new lambda.Function(this, 'ApiHandler', {
  functionName: `dsprojects-api-${environment}`,
  // ...
});

// S3 bucket
const bucket = new s3.Bucket(this, 'FrontendBucket', {
  bucketName: `dsprojects-frontend-${account}-${environment}`,
  // ...
});
```

---

## CI/CD Workflow Requirements

Every app must have CI/CD pipelines in `.github/workflows/`.

### Required Workflows

#### ci.yml

Runs on push to `main` and all PRs. Must include:

```yaml
jobs:
  # Backend
  backend-lint:      # golangci-lint
  backend-test:      # go test with coverage

  # Frontend
  frontend-lint:     # ESLint + TypeScript check
  frontend-test:     # Vitest with coverage

  # Security
  security-scan:     # govulncheck, npm audit, CodeQL

  # Infrastructure
  cdk-synth:         # CDK synth validation

  # Build artifacts
  build-backend:     # Lambda binary (ARM64)
  build-frontend:    # Vite build

  # Gate
  ci-pass:           # All jobs must pass
```

#### deploy.yml

Runs on push to `main` (after CI passes). Must include:

- Environment selection (dev/staging/prod)
- CDK diff preview
- CDK deploy
- Frontend deployment to S3
- CloudFront invalidation
- Smoke tests

### Coverage Requirements

| Target | Threshold | Notes |
|--------|-----------|-------|
| Backend (Go) | 80% | Target; start at 30%, increase incrementally |
| Frontend (React) | 70% | Unit + component tests |

### Test Commands

```yaml
# Backend
go test -v -race -coverprofile=coverage.out ./...

# Frontend
npm run test:coverage
```

---

## New App Checklist

When creating a new DS app, complete each step:

### 1. Repository Setup

- [ ] Create repository in DigiStratum org
- [ ] Clone ds-app-developer as template
- [ ] Update `package.json` with app name
- [ ] Configure git hooks: `./scripts/setup.sh`

### 2. Documentation

- [ ] Update `README.md` with app-specific info
- [ ] Update `AGENTS.md` with app context
- [ ] Create `REQUIREMENTS.md` with initial requirements
- [ ] Create `docs/ARCHITECTURE.md`
- [ ] Create `docs/AUTH.md` (SSO setup)
- [ ] Create `docs/DATABASE.md` (DynamoDB schema)

### 3. Service Discovery

- [ ] Create `manifest.json` with routes and resources
- [ ] Validate against `manifest.schema.json`
- [ ] Define dependencies on other DS apps

### 4. Backend Setup

- [ ] Initialize Go module: `go mod init github.com/DigiStratum/{repo}`
- [ ] Create `cmd/api/main.go` (local dev)
- [ ] Create `cmd/lambda/main.go` (production)
- [ ] Set up `internal/` package structure
- [ ] Configure DynamoDB single-table design
- [ ] Implement auth middleware (DSAccount SSO)
- [ ] Add health check endpoint

### 5. Frontend Setup

- [ ] Initialize Vite + React + TypeScript
- [ ] Configure Tailwind CSS
- [ ] Set up i18n (i18next)
- [ ] Import shared components from `@digistratum/*`
- [ ] Configure API client with tenant header injection
- [ ] Set up routing with protected routes

### 6. Infrastructure

- [ ] Create CDK stack(s) following naming convention
- [ ] Configure DynamoDB table with GSI
- [ ] Set up Lambda function (ARM64)
- [ ] Configure API Gateway (HTTP API)
- [ ] Set up S3 + CloudFront for frontend
- [ ] Configure Route53 DNS records
- [ ] Add monitoring/alerting construct

### 7. CI/CD

- [ ] Create `.github/workflows/ci.yml`
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Configure branch protection rules
- [ ] Set up required secrets:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `DSACCOUNT_APP_SECRET`

### 8. SSO Integration

- [ ] Register app in DSAccount
- [ ] Configure `DSACCOUNT_SSO_URL`
- [ ] Configure `DSACCOUNT_APP_ID`
- [ ] Set `SSO_COOKIE_DOMAIN=.digistratum.com`
- [ ] Test SSO login flow
- [ ] Test cross-subdomain session

### 9. Testing

- [ ] Write backend unit tests (80% coverage target)
- [ ] Write frontend unit tests (70% coverage target)
- [ ] Write E2E tests for critical flows
- [ ] Update REQUIREMENTS.md traceability table

### 10. Deployment

- [ ] Deploy to dev environment
- [ ] Verify health check endpoint
- [ ] Test SSO authentication
- [ ] Deploy to staging
- [ ] Verify all functionality
- [ ] Deploy to production

---

## Quick Reference Commands

```bash
# Local development
cd backend && go run ./cmd/api     # Backend on :8080
cd frontend && npm run dev          # Frontend on :3000

# Testing
make test                          # All tests
cd backend && go test ./...        # Backend tests
cd frontend && npm test            # Frontend tests

# Building
make build                         # Build all
cd backend && GOOS=linux GOARCH=arm64 go build -o bootstrap ./cmd/lambda

# CDK
cd cdk && npx cdk synth            # Synthesize
cd cdk && npx cdk diff             # Preview changes
cd cdk && npx cdk deploy           # Deploy

# Linting
make lint                          # All linting
cd backend && golangci-lint run    # Backend lint
cd frontend && npm run lint        # Frontend lint
```

---

## Related Documentation

- [AGENTS.md](../AGENTS.md) — AI agent guidelines
- [REQUIREMENTS.md](../REQUIREMENTS.md) — Requirements template
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture
- [AUTH.md](AUTH.md) — DSAccount SSO integration
- [DATABASE.md](DATABASE.md) — DynamoDB patterns
- [CI-CD.md](CI-CD.md) — CI/CD pipeline details
- [manifest.schema.json](../manifest.schema.json) — Service discovery schema

---

*This document is the canonical reference for DS app structure. Follow it when creating new apps or modifying existing ones.*
