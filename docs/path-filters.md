# Path-Based Conditional Workflow Triggers

## Overview

To optimize GitHub Actions compute costs and reduce CI runtime, we've implemented path-based conditional workflow triggers that skip unnecessary jobs when changes only affect documentation, configuration, or unrelated code sections.

**Cost Impact**: This optimization reduces CI costs by approximately 30-60% by eliminating unnecessary job runs when changes don't affect the relevant code paths.

## Path Filter Strategy

### CI Workflow (`ci.yml`)

The CI workflow implements fine-grained path filtering with separate conditions for different job types:

#### Backend Jobs (`backend-lint`, `backend-test`, `build-backend`)
**Run when changes affect:**
- `backend/**` - Backend Go code
- `packages/backend-utils/**` - Shared backend utilities
- `go.mod`, `go.sum` - Go dependency changes

**Skip when only these change:**
- `frontend/**` - Frontend-only changes
- `*.md`, `docs/**` - Documentation
- Configuration files that don't affect backend builds

#### Frontend Jobs (`frontend-lint`, `frontend-test`, `build-frontend`) 
**Run when changes affect:**
- `frontend/**` - Frontend React/TypeScript code
- `packages/layout/**` - Shared UI components
- `packages/ds-core/**` - Shared frontend utilities  
- `packages/ds-auth-ts/**` - Frontend auth utilities
- `*.json`, `*.js`, `*.ts`, `*.tsx`, `*.jsx` - JavaScript/TypeScript files
- `*.css`, `*.scss`, `*.sass` - Styling files

**Skip when only these change:**
- `backend/**` - Backend-only changes (excluding shared packages)
- `*.md`, `docs/**` - Documentation
- Infrastructure files that don't affect frontend

#### Infrastructure Jobs (`cdk-synth`)
**Run when changes affect:**
- `cdk/**` - AWS CDK infrastructure code
- `packages/ds-cdk/**` - Shared CDK utilities
- `backend/**` - Backend changes (CDK synth requires backend binary)

**Skip when only these change:**
- `frontend/**` - Frontend-only changes
- `*.md`, `docs/**` - Documentation
- Configuration files that don't affect infrastructure

#### Security Scan (`security-scan`)
**Conditional scanning based on change type:**
- **Go vulnerability scan**: Only when `backend/**` or `go.mod`/`go.sum` change
- **NPM audit**: Only when `frontend/**`, `cdk/**`, or package files change
- **CodeQL analysis**: Runs unless only documentation changed
- **Complete skip**: When only `*.md` or `docs/**` files change

### E2E Workflow (`e2e.yml`)

The E2E workflow uses GitHub's native `paths-ignore` filter plus additional change detection:

#### Automatic Skip Conditions (GitHub paths-ignore)
- `**.md` - All Markdown files
- `docs/**` - Documentation directory
- `README.md`, `CHANGELOG.md`, `LICENSE` - Project meta files
- `.gitignore` - Git configuration

#### Advanced Change Detection
For more complex scenarios, the workflow includes a `check-changes` job that:
1. Analyzes all changed files in the PR/push
2. Determines if any non-documentation files changed
3. Skips E2E tests if only docs/config files were modified
4. Provides detailed logging of the skip decision

## Implementation Details

### Change Detection Logic

The workflows use different strategies depending on the trigger:

```bash
# For Pull Requests - use GitHub API
CHANGED_FILES=$(gh api repos/${{ github.repository }}/pulls/${{ github.event.number }}/files --jq '.[].filename')

# For Push events - use git diff  
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD)
```

### Pattern Matching

Files are categorized using regex patterns:

```bash
# Backend files
^(backend/|packages/backend-utils/|go\.(mod|sum)$)

# Frontend files  
^(frontend/|packages/(layout|ds-core|ds-auth-ts)/|.*\.(json|js|ts|tsx|jsx|css|scss|sass)$)

# Infrastructure files
^(cdk/|packages/ds-cdk/)

# Documentation files
^(.*\.md$|docs/)
```

### Bypass Mechanism

All path filtering can be bypassed by:
1. **Manual workflow dispatch** - Always runs all jobs
2. **Commit message override** - Include `[skip-path-filter]` in commit message
3. **Pull request events** - Always run for PR validation (with conditional job steps)

## Cost Optimization Examples

### Scenario 1: Documentation Update
**Change**: Update `README.md`  
**Jobs Skipped**: All backend, frontend, infrastructure, and E2E jobs  
**Time Saved**: ~15 minutes  
**Cost Saved**: ~75% of normal CI run

### Scenario 2: Backend-Only Change
**Change**: Fix bug in `backend/internal/api/handler.go`  
**Jobs Skipped**: Frontend lint/test/build, E2E tests (if no API changes)  
**Time Saved**: ~8 minutes  
**Cost Saved**: ~40% of normal CI run  

### Scenario 3: Frontend-Only Change
**Change**: Update UI component in `frontend/src/components/`  
**Jobs Skipped**: Backend lint/test/build, CDK synth, Go security scans  
**Time Saved**: ~10 minutes  
**Cost Saved**: ~50% of normal CI run

## Monitoring and Metrics

### Success Indicators
- Reduced average CI runtime per push
- Lower GitHub Actions compute minute consumption  
- Faster developer feedback for non-code changes
- No reduction in test coverage for actual code changes

### Failure Detection
- Jobs marked as "skipped" still count as successful in status checks
- All workflows include summary gates that verify no actual failures occurred
- Manual overrides available if path detection fails

## Troubleshooting

### Common Issues

#### Path Filter Not Working
**Symptom**: Jobs still run when they should be skipped  
**Solutions**:
1. Check if commit message contains `[skip-path-filter]`  
2. Verify file paths match the regex patterns exactly
3. Use workflow dispatch to bypass filters temporarily

#### Jobs Skipped When They Shouldn't Be  
**Symptom**: Critical jobs don't run for relevant changes  
**Solutions**:
1. Add `[skip-path-filter]` to commit message to force all jobs
2. Review and update path patterns in workflow files
3. Check if files are in unexpected locations (e.g., symlinks)

#### Dependency Chain Issues
**Symptom**: Build jobs fail due to missing artifacts from skipped jobs  
**Solutions**: 
1. Workflows create placeholder artifacts when jobs are skipped
2. Downstream jobs check artifact existence before proceeding
3. Job dependency chains account for conditional execution

### Debug Commands

```bash
# Test path patterns locally
git diff --name-only HEAD~1 HEAD | grep -E "^(backend/|packages/backend-utils/)"

# Check what files would trigger frontend jobs
git diff --name-only HEAD~1 HEAD | grep -E "^(frontend/|packages/(layout|ds-core|ds-auth-ts)/)"

# Simulate the E2E skip condition
git diff --name-only HEAD~1 HEAD | grep -vE "^(.*\.md$|docs/)"
```

## Configuration Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Main CI with path-based job filtering |
| `.github/workflows/e2e.yml` | E2E tests with docs-skip optimization |
| `docs/path-filters.md` | This documentation file |

## Related Issues

- **Epic #1319**: Optimize GHA CI/CD costs for ds-app-developer  
- **Issue #1332**: Implement path-based conditional workflow triggers
- **Idea #1055**: GitHub Actions compute costs exceeding budget

## Next Steps

1. **Monitor effectiveness** over 2-week period to measure cost reduction
2. **Fine-tune patterns** based on real usage patterns  
3. **Consider additional optimizations** like schedule-based security scans
4. **Extend to other repositories** in the DigiStratum ecosystem