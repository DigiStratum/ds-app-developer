# DS App Developer

The canonical reference implementation and app generator for DigiStratum and LeapKick ecosystems.

## Purpose

This repo serves three purposes:

1. **Shared Packages** — Published to CDN, consumed by ALL apps at runtime
2. **Reference Application** — The developer portal at developer.digistratum.com
3. **App Generator** — `create-app.sh` spins up new apps from this template

## Architecture: AppShell + App

```
┌─────────────────────────────────────────────────────────┐
│                    AppShell (CDN)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ DSHeader: nav, user menu, theme, app switcher   │   │
│  ├─────────────────────────────────────────────────┤   │
│  │                                                  │   │
│  │              App Content (Routes)                │   │
│  │         ← App-specific pages/features →          │   │
│  │                                                  │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ DSFooter: copyright, legal links, GDPR banner   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Key insight:** Apps load AppShell from CDN at runtime. When we update the shell, ALL existing apps get the update automatically — no rebuild required.

## The Separation Principle

| Belongs in AppShell (`packages/layout`) | Belongs in App (`frontend/src/app/`) |
|----------------------------------------|--------------------------------------|
| Header, footer, navigation chrome | App-specific routes/pages |
| User menu, auth UI (Sign In/Out) | App-specific features |
| Theme toggle, preferences modal | Custom menu items |
| App switcher | App configuration |
| GDPR/cookie consent | Business logic |
| Legal links (Privacy, Terms) | API integrations |
| Branding/logo display | - |

**Rule:** If every app needs it, it goes in AppShell. If only one app needs it, it stays in the app.

## Structure

```
ds-app-developer/
├── frontend/                 # Reference app frontend
│   └── src/
│       ├── app/             # App-specific code
│       │   ├── Layout.tsx   # Wraps AppShell, provides menu items
│       │   ├── pages/       # App routes
│       │   └── features/    # App features
│       └── shell/           # CDN shell loader (RemoteShellWrapper)
├── backend/                  # Reference app backend (Go Lambda)
├── cdk/                      # AWS infrastructure
├── packages/                 # SHARED PACKAGES (published to CDN)
│   ├── layout/              # AppShell, DSHeader, DSFooter, etc.
│   ├── ds-core/             # Hooks (useAuth, useTheme, usePrefs)
│   ├── ds-icons/            # Icon components
│   └── cdk-constructs/      # Reusable CDK patterns
├── ecosystems/              # Brand configs (digistratum.com, leapkick.com)
├── scripts/
│   ├── create-app.sh        # Generate new app from template
│   ├── destroy-app.sh       # Tear down app infrastructure
│   └── publish-packages.sh  # Publish packages to CDN
└── templates/               # CI/CD templates for generated apps
```

## Packages

| Package | Purpose | CDN |
|---------|---------|-----|
| `@digistratum/layout` | AppShell, DSHeader, DSFooter, GdprBanner, PreferencesModal | ✅ |
| `@digistratum/ds-core` | AuthProvider, useAuth, useTheme, usePrefs, useConsent | ✅ |
| `@digistratum/ds-icons` | Icon components | ✅ |
| `@digistratum/cdk-constructs` | Reusable CDK patterns | npm |

Packages are published to `https://packages.digistratum.com/@digistratum/{pkg}/{pkg}-{ver}.tgz`

## Ecosystems

Apps can be created for different ecosystems (brands):

| Ecosystem | Domain | Config |
|-----------|--------|--------|
| DigiStratum | *.digistratum.com | `ecosystems/digistratum.com.json` |
| LeapKick | *.leapkick.com | `ecosystems/leapkick.com.json` |

Each ecosystem defines: branding, legal URLs, auth cookie domain, AWS resources.

## Creating a New App

```bash
./scripts/create-app.sh hello.digistratum.com
# or
./scripts/create-app.sh myapp.leapkick.com
```

This creates a new repo with frontend, backend, and CDK — ready to deploy.

## Development

```bash
# Install dependencies
npm install

# Run frontend dev server
cd frontend && npm run dev

# Run backend locally
cd backend && go run cmd/api/main.go

# Build packages
npm run build:packages

# Publish packages to CDN
./scripts/publish-packages.sh
```

## Updating AppShell

1. Make changes in `packages/layout/`
2. Bump version in `packages/layout/package.json`
3. Run `./scripts/publish-packages.sh`
4. All apps automatically get the update (CDN cache refresh)

No app rebuilds needed — this is the whole point.
