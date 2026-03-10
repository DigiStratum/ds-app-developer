# AGENTS.md — {{APP_NAME}}

## Ecosystem Context

This app is part of the **{{ECOSYSTEM_NAME}}** ecosystem — a suite of integrated applications sharing common infrastructure, authentication, and user experience.

### What the Ecosystem Provides (DO NOT REBUILD)

| Concern | Solution | How to Use |
|---------|----------|------------|
| **Authentication** | DSAccount SSO | `useAuth()` hook — user is already authenticated via cross-domain cookie |
| **Session** | `ds-session` cookie | Parsed by AppShell, available via `useAuth().user` |
| **Preferences** | `ds-prefs` cookie | Theme, language, timezone via `usePrefs()` |
| **Multi-tenancy** | Tenant switcher in header | `useAuth().currentTenant`, `useAuth().switchTenant()` |
| **Roles/Permissions** | Per-tenant roles | `user.tenants[].roles[]` — check before showing features |
| **Subscriptions** | Tenant subscription data | `currentTenant.subscription` — feature gating |
| **App Navigation** | App switcher in header | Automatic — apps register with ecosystem registry |
| **Theming** | Light/dark mode | Automatic via AppShell + Tailwind `dark:` classes |
| **Legal/Compliance** | GDPR banner, privacy/terms | Automatic via AppShell |
| **Branding** | Logo, colors, footer | Automatic via ecosystem config |

### Key Principle: This App is NOT Standalone

```
┌─────────────────────────────────────────────────────────────┐
│                    {{ECOSYSTEM_NAME}} Ecosystem             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Account  │  │ Registry │  │ THIS APP │  │ Other    │    │
│  │ (SSO)    │  │ (apps)   │  │          │  │ Apps...  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
│       └─────────────┴─────────────┴─────────────┘           │
│                    Shared Cookies                            │
│              (ds-session, ds-prefs)                         │
└─────────────────────────────────────────────────────────────┘
```

**An agent working on this app should NEVER:**
- ❌ Implement login/logout flows (redirect to Account app)
- ❌ Store auth tokens in localStorage (cookie-based SSO)
- ❌ Create user registration (Account app handles it)
- ❌ Build tenant/org management (Account app handles it)
- ❌ Implement theme toggles (AppShell provides it)
- ❌ Add GDPR/cookie consent (AppShell provides it)
- ❌ Create header/footer/nav chrome (AppShell provides it)

## The Cardinal Rule: AppShell vs App

**AppShell (`@digistratum/layout`)** = Everything shared across ALL ecosystem apps
**This App** = ONLY app-specific business logic

If you're adding something, ask: *"Does every ecosystem app need this?"*
- **Yes** → It belongs in AppShell (update ds-app-developer packages)
- **No** → It belongs here

## Using Ecosystem Services

### Authentication
```tsx
import { useAuth } from '@digistratum/ds-core';

function MyComponent() {
  const { user, isAuthenticated, currentTenant } = useAuth();
  
  if (!isAuthenticated) {
    // AppShell shows login prompt — you don't need to handle this
    return null;
  }
  
  // User is authenticated, currentTenant is set
  const canEdit = currentTenant?.roles?.includes('editor');
}
```

### Tenant-Specific Data
```tsx
const { currentTenant } = useAuth();

// Tenant context for API calls
const response = await fetch('/api/projects', {
  headers: {
    'X-Tenant-ID': currentTenant.id,
  },
});
```

### Preferences
```tsx
import { useTheme, usePrefs } from '@digistratum/ds-core';

const { theme, resolvedTheme } = useTheme();  // 'light' | 'dark' | 'system'
const { language, timezone } = usePrefs();
```

### Checking Subscriptions
```tsx
const { currentTenant } = useAuth();
const plan = currentTenant?.subscription?.plan;  // 'free' | 'pro' | 'enterprise'

if (plan === 'free') {
  return <UpgradePrompt />;
}
```

## App-Specific Development

### Structure
```
frontend/src/
├── app/                 # YOUR CODE
│   ├── Layout.tsx       # Configure AppShell, provide menu items
│   ├── pages/           # Route components
│   ├── features/        # Feature modules
│   └── config.ts        # App configuration
├── shell/               # DON'T MODIFY (CDN shell loader)
└── App.tsx              # Routes

backend/
├── cmd/api/             # Lambda entry point
├── internal/
│   ├── api/             # HTTP handlers
│   ├── models/          # Domain models
│   └── services/        # Business logic
└── pkg/                 # Shared packages
```

### Adding Features

1. **Page**: `frontend/src/app/pages/MyFeature.tsx`
2. **Route**: Add to `App.tsx`
3. **Menu**: Add to `Layout.tsx` → `getMenuItems()`
4. **API**: Add handler in `backend/internal/api/`

### Backend Auth
The backend receives the `ds-session` cookie automatically. Use the session middleware:
```go
// Session is validated and user context is available
user := session.GetUser(r.Context())
tenantID := session.GetTenantID(r.Context())
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Go 1.21, AWS Lambda |
| Infrastructure | AWS CDK (TypeScript) |
| Database | DynamoDB (if needed) |
| Auth | Cookie-based SSO via DSAccount |

## Deployment

Push to `main` → GitHub Actions → AWS (Lambda + S3 + CloudFront)

The canary deploy workflow:
1. Build frontend + backend
2. Deploy to canary (10% traffic)
3. Run health checks
4. Promote to 100% or rollback

## Package Sources

Shared packages load from CDN at runtime:
- `@digistratum/layout` — AppShell components
- `@digistratum/ds-core` — Auth, theme, prefs hooks

**DO NOT** vendor or fork these packages. If you need changes, contribute to ds-app-developer.
