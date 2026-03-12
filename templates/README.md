# {{APP_NAME}}

A {{ECOSYSTEM_NAME}} application built on the DS AppShell platform.

## Quick Start

```bash
# Install dependencies
npm install

# Run frontend dev server
cd frontend && npm run dev

# Run backend locally  
cd backend && go run cmd/api/main.go
```

## Architecture

This app uses the **AppShell architecture**: the shell (header, footer, navigation, auth UI) loads from CDN at runtime, while app-specific pages and features are bundled locally.

```
┌─────────────────────────────────────┐
│        AppShell (from CDN)          │
│  ┌───────────────────────────────┐  │
│  │ Header: nav, user menu, theme │  │
│  ├───────────────────────────────┤  │
│  │                               │  │
│  │     Your App Content Here     │  │
│  │                               │  │
│  ├───────────────────────────────┤  │
│  │ Footer: copyright, legal      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Benefit:** When the platform team updates the AppShell, your app automatically gets the update — no rebuild needed.

## Structure

```
{{APP_SLUG}}/
├── frontend/
│   └── src/
│       ├── app/              # YOUR APP CODE
│       │   ├── Layout.tsx    # Configures AppShell, provides menu items
│       │   ├── pages/        # Your routes
│       │   └── features/     # Your features
│       └── shell/            # CDN shell loader (don't modify)
├── backend/
│   └── cmd/api/              # Go Lambda API
└── cdk/                      # AWS infrastructure
```

## Development Guide

### Adding Pages

1. Create component in `frontend/src/app/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add menu item in `frontend/src/app/Layout.tsx` → `getMenuItems()`

### Using Auth

```tsx
import { useAuth } from '@digistratum/ds-core';

function MyPage() {
  const { user, isAuthenticated, login, logout } = useAuth();
  // ...
}
```

### Styling

Use Tailwind CSS classes. The app supports light/dark themes via the AppShell preferences.

## Deployment

### CI/CD (Automatic)

Push to `main` branch triggers CI/CD pipeline:
1. Build frontend & backend
2. Deploy to AWS (S3 + CloudFront + Lambda)
3. Invalidate CDN cache
4. Register infrastructure manifest

### Manual Deploy

```bash
# Deploy CDK stack
cd cdk && npx cdk deploy

# REQUIRED: Update infrastructure manifest
./scripts/register-manifest.sh
```

> ⚠️ **Always run `register-manifest.sh` after `cdk deploy`**. This updates the central registry with current ARNs and resource names. Other apps and agents depend on this being accurate.

## Links

- **Live:** https://{{DOMAIN}}
- **API:** https://{{DOMAIN}}/api
