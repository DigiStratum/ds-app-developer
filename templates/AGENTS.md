# AGENTS.md — {{APP_NAME}}

## What This Is

A **{{ECOSYSTEM_NAME}}** ecosystem application — one of several integrated apps sharing authentication, preferences, and user experience.

## Where This Fits

```
{{ECOSYSTEM_NAME}} Ecosystem
├── Account App     → SSO, user/tenant management, subscriptions
├── Registry        → App discovery, API specs
├── {{APP_NAME}}    → THIS APP
└── Other Apps...   → Same shared infrastructure
```

**Shared infrastructure (DO NOT REBUILD):**
- Cross-domain SSO via `ds-session` cookie
- User preferences via `ds-prefs` cookie  
- Multi-tenancy with roles/permissions
- AppShell (header, footer, nav, theme, GDPR)

## The Cardinal Rule

> **If every ecosystem app needs it → AppShell. If only this app needs it → here.**

Never implement: login/logout, user registration, tenant management, theme toggles, GDPR banners, header/footer chrome. These are solved.

## Quick Reference

| Need | Solution |
|------|----------|
| Current user | `useAuth().user` |
| Current tenant | `useAuth().currentTenant` |
| Check role | `currentTenant.roles.includes('editor')` |
| Theme | `useTheme().resolvedTheme` |
| Preferences | `usePrefs()` |

## Project Structure

```
frontend/src/app/    # Your app code (pages, features)
frontend/src/shell/  # CDN loader — don't modify
backend/internal/    # Go handlers and services
```

## Documentation Index

| Doc | Purpose |
|-----|---------|
| `README.md` | Setup, build, deploy |
| `docs/ARCHITECTURE.md` | System design, data flow |
| `docs/API.md` | Backend endpoints |
| `docs/NFR.md` | Non-functional requirements |
| [ds-app-developer](https://github.com/DigiStratum/ds-app-developer) | Canonical source, shared packages |
| [AppShell Standard](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/APPSHELL_STANDARD.md) | Auth flows, cookie contracts |

## Tech Stack

React 18 / TypeScript / Vite / Tailwind (frontend)  
Go 1.21 / Lambda (backend)  
CDK / CloudFront / S3 / DynamoDB (infra)

## Deployment

Push to `main` → CI → Canary deploy → Promote or rollback
