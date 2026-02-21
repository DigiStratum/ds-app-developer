# @digistratum/ds-scaffold

CLI tool to scaffold new DigiStratum applications from a standardized template.

## Installation

```bash
# Run directly with npx (recommended)
npx @digistratum/ds-scaffold create my-app

# Or install globally
npm install -g @digistratum/ds-scaffold
ds-scaffold create my-app
```

## Usage

### Create a New App

```bash
npx @digistratum/ds-scaffold create my-new-app
```

This will:
1. Create a new directory `my-new-app/`
2. Copy and configure the template
3. Initialize git repository
4. Install dependencies

### Options

```bash
npx @digistratum/ds-scaffold create <app-name> [options]

Options:
  -d, --directory <dir>  Target directory (defaults to app-name)
  --skip-install         Skip npm install
  --skip-git             Skip git initialization
  -y, --yes              Skip prompts and use defaults
```

### Examples

```bash
# Create app in custom directory
npx @digistratum/ds-scaffold create "My App" --directory my-custom-dir

# Create without installing dependencies
npx @digistratum/ds-scaffold create my-app --skip-install

# Create without git initialization
npx @digistratum/ds-scaffold create my-app --skip-git
```

## What's Included

The scaffold template includes:

### Frontend
- React 18 with TypeScript
- Vite for fast development
- React Router for client-side routing
- Tailwind CSS for styling
- i18next for internationalization

### DigiStratum Integration
- `@digistratum/ds-core` - Shared utilities, hooks, theme provider
- `@digistratum/ds-ui` - UI components, GDPR banner
- DSAccount SSO authentication pattern
- Multi-tenant support

### Infrastructure
- AWS CDK template for deployment
- S3 + CloudFront configuration
- CI/CD ready structure

### Standard Pages
- Home page with guest/authenticated views
- About page
- 404 Not Found page

### Standard Components
- Layout with header/footer
- Theme toggle (light/dark)
- User menu with tenant switcher

## After Creating

```bash
cd my-new-app
npm run dev       # Start development server
npm run build     # Build for production
npm run test      # Run tests
```

## Customization

See the generated `docs/CUSTOMIZE.md` for guidance on:
- Adding new pages
- Creating components
- Modifying themes
- Adding backend integration

## Deployment

See the generated `docs/DEPLOY.md` for AWS deployment instructions.

## Template Structure

```
template/
├── src/
│   ├── api/          # API client
│   ├── components/   # React components
│   ├── hooks/        # Custom hooks (useAuth, etc.)
│   ├── pages/        # Page components
│   ├── i18n/         # Internationalization
│   ├── styles/       # Global CSS
│   ├── App.tsx       # Main app
│   └── main.tsx      # Entry point
├── cdk/              # AWS CDK deployment
├── docs/             # Documentation
└── public/           # Static assets
```

## Contributing

This package is part of the `ds-app-developer` monorepo. To contribute:

1. Clone the repository
2. Make changes to `packages/ds-scaffold/`
3. Test locally: `npm run build && node dist/cli.js create test-app`
4. Submit a PR

## License

MIT - DigiStratum LLC
