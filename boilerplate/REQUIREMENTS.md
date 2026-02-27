# {{APP_NAME}} Requirements

> Source of truth for what the application must do.
> All code changes should trace back to requirements in this document.

---

## Requirement ID Format

```
FR-{DOMAIN}-{NNN}    # Functional requirements
NFR-{DOMAIN}-{NNN}   # Non-functional requirements
```

---

## Functional Requirements

### Authentication (AUTH)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-AUTH-001 | Users authenticate via DSAccount SSO | 🔲 TODO |
| FR-AUTH-002 | Unauthenticated requests redirect to SSO login | 🔲 TODO |
| FR-AUTH-003 | Session includes user identity and tenant context | 🔲 TODO |
| FR-AUTH-004 | Users can log out, clearing their session | 🔲 TODO |

### Multi-Tenancy (TENANT)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-TENANT-001 | Users belong to one or more tenants | 🔲 TODO |
| FR-TENANT-002 | Users can switch between tenants they belong to | 🔲 TODO |
| FR-TENANT-003 | All data queries are scoped to current tenant | 🔲 TODO |

### Core Features (CORE)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-CORE-001 | *Add your first core feature here* | 🔲 TODO |

---

## Non-Functional Requirements

### Performance (PERF)

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-PERF-001 | API response time < 500ms (p95) | 🔲 TODO |
| NFR-PERF-002 | Frontend initial load < 3s (3G) | 🔲 TODO |

### Security (SEC)

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-SEC-001 | All API endpoints require authentication except health | 🔲 TODO |
| NFR-SEC-002 | Sensitive data encrypted at rest | 🔲 TODO |

### Reliability (REL)

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-REL-001 | Service availability > 99.9% | 🔲 TODO |

---

## Traceability Matrix

| Requirement | Test File | Status |
|-------------|-----------|--------|
| FR-AUTH-001 | *(add test file)* | 🔲 |
| FR-AUTH-002 | *(add test file)* | 🔲 |
| ... | ... | ... |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| YYYY-MM-DD | Initial requirements from boilerplate | *your name* |

---

*Update this document before implementing features. All work should trace to a requirement.*
