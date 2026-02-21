# Health Checks

> This document describes the health check system for DS App Developer.
> Health checks support both load balancer probes and deep dependency verification.

---

## Table of Contents
1. [Overview](#overview)
2. [Shallow Health Checks](#shallow-health-checks)
3. [Deep Health Checks](#deep-health-checks)
4. [Authentication](#authentication)
5. [Configuration](#configuration)
6. [Response Format](#response-format)
7. [Status Values](#status-values)
8. [Dependency Configuration](#dependency-configuration)
9. [Integration Examples](#integration-examples)
10. [Production Checklist](#production-checklist)

---

## Overview

The health check system provides two levels of visibility:

| Type | Endpoint | Auth Required | Use Case |
|------|----------|---------------|----------|
| **Shallow** | `GET /health` or `GET /health?depth=shallow` | No | Load balancer probes, quick status |
| **Deep** | `GET /health?depth=deep` | Yes | Dependency verification, debugging |

### Architecture

```
                           ┌─────────────────────────────┐
                           │      Health Check API       │
                           └──────────────┬──────────────┘
                                          │
              ┌───────────────────────────┴───────────────────────────┐
              │                                                       │
   ┌──────────▼──────────┐                               ┌───────────▼───────────┐
   │   Shallow Check     │                               │     Deep Check        │
   │   (No Auth)         │                               │   (Auth Required)     │
   └─────────────────────┘                               └───────────┬───────────┘
                                                                     │
                                         ┌───────────────────────────┼───────────────────────────┐
                                         │                           │                           │
                              ┌──────────▼──────────┐   ┌───────────▼───────────┐   ┌──────────▼──────────┐
                              │    DSAccount        │   │      DSKanban         │   │     Other Deps      │
                              │    (critical)       │   │    (non-critical)     │   │                     │
                              └─────────────────────┘   └───────────────────────┘   └─────────────────────┘
```

### Requirements Traceability

| Requirement | Description | Implementation |
|-------------|-------------|----------------|
| NFR-AVAIL-003 | Health endpoint for load balancer | `GET /health` shallow check |
| NFR-MON-001 | Structured logging | JSON logs with correlation ID |
| FR-AUTH-001 | Auth for sensitive endpoints | M2M token or superadmin for deep |

---

## Shallow Health Checks

Shallow health checks are designed for load balancers and monitoring systems that need fast, frequent checks.

### Endpoint

```
GET /health
GET /health?depth=shallow
```

### Characteristics

- **No authentication required**
- **Fast response** (<10ms typical)
- **No external calls** - checks internal state only
- **Always returns status** - even during issues

### Example Response

```json
{
  "status": "up",
  "timestamp": "2026-02-19T10:00:00Z",
  "version": "1.0.0"
}
```

### HTTP Status Codes

| Health Status | HTTP Code | Meaning |
|---------------|-----------|---------|
| `up` | 200 OK | Service is healthy |
| `down` | 503 Service Unavailable | Service cannot handle requests |

---

## Deep Health Checks

Deep health checks provide comprehensive visibility into the application and its dependencies.

### Endpoint

```
GET /health?depth=deep
```

### Characteristics

- **Authentication required** (M2M token or superadmin session)
- **Checks all configured dependencies** in parallel
- **Returns detailed metrics** (latency, uptime, per-dependency status)
- **May take longer** (depends on dependency timeouts)

### Example Response

```json
{
  "status": "up",
  "timestamp": "2026-02-19T10:00:00Z",
  "version": "1.0.0",
  "uptime": "72h30m15s",
  "uptime_pct": 99.9,
  "dependencies": [
    {
      "name": "dsaccount",
      "status": "up",
      "latency_ms": 45,
      "critical": true,
      "description": "Authentication service"
    },
    {
      "name": "dskanban",
      "status": "up",
      "latency_ms": 62,
      "critical": false,
      "description": "Issue tracking"
    }
  ],
  "latency": {
    "total_ms": 68,
    "min_ms": 45,
    "max_ms": 62,
    "avg_ms": 53
  }
}
```

### HTTP Status Codes

| Health Status | HTTP Code | Meaning |
|---------------|-----------|---------|
| `up` | 200 OK | All systems operational |
| `degraded` | 200 OK | Non-critical issues, still operational |
| `down` | 503 Service Unavailable | Critical dependency failed |

---

## Authentication

Deep health checks require one of the following:

### Option 1: M2M Token (Recommended for automation)

Machine-to-machine tokens are ideal for:
- Monitoring systems
- CI/CD pipelines
- Internal service-to-service calls

```bash
curl -H "Authorization: Bearer $HEALTH_M2M_TOKEN" \
  "https://app.example.com/health?depth=deep"
```

**Configuration:**
```bash
# Set in environment or SSM Parameter Store
HEALTH_M2M_TOKEN=<secure-random-token>
```

### Option 2: Superadmin Session

Superadmin users can access deep health checks through the browser:
- Users with IDs listed in `SUPERADMIN_USER_IDS`
- Users with email containing `+superadmin@`

**Configuration:**
```bash
# Comma-separated list of superadmin user IDs
SUPERADMIN_USER_IDS=user-123,user-456
```

### Unauthorized Response

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Deep health checks require M2M token or superadmin session"
  }
}
```

---

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HEALTH_DEPENDENCIES` | Dependency configuration | See below |
| `HEALTH_M2M_TOKEN` | Token for M2M authentication | `abc123...` |
| `SUPERADMIN_USER_IDS` | Comma-separated superadmin IDs | `user-1,user-2` |
| `APP_VERSION` | Version shown in health response | `1.2.3` |

### Dependency Configuration Format

The `HEALTH_DEPENDENCIES` environment variable uses a pipe-delimited format:

```
name|url|timeout_ms|critical|description
```

Multiple dependencies are comma-separated:

```bash
HEALTH_DEPENDENCIES="dsaccount|https://account.digistratum.com/health|5000|true|Authentication,dskanban|https://kanban.digistratum.com/health|3000|false|Issue tracking"
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier for the dependency |
| `url` | Yes | Health check URL to ping |
| `timeout_ms` | No | Request timeout (default: 5000) |
| `critical` | No | If `true`, failure marks system as down |
| `description` | No | Human-readable description |

---

## Response Format

### HealthResponse

```typescript
interface HealthResponse {
  status: "up" | "degraded" | "down";
  timestamp: string;     // ISO 8601
  version: string;
  uptime?: string;       // Only in deep check
  uptime_pct?: number;   // Only in deep check
  dependencies?: DependencyResult[];  // Only in deep check
  latency?: LatencyMetrics;  // Only in deep check
}
```

### DependencyResult

```typescript
interface DependencyResult {
  name: string;
  status: "up" | "degraded" | "down";
  latency_ms: number;
  message?: string;      // Error details if not up
  critical: boolean;
  description?: string;
}
```

### LatencyMetrics

```typescript
interface LatencyMetrics {
  total_ms: number;   // Total time for all checks (parallel)
  min_ms: number;     // Minimum dependency latency
  max_ms: number;     // Maximum dependency latency
  avg_ms: number;     // Average dependency latency
}
```

---

## Status Values

### Overall Status Logic

```
if (any critical dependency is down):
    status = "down"
else if (any dependency is degraded OR any non-critical is down):
    status = "degraded"
else:
    status = "up"
```

### Dependency Status Logic

| HTTP Response | Status |
|---------------|--------|
| 2xx | `up` |
| 4xx | `degraded` |
| 5xx | `down` |
| Timeout | `down` |
| Connection error | `down` |

---

## Dependency Configuration

### Critical vs Non-Critical

**Critical dependencies** are services without which this application cannot function:
- Authentication service (DSAccount)
- Primary database

If a critical dependency is down, the overall status is `down`.

**Non-critical dependencies** are services that enhance functionality but aren't essential:
- Analytics
- Feature flags
- Secondary services

If a non-critical dependency is down, the overall status is `degraded`.

### Example Configuration

```bash
# Production configuration
HEALTH_DEPENDENCIES="dsaccount|https://account.digistratum.com/health|5000|true|SSO authentication,dscrm|https://crm.digistratum.com/health|3000|false|Customer data"
```

---

## Integration Examples

### Load Balancer (AWS ALB)

Configure ALB health check:
- Path: `/health`
- Interval: 30 seconds
- Timeout: 5 seconds
- Healthy threshold: 2
- Unhealthy threshold: 2

### Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```

### Monitoring System (Datadog)

```yaml
# Shallow check for uptime monitoring
- name: app-health-shallow
  url: https://app.example.com/health
  interval: 60s
  expected_status: 200

# Deep check for dependency monitoring (less frequent)
- name: app-health-deep
  url: https://app.example.com/health?depth=deep
  interval: 300s
  headers:
    Authorization: Bearer ${HEALTH_M2M_TOKEN}
  expected_status: 200
```

### cURL Examples

```bash
# Shallow check (no auth)
curl https://app.example.com/health

# Deep check with M2M token
curl -H "Authorization: Bearer $HEALTH_M2M_TOKEN" \
  "https://app.example.com/health?depth=deep"

# Deep check with pretty output
curl -s -H "Authorization: Bearer $HEALTH_M2M_TOKEN" \
  "https://app.example.com/health?depth=deep" | jq .
```

---

## Production Checklist

### Before Deployment

- [ ] Generate secure `HEALTH_M2M_TOKEN` (min 32 random bytes)
- [ ] Configure `HEALTH_DEPENDENCIES` for all critical services
- [ ] Set `SUPERADMIN_USER_IDS` for ops team access
- [ ] Test shallow health check from load balancer
- [ ] Test deep health check with M2M token

### Monitoring Setup

- [ ] Configure load balancer health check pointing to `/health`
- [ ] Set up monitoring for deep health checks (every 5 min)
- [ ] Alert on `status: degraded` (warning)
- [ ] Alert on `status: down` (critical)
- [ ] Dashboard showing dependency latency trends

### Security

- [ ] Store `HEALTH_M2M_TOKEN` in Secrets Manager/SSM
- [ ] Rotate M2M token periodically
- [ ] Audit logs for deep health check access
- [ ] Ensure M2M token is not logged

### Token Generation

```bash
# Generate a secure M2M token
openssl rand -hex 32

# Store in AWS SSM Parameter Store
aws ssm put-parameter \
  --name "/ds-app-developer/health-m2m-token" \
  --value "$(openssl rand -hex 32)" \
  --type SecureString
```

---

## Troubleshooting

### "Unauthorized" on Deep Check

1. Verify `Authorization: Bearer <token>` header is set
2. Check `HEALTH_M2M_TOKEN` environment variable is configured
3. If using session auth, verify user is in `SUPERADMIN_USER_IDS`

### Dependency Showing as Down

1. Check dependency URL is correct
2. Verify network connectivity (security groups, VPC)
3. Check if dependency requires auth (health endpoints should be unauthenticated)
4. Increase `timeout_ms` if dependency is slow

### High Latency on Deep Check

1. Dependencies are checked in parallel, so total time = max(dependency times)
2. Check slowest dependency
3. Consider reducing timeouts for non-critical dependencies

---

*Document version: 1.0.0*
*Last updated: 2026-02-19*
