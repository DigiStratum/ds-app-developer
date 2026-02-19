# DS App Skeleton

Canonical baseline template for all DigiStratum ecosystem applications.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/DigiStratum/ds-app-skeleton.git my-app
cd my-app
./scripts/init-app.sh my-app

# Install dependencies
cd frontend && npm install
cd ../backend && go mod download
cd ../cdk && npm install

# Run locally
npm run dev  # frontend on :3000
go run ./cmd/api  # backend on :8080
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
- [docs/API.md](./docs/API.md) - API documentation

## Shared Packages

This skeleton imports from shared DigiStratum packages:
- `@digistratum/ds-ui` - UI components (DSNav, themes, layouts)
- `@digistratum/ds-auth` - Authentication utilities
- `@digistratum/ds-cdk` - CDK constructs

## License

Proprietary - DigiStratum LLC
