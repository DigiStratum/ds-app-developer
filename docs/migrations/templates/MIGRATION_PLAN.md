# Migration Plan: {APP_NAME}

> Generated: {DATE}
> Target AppShell Version: 1.0.0
> Current State: {PRE_V1 | VERSION}

## Executive Summary

{One paragraph describing current state, gaps, and migration scope.}

## Risk Assessment

| Factor | State | Risk |
|--------|-------|------|
| Active users | {low/med/high traffic} | {Low/Med/High} |
| Data sensitivity | {description} | {Low/Med/High} |
| Test coverage | {percentage or "unknown"} | {Low/Med/High} |
| Overall | | **{Low/Med/High}** |

## Gap Summary

| Category | Gaps Found | Effort |
|----------|------------|--------|
| Root files | {count} | {hours} |
| Backend structure | {count} | {hours} |
| Frontend structure | {count} | {hours} |
| CDK/Infra | {count} | {hours} |
| CI/CD | {count} | {hours} |
| **Total** | | **{hours}** |

## Migration Tasks

### Phase 1: Prerequisites

- [ ] **Task 1.1:** {description}
- [ ] **Task 1.2:** {description}

### Phase 2: Structure Changes

- [ ] **Task 2.1:** {description}
- [ ] **Task 2.2:** {description}

### Phase 3: Code Adaptation

- [ ] **Task 3.1:** {description}
- [ ] **Task 3.2:** {description}

### Phase 4: Dependency Updates

- [ ] **Task 4.1:** {description}

### Phase 5: CI/CD Updates

- [ ] **Task 5.1:** {description}

### Phase 6: Verification

- [ ] **Task 6.1:** All tests pass
- [ ] **Task 6.2:** Deploy to staging
- [ ] **Task 6.3:** Smoke test
- [ ] **Task 6.4:** Deploy to prod
- [ ] **Task 6.5:** Post-deploy verification

## App-Specific Code Preserved

The following app-specific code will be preserved/migrated:

**Backend:**
- {list handlers, models, business logic}

**Frontend:**
- {list components, pages}

**Data:**
- {list tables, note any schema changes}

## Rollback Plan

In case of critical issues:
1. {step}
2. {step}

## Sign-off

- [ ] Assessment reviewed by: {name}
- [ ] Plan approved by: {name}
- [ ] Migration complete: {date}

---

*Template version: 1.0*
