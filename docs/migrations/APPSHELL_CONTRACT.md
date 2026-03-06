# AppShell Contract v1.0.0

> Defines the requirements for an app to be compliant with AppShell v1.0.0.
> Breaking changes to this contract = major version bump.

## Overview

The AppShell is the standardized structure, patterns, and interfaces that all DigiStratum apps share. App-specific code builds on top of this foundation.

## Required Files

| File | Purpose | Required |
|------|---------|----------|
| `APPSHELL.json` | Version identifier and metadata | ✅ |
| `AGENTS.md` | Agent development guidelines | ✅ |
| `PROJECT_CONTEXT.md` | App-specific context for agents | ✅ |
| `REQUIREMENTS.md` | Functional/non-functional requirements | ✅ |
| `README.md` | Human setup/run instructions | ✅ |

## Directory Structure

```
app-root/
├── APPSHELL.json           # Version: 1.0.0
├── AGENTS.md
├── PROJECT_CONTEXT.md
├── REQUIREMENTS.md
├── README.md
│
├── backend/
│   ├── cmd/
│   │   └── lambda/         # OR cmd/api/ for local dev
│   │       └── main.go
│   ├── internal/
│   │   ├── api/
│   │   │   ├── handlers.go      # Core API (frontend + agents)
│   │   │   └── admin_handlers.go # Agent-only extensions (optional)
│   │   ├── middleware/
│   │   │   ├── auth.go          # SSO session auth
│   │   │   └── apikey.go        # API key auth
│   │   ├── models/              # Domain models
│   │   ├── dynamo/              # DynamoDB storage
│   │   └── health/              # Health check endpoint
│   ├── go.mod
│   └── go.sum
│
├── frontend/
│   ├── src/
│   │   ├── components/          # App-specific components
│   │   ├── pages/               # Route pages
│   │   ├── hooks/               # Custom hooks
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── cdk/
│   ├── lib/
│   │   └── *-stack.ts           # CDK stack definitions
│   ├── bin/
│   │   └── cdk.ts
│   └── cdk.json
│
└── .github/
    └── workflows/
        ├── ci.yml               # PR checks
        └── deploy.yml           # Deploy on merge
```

## Backend Contracts

### Authentication Middleware

All apps must support both auth methods:

```go
// middleware/auth.go - SSO session cookie
func (m *Middleware) AuthSession(next http.Handler) http.Handler

// middleware/apikey.go - API key header
func (m *Middleware) AuthAPIKey(next http.Handler) http.Handler
```

### Health Endpoint

```
GET /api/health → 200 OK
```

### API Response Format

```go
// Success
{"data": {...}}

// Error
{"error": "message", "code": "ERROR_CODE"}
```

## Frontend Contracts

### Required Dependencies
- React 18+
- TypeScript
- Vite
- Tailwind CSS

### Auth Integration
Must integrate with DSAccount SSO via `ds_session` cookie.

## CDK Contracts

### Required Constructs
- CloudFront distribution
- S3 bucket for frontend
- Lambda function for backend
- API Gateway
- DynamoDB tables

### Naming Convention
```
{app-name}-{resource}-{stage}
```

## CI/CD Contracts

### Required Workflows

**ci.yml:**
- Triggered on PR
- Runs tests (backend + frontend)
- Checks formatting
- Coverage thresholds

**deploy.yml:**
- Triggered on merge to main
- Deploys via CDK
- Environment: prod

## Environment Variables

Apps must respect standard env vars:

| Variable | Purpose |
|----------|---------|
| `SSO_COOKIE_DOMAIN` | `.digistratum.com` |
| `SSO_VALIDATE_URL` | DSAccount validation endpoint |
| `AWS_REGION` | `us-west-2` |

## Versioning

This contract follows SEMVER:
- **MAJOR:** Breaking change — apps must adapt
- **MINOR:** Additive capability — optional adoption
- **PATCH:** Bug fix / doc update — transparent

---

*Version: 1.0.0 | Effective: 2026-03-05*
