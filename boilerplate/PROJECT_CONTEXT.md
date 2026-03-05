# PROJECT_CONTEXT.md — [APP_NAME]

## Purpose

_[Brief description: what this app does, who it serves, core value proposition]_

## Domain

_[Business domain this app owns. What data/workflows are authoritative here vs. fetched from other DS apps]_

## Architecture

_[High-level structure: key modules, data flow, external integrations]_

See `/docs/` for deep dives on specific topics.

## Deviations from Standards

_[Any overrides to AGENTS.md or DIGISTRATUM.md patterns. Keep rare — if everything is special, nothing is.]_

| Area | Standard | This App | Reason |
|------|----------|----------|--------|
| _example_ | _Go backend_ | _Node.js_ | _Legacy constraint_ |

## App-Specific Tooling

_[Build/test/deploy commands unique to this app]_

```bash
# Example: custom migration
npm run db:migrate
```

## Key Files

| Path | Purpose |
|------|---------|
| `/backend/cmd/lambda/` | Lambda entry point |
| `/frontend/src/` | React app |
| `/cdk/` | Infrastructure |

## Related Docs

- `/docs/[topic].md` — _[description]_
