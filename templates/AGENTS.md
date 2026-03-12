# AGENTS.md — {{APP_NAME}}

## What This Is

A **{{ECOSYSTEM_NAME}}** ecosystem application — one of several integrated apps sharing authentication, preferences, and user experience.

## The Cardinal Rule

> **If every ecosystem app needs it → AppShell. If only this app needs it → here.**

Never implement: login/logout, user registration, tenant management, theme toggles, GDPR banners, header/footer chrome. These are solved by the AppShell.

---

## Documentation Structure

This project uses hierarchical AGENTS.md files to keep context focused:

| Path | Scope |
|------|-------|
| `AGENTS.md` (this file) | Project-wide rules, ecosystem integration |
| `frontend/AGENTS.md` | React/TypeScript, AppShell integration, protected paths |
| `backend/AGENTS.md` | Go patterns, API handlers, DynamoDB access |
| `cdk/AGENTS.md` | Infrastructure, CDK conventions, resource naming |

**When working in a subdirectory, read its AGENTS.md first.**

---

## Project Structure

```
{{APP_SLUG}}/
├── AGENTS.md           # This file (project-wide)
├── README.md           # Setup, build, deploy
├── frontend/           # React app
│   ├── AGENTS.md       # Frontend-specific guidance
│   └── src/
├── backend/            # Go Lambda API
│   ├── AGENTS.md       # Backend-specific guidance
│   └── internal/
├── cdk/                # AWS infrastructure
│   ├── AGENTS.md       # CDK-specific guidance
│   └── lib/
└── scripts/            # Automation scripts
```

---

## Ecosystem Context

```
{{ECOSYSTEM_NAME}} Ecosystem
├── Account App     → SSO, user/tenant management, subscriptions
├── {{APP_NAME}}    → THIS APP
└── Other Apps...   → Same shared infrastructure
```

**Shared infrastructure (DO NOT REBUILD):**
- Cross-domain SSO via `ds-session` cookie
- User preferences via `ds-prefs` cookie  
- Multi-tenancy with roles/permissions
- AppShell (header, footer, nav, theme, GDPR)

---

## Quick Reference

| Need | Solution |
|------|----------|
| Current user | `useAuth().user` |
| Current tenant | `useAuth().currentTenant` |
| Check role | `currentTenant.roles.includes('editor')` |
| Theme | `useTheme().resolvedTheme` |
| Preferences | `usePrefs()` |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 / TypeScript / Vite / Tailwind |
| Backend | Go 1.21 / Lambda |
| Infra | CDK / CloudFront / S3 / DynamoDB |

---

## Deployment

Push to `main` → CI → Canary deploy → Promote or rollback

**After any infrastructure changes:**
```bash
./scripts/register-manifest.sh
```

See `cdk/AGENTS.md` for infrastructure manifest details.

---

## External References

| Resource | Purpose |
|----------|---------|
| [ds-app-developer](https://github.com/DigiStratum/ds-app-developer) | Canonical source, shared packages |
| [AppShell Standard](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/APPSHELL_STANDARD.md) | Auth flows, cookie contracts |
| [NFR Checklist](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/NFR-CHECKLIST.md) | Non-functional requirements |
