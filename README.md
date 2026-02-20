# DS App Skeleton

Canonical baseline template for all DigiStratum ecosystem applications.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/DigiStratum/ds-app-skeleton.git my-app
cd my-app

# Run setup (installs deps, configures git hooks)
./scripts/setup.sh

# Or initialize as a new app
./scripts/init-app.sh my-app
```

## Development

```bash
# Frontend (localhost:3000)
cd frontend && npm run dev

# Backend (localhost:8080)
cd backend && go run ./cmd/api

# Run tests
cd backend && go test ./...
cd frontend && npm test
```

## Architecture

- **Frontend:** React + TypeScript + Tailwind CSS v3
- **Backend:** Go + Lambda handlers
- **Database:** DynamoDB (single-table design)
- **Infrastructure:** AWS CDK (TypeScript)
- **Auth:** DSAccount SSO integration

## Documentation

- [REQUIREMENTS.md](./REQUIREMENTS.md) - Functional and non-functional requirements
- [AGENTS.md](./AGENTS.md) - Agentic development guidelines
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
- [docs/DATABASE.md](./docs/DATABASE.md) - DynamoDB patterns and single-table design
- [docs/API.md](./docs/API.md) - API documentation

## Shared Packages

This skeleton imports from shared DigiStratum packages:
- `@digistratum/ds-ui` - UI components (DSNav, themes, layouts)
- `@digistratum/ds-auth` - Authentication utilities
- `@digistratum/ds-cdk` - CDK constructs

## License

Proprietary - DigiStratum LLC

