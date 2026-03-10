# AGENTS.md — DS App Developer

## Project Intent

This repository is the **canonical source** for:
1. **Shared packages** consumed by all DigiStratum/LeapKick apps
2. **The developer portal** at developer.digistratum.com
3. **App generation** via `create-app.sh`

## The Cardinal Rule: AppShell vs App Separation

**DO NOT VIOLATE THIS SEPARATION.**

### AppShell (`packages/layout/`) — Shared by ALL apps

Everything that every app needs:
- Header, footer, navigation chrome
- User menu, Sign In/Out, My Account
- Theme toggle, preferences modal
- App switcher
- GDPR/cookie consent banner
- Legal links (Privacy, Terms, Support)
- Branding/logo rendering
- Loading states, error boundaries

### App (`frontend/src/app/`) — App-specific only

Only what THIS app needs:
- App routes and pages
- App-specific features
- Custom menu items (via `getMenuItems`)
- App configuration
- Business logic
- API integrations

**Test:** If you're adding something, ask: "Does every app need this?" 
- Yes → AppShell
- No → App

## Key Architecture

```
App loads → RemoteShellWrapper fetches AppShell from CDN → AppShell renders with app content
```

**Why this matters:** When we update `packages/layout/` and publish to CDN, ALL existing deployed apps get the update automatically. No rebuild needed.

## Structure

```
frontend/src/
├── app/                    # APP-SPECIFIC
│   ├── Layout.tsx          # Wraps AppShell, injects app menu items
│   ├── pages/              # App routes
│   ├── features/           # App features
│   └── config.ts           # App configuration
├── shell/                  # CDN SHELL LOADER
│   ├── RemoteShellWrapper  # Loads AppShell from CDN
│   ├── LocalShellAdapter   # Fallback if CDN fails
│   └── useRemoteShell      # Shell loading hook
└── App.tsx                 # Root component

packages/
├── layout/                 # APPSHELL (published to CDN)
│   ├── AppShell.tsx        # Main shell component
│   ├── DSHeader.tsx        # Header with nav
│   ├── DSFooter.tsx        # Footer with legal
│   ├── PreferencesModal    # Theme/language/timezone
│   └── GdprBanner.tsx      # Cookie consent
├── ds-core/                # SHARED HOOKS (published to CDN)
│   ├── useAuth             # Authentication
│   ├── useTheme            # Theme state
│   └── usePrefs            # User preferences
└── ...
```

## What NOT to do

❌ Add header/footer customizations in app code
❌ Create app-specific auth UI (use AppShell's)
❌ Duplicate legal links or GDPR banners
❌ Import from local paths when package exists
❌ Put shared UI components in `frontend/src/`

## What TO do

✅ Use `@digistratum/layout` for all shell components
✅ Use `@digistratum/ds-core` for auth/theme/prefs hooks
✅ Add shared functionality to packages, then publish
✅ Keep app code minimal — only app-specific logic
✅ Test that derived apps work after package changes

## Package Publishing

```bash
# After updating packages/layout or packages/ds-core:
./scripts/publish-packages.sh

# This uploads to: https://packages.digistratum.com/@digistratum/{pkg}/{pkg}-{ver}.tgz
```

## App Generation

```bash
./scripts/create-app.sh hello.digistratum.com  # DS ecosystem
./scripts/create-app.sh myapp.leapkick.com     # LK ecosystem
```

Generated apps:
- Copy `frontend/`, `backend/`, `cdk/` from this repo
- Get their own GitHub repo
- Deploy via CI/CD
- Load AppShell from CDN (same as developer app)

## Ecosystem Configs

`ecosystems/*.json` define per-ecosystem settings:
- Branding (logo, copyright holder)
- Service URLs (account, registry, shell)
- Legal URLs (privacy, terms, support)
- Auth settings (cookie domain)
- AWS settings (Route53 zone)
- Color palette

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Go, AWS Lambda
- **Infrastructure:** AWS CDK (TypeScript)
- **Packages:** Published to S3/CloudFront CDN
