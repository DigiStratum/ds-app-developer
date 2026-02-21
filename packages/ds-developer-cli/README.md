# DS Skeleton CLI

> CLI tool for creating and managing DS App Skeleton derived applications.

## Installation

```bash
# Global installation
npm install -g @digistratum/ds-skeleton

# Or use npx
npx @digistratum/ds-skeleton <command>
```

## Commands

### `ds-skeleton create <app-name>`

Create a new app from the DS App Skeleton template.

```bash
# Create a new app
ds-skeleton create my-new-app

# With options
ds-skeleton create my-new-app --domain myapp.digistratum.com --skip-install
```

**Options:**
- `-r, --repo <url>` - Custom skeleton repository URL
- `-d, --domain <domain>` - Domain for the app (prompted if not provided)
- `-f, --force` - Overwrite existing directory
- `--skip-install` - Skip automatic dependency installation

**What it does:**
1. Clones the skeleton repository
2. Removes git history
3. Performs search/replace for app name, domain, etc.
4. Creates `.ds-skeleton.json` config file
5. Initializes new git repository
6. Installs dependencies (optional)

### `ds-skeleton sync`

Sync scaffolding updates from the skeleton to a derived app. This updates "safe" files like shared packages, docs, and CI/CD configuration while preserving your app-specific code.

```bash
# Preview what would be updated
ds-skeleton sync --dry-run

# Apply updates
ds-skeleton sync

# Skip confirmation
ds-skeleton sync --yes
```

**Options:**
- `-n, --dry-run` - Show what would be updated without making changes
- `-f, --force` - Force update even if files are customized
- `-y, --yes` - Skip confirmation prompt

**Safe update patterns:**
- `packages/ds-*/**` - Shared packages
- `docs/**` - Documentation
- `.github/workflows/**` - CI/CD workflows
- `Makefile` - Build scripts
- Configuration files (`.eslintrc`, `.prettierrc`, etc.)

**Never synced:**
- `.ds-skeleton.json` - Config file
- `README.md` - App-specific readme
- `.env*` - Environment files
- `backend/internal/**` - App-specific backend code
- `frontend/src/pages/**` - App-specific pages
- `frontend/src/components/**` - App-specific components

### `ds-skeleton diff`

Compare a derived app against the current skeleton to see what has diverged.

```bash
# Basic diff
ds-skeleton diff

# Detailed diff with line counts
ds-skeleton diff --detailed

# Only compare specific files
ds-skeleton diff --pattern "packages/**"
```

**Options:**
- `-d, --detailed` - Show detailed diff information (line counts)
- `-p, --pattern <glob>` - Only compare files matching pattern

**Output categories:**
- **Added** - Files that exist only in your app (custom files)
- **Modified** - Files that have diverged from the skeleton
- **Removed** - Files from skeleton that are missing in your app
- **Unchanged** - Files that match the skeleton exactly

## Configuration

When you create an app with `ds-skeleton create`, a `.ds-skeleton.json` file is created:

```json
{
  "skeletonVersion": "0.1.0",
  "skeletonRepo": "https://github.com/DigiStratum/ds-app-developer.git",
  "appName": "my-new-app",
  "appNamePascal": "MyNewApp",
  "domain": "my-new-app.digistratum.com",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "lastSyncAt": null,
  "customizedFiles": [],
  "skipPatterns": [
    "node_modules",
    "dist",
    ".git",
    "*.log",
    ".env*",
    ".ds-skeleton.json"
  ]
}
```

### Marking files as customized

If you've customized a file and want to prevent future syncs from overwriting it:

```json
{
  "customizedFiles": [
    "docs/ARCHITECTURE.md",
    "packages/ds-ui/src/components/Button.tsx"
  ]
}
```

### Custom skip patterns

Add patterns to `skipPatterns` to exclude additional files from sync:

```json
{
  "skipPatterns": [
    "node_modules",
    "dist",
    ".git",
    "*.log",
    ".env*",
    ".ds-skeleton.json",
    "my-custom-folder/**"
  ]
}
```

## Workflow

### Creating a new app

```bash
# 1. Create the app
ds-skeleton create my-awesome-app

# 2. Navigate to it
cd my-awesome-app

# 3. Start development
make deps-up
cd frontend && npm run dev &
cd backend && go run ./cmd/api
```

### Keeping up with skeleton updates

```bash
# 1. Check what has diverged
ds-skeleton diff

# 2. Preview available updates
ds-skeleton sync --dry-run

# 3. Apply safe updates
ds-skeleton sync

# 4. Review and commit
git diff
git add -A && git commit -m "Sync scaffolding from ds-app-developer"
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
./dist/cli.js --help

# Link globally for testing
npm link
ds-skeleton --help
```

## License

MIT - DigiStratum LLC
