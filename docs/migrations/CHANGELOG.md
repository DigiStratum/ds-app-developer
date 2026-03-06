# AppShell Changelog

All notable changes to the AppShell contract.

## [1.0.0] - 2026-03-05

### Initial Release

Established baseline AppShell contract:

**Structure:**
- Required root files: APPSHELL.json, AGENTS.md, PROJECT_CONTEXT.md, REQUIREMENTS.md, README.md
- Backend: cmd/lambda/, internal/{api,middleware,models,dynamo,health}
- Frontend: src/{components,pages,hooks}, Vite + TypeScript + Tailwind
- CDK: Standard CloudFront + Lambda + DynamoDB stack
- CI/CD: ci.yml + deploy.yml workflows

**Contracts:**
- Dual auth: SSO session cookie + API key header
- Health endpoint: GET /api/health
- Standard API response format
- DSAccount SSO integration

**Documentation:**
- ASSESSMENT.md: Standard migration assessment procedure
- APPSHELL_CONTRACT.md: Full contract specification
- templates/MIGRATION_PLAN.md: Migration plan template

---

## Pre-1.0 (Legacy)

Apps without `APPSHELL.json` are considered pre-v1. Use `ASSESSMENT.md` to audit and plan migration.

---

*Format follows [Keep a Changelog](https://keepachangelog.com/)*
