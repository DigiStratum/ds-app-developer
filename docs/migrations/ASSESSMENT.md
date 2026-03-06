# AppShell Migration Assessment Procedure

> Standard procedure for assessing an app's readiness for AppShell migration.
> Output: A migration plan with specific tasks.

## Prerequisites

- Access to target app repository
- Current `APPSHELL_CONTRACT.md` (defines v1.0.0 requirements)
- DSKanban project for the target app

## Procedure

### Step 1: Version Check

Check if `APPSHELL.json` exists in repo root.

```bash
cat APPSHELL.json 2>/dev/null || echo "NO APPSHELL.json - Pre-v1 app"
```

| Result | Next Step |
|--------|-----------|
| Version found | Use upgrade path (e.g., `0.x-to-1.0.md`) |
| No file | Continue with full assessment (pre-v1) |

### Step 2: Structure Audit

Compare app structure to `APPSHELL_CONTRACT.md`. Fill in the audit table:

| Category | Requirement | Present? | Gap Description |
|----------|-------------|----------|-----------------|
| **Root Files** | | | |
| | APPSHELL.json | | |
| | AGENTS.md | | |
| | PROJECT_CONTEXT.md | | |
| | REQUIREMENTS.md | | |
| | README.md | | |
| **Backend** | | | |
| | cmd/lambda/ or cmd/api/ | | |
| | internal/api/handlers.go | | |
| | internal/middleware/auth.go | | |
| | internal/middleware/apikey.go | | |
| | internal/models/ | | |
| | internal/dynamo/ | | |
| | internal/health/ | | |
| | go.mod / go.sum | | |
| **Frontend** | | | |
| | src/components/ | | |
| | src/pages/ | | |
| | src/hooks/ | | |
| | package.json | | |
| | vite.config.ts | | |
| | TypeScript configured | | |
| | Tailwind CSS configured | | |
| **CDK** | | | |
| | cdk/ directory | | |
| | Standard stack structure | | |
| | cdk.json | | |
| **CI/CD** | | | |
| | .github/workflows/ci.yml | | |
| | .github/workflows/deploy.yml | | |

### Step 3: App-Specific Code Inventory

Identify code that is unique to this app (not boilerplate):

**Backend:**
- [ ] List custom API handlers
- [ ] List domain models
- [ ] List business logic packages
- [ ] Note any non-standard patterns

**Frontend:**
- [ ] List app-specific components
- [ ] List custom pages/routes
- [ ] Note any non-standard patterns

**Data:**
- [ ] List DynamoDB tables
- [ ] Document data schemas
- [ ] Note any migration needs

### Step 4: Dependency Audit

Check versions against boilerplate:

```bash
# Backend
cat backend/go.mod | grep -E "^go |require"

# Frontend
cat frontend/package.json | jq '.dependencies, .devDependencies'

# CDK
cat cdk/package.json | jq '.dependencies'
```

Flag any:
- Significantly outdated versions
- Conflicting dependencies
- Missing standard dependencies

### Step 5: Risk Assessment

| Factor | Current State | Risk Level |
|--------|---------------|------------|
| Active users/traffic | | Low/Med/High |
| Data sensitivity | | Low/Med/High |
| External integrations | | Low/Med/High |
| Test coverage | | Low/Med/High |
| Deployment frequency | | Low/Med/High |

### Step 6: Generate Migration Plan

Using the template at `templates/MIGRATION_PLAN.md`, create a migration plan document in the target app's `docs/` directory.

Group tasks by:
1. **Prerequisites** — What must exist before migration starts
2. **Structure changes** — File/directory reorganization
3. **Code changes** — Adapting to contract interfaces
4. **Dependency updates** — Version bumps
5. **CI/CD updates** — Workflow changes
6. **Verification** — Tests and deployment validation

## Output

1. `docs/MIGRATION_PLAN.md` in target app repo
2. Epic issue in DSKanban with child tasks
3. Commit assessment artifacts

---

*Procedure version: 1.0 | Aligned with AppShell v1.0.0*
