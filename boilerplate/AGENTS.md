# AGENTS.md — Project Standards

> Read `DIGISTRATUM.md` (workspace) first for ecosystem context: SSO, shared packages, stack, env vars.

## Project Structure

```
├── frontend/           # React SPA
│   ├── src/
│   │   ├── components/ # App-specific components
│   │   ├── pages/      # Route pages
│   │   └── hooks/      # App-specific hooks
│   └── package.json
├── backend/            # Go Lambda
│   ├── cmd/api/        # Lambda entrypoint
│   └── internal/       # Business logic
├── cdk/                # AWS CDK infrastructure
└── .github/workflows/  # CI/CD
```

## Quick Commands

```bash
# Frontend dev
cd frontend && npm run dev

# Backend build
cd backend && go build ./...

# Deploy
cd cdk && npx cdk deploy --all

# Tests
cd backend && go test ./...
cd frontend && npm test
```

## Adding Components

**App-specific:** `frontend/src/components/MyComponent.tsx`

**Reusable (goes to shared package):**
1. Add to `@digistratum/layout` or `@digistratum/ds-core`
2. Publish new version
3. Import here

## Context Loading

| Task | Load First |
|------|------------|
| Backend/API | `backend/internal/api/`, `backend/internal/storage/` |
| Auth/SSO | `backend/pkg/dsauth/` (if exists) |
| Frontend | `frontend/src/`, check @digistratum/* usage |
| Infra | `cdk/lib/` |

## Key Files

| File | Purpose |
|------|---------|
| `backend/cmd/api/main.go` | Lambda entry |
| `frontend/src/App.tsx` | React root |
| `cdk/lib/*-stack.ts` | Infrastructure |

## Documentation Model

| File | Scope |
|------|-------|
| `DIGISTRATUM.md` | Ecosystem (global, from workspace) |
| `AGENTS.md` | Project standards (this file) |
| `PROJECT_CONTEXT.md` | App domain, purpose, deviations |
| `/docs/*.md` | Deep-dive topics |

See `PROJECT_CONTEXT.md` for this app's domain and purpose.
