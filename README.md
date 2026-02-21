# DS App Developer

Canonical baseline template for all DigiStratum ecosystem applications.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/DigiStratum/ds-app-developer.git my-app
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
- `@digistratum/ds-core` - Core utilities and hooks
- `@digistratum/ds-auth` - Authentication utilities
- `@digistratum/ds-cdk` - CDK constructs

### Publishing Packages

To release a new version of `ds-core` or `ds-ui`:

1. Update the version in the package's `package.json`
2. Commit and push the change
3. Create and push a tag:
   ```bash
   # For ds-core
   git tag ds-core@X.Y.Z
   git push origin ds-core@X.Y.Z

   # For ds-ui
   git tag ds-ui@X.Y.Z
   git push origin ds-ui@X.Y.Z
   ```
4. The GitHub Action will automatically build and publish to GitHub Package Registry

Alternatively, use the manual workflow dispatch from the Actions tab.

### Installing from GitHub Package Registry

To consume these packages in other repos:

1. Create a `.npmrc` file in your project root:
   ```
   @digistratum:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NPM_TOKEN}
   ```

2. Set `NPM_TOKEN` environment variable to a GitHub PAT with `read:packages` scope

3. Install packages normally:
   ```bash
   npm install @digistratum/ds-core @digistratum/ds-ui
   ```

For GitHub Actions, use `GITHUB_TOKEN` which has automatic package read access for repos in the same org.

## License

Proprietary - DigiStratum LLC

