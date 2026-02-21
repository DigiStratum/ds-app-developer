# Logging & Error Handling - DS App Developer

> This document defines the logging and error handling patterns for DigiStratum applications.
> All applications based on ds-app-developer must follow these conventions.

---

## Table of Contents
1. [Overview](#overview)
2. [Backend Logging](#backend-logging)
3. [Request Correlation](#request-correlation)
4. [Error Handling](#error-handling)
5. [Frontend Error Boundaries](#frontend-error-boundaries)
6. [CloudWatch Integration](#cloudwatch-integration)
7. [Debugging Guide](#debugging-guide)

---

## Overview

### Design Principles

1. **Structured logging** - All logs are JSON for CloudWatch Logs Insights
2. **Correlation IDs** - Every request traced end-to-end with unique ID
3. **Panic recovery** - Backend never crashes; always returns error response
4. **Error boundaries** - Frontend gracefully handles component failures
5. **Consistent error format** - Standard JSON error responses across all endpoints

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend logging | Go `log/slog` | Structured JSON logging |
| Frontend errors | React Error Boundary | Catch render failures |
| Tracing | X-Correlation-ID header | Request correlation |
| Monitoring | CloudWatch Logs Insights | Log analysis |

---

## Backend Logging

### Logger Configuration

The logger is configured in `cmd/api/main.go` to output JSON for CloudWatch:

```go
import "log/slog"

func init() {
    // Configure structured JSON logging for CloudWatch [NFR-MON-001]
    logLevel := slog.LevelInfo
    if os.Getenv("LOG_LEVEL") == "debug" {
        logLevel = slog.LevelDebug
    }
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: logLevel,
    }))
    slog.SetDefault(logger)
}
```

### Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| `Debug` | Development diagnostics, verbose tracing | Token parsing details |
| `Info` | Normal operations | Request received, user authenticated |
| `Warn` | Recoverable issues | Invalid input, rate limited |
| `Error` | Failures requiring attention | Database error, external service down |

### Structured Logging Pattern

**Always use structured fields, never string interpolation:**

```go
import "log/slog"

// ✅ Correct - structured with context
slog.Info("user authenticated",
    "correlation_id", correlationID,
    "user_id", user.ID,
    "tenant_id", tenantID,
    "method", r.Method,
    "path", r.URL.Path)

slog.Warn("invalid token",
    "correlation_id", correlationID,
    "error", err,
    "token_prefix", token[:8])

// ❌ Wrong - unstructured string formatting
log.Printf("User %s authenticated for tenant %s", userID, tenantID)
```

### Using Correlation-Aware Logger

The middleware package provides a helper that automatically includes the correlation ID:

```go
import "github.com/DigiStratum/ds-app-developer/backend/internal/middleware"

func MyHandler(w http.ResponseWriter, r *http.Request) {
    // Get logger with correlation ID pre-attached
    logger := middleware.LoggerWithCorrelation(r.Context())
    
    logger.Info("processing request", "user_id", userID)
    // Output includes "correlation_id": "abc-123" automatically
}
```

---

## Request Correlation

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REQUEST FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Request arrives (from API Gateway, browser, or upstream service)        │
│  2. CorrelationIDMiddleware checks X-Correlation-ID header                  │
│  3. If present → use existing ID (distributed tracing)                      │
│  4. If absent → generate new UUID                                           │
│  5. ID added to request context and response header                         │
│  6. All logs include correlation_id field                                   │
│  7. Error responses include request_id (same as correlation_id)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Correlation ID Sources

The middleware checks headers in this order:
1. `X-Correlation-ID` - Standard correlation header
2. `X-Amzn-Request-Id` - AWS API Gateway request ID
3. Generate new UUID if neither present

### Using Correlation IDs

**In handlers:**
```go
func MyHandler(w http.ResponseWriter, r *http.Request) {
    correlationID := middleware.GetCorrelationID(r.Context())
    
    // Use in external service calls
    req, _ := http.NewRequest("GET", externalURL, nil)
    req.Header.Set("X-Correlation-ID", correlationID)
}
```

**In error responses:**
```go
api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid input")
// Response includes request_id for support correlation
```

---

## Error Handling

### Middleware Stack

The middleware is applied in order (outermost executes first):

```go
var handler http.Handler = mux
handler = middleware.LoggingMiddleware(handler)     // 3. Log completion
handler = middleware.CorrelationIDMiddleware(handler) // 2. Assign/extract ID
handler = middleware.RecoveryMiddleware(handler)    // 1. Catch panics
```

### Panic Recovery

The RecoveryMiddleware catches any panic and:
1. Logs the panic with full stack trace
2. Returns a 500 response with standard error format
3. Never crashes the Lambda function

```go
// Example panic recovery log
{
    "level": "ERROR",
    "msg": "panic recovered",
    "correlation_id": "abc-123",
    "error": "runtime error: index out of range",
    "method": "GET",
    "path": "/api/users/123",
    "stack": "goroutine 1 [running]:\n..."
}
```

### Standard Error Response

All errors use this format ([NFR-SEC-004]):

```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Email is required",
        "details": {
            "field": "email"
        },
        "request_id": "abc-123"
    }
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `TENANT_REQUIRED` | 400 | Missing tenant context |
| `INTERNAL_ERROR` | 500 | Server error (panic or unexpected) |

### Writing Errors

```go
// With request for correlation ID
api.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Email is required")

// Manual error with details
api.WriteJSON(w, http.StatusBadRequest, api.ErrorResponse{
    Error: api.ErrorDetail{
        Code:    "VALIDATION_ERROR",
        Message: "Invalid input",
        Details: map[string]string{
            "email": "must be valid email address",
            "name": "must be at least 2 characters",
        },
        RequestID: middleware.GetCorrelationID(r.Context()),
    },
})
```

---

## Frontend Error Boundaries

### What Error Boundaries Catch

- Errors during rendering
- Errors in lifecycle methods
- Errors in constructors of child components

### What They Don't Catch

- Event handlers (use try/catch)
- Async code (promises, setTimeout)
- Server-side rendering
- Errors in the boundary itself

### Basic Usage

```tsx
import { ErrorBoundary } from './components';

// Wrap sections of your app
<ErrorBoundary>
  <UserProfile />
</ErrorBoundary>
```

### With Route Reset

The `ErrorBoundaryWithKey` component resets when the route changes:

```tsx
import { useLocation } from 'react-router-dom';
import { ErrorBoundaryWithKey } from './components';

function AppRoutes() {
  const location = useLocation();
  
  return (
    <ErrorBoundaryWithKey resetKey={location.pathname}>
      <Routes>
        {/* Routes reset error state on navigation */}
      </Routes>
    </ErrorBoundaryWithKey>
  );
}
```

### Custom Error Handler

Log errors to an external service:

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Send to error tracking service
    logErrorToService({
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }}
>
  <App />
</ErrorBoundary>
```

### Custom Fallback UI

```tsx
<ErrorBoundary
  fallback={
    <div className="error-page">
      <h1>Oops! Something went wrong.</h1>
      <button onClick={() => window.location.reload()}>Refresh</button>
    </div>
  }
>
  <App />
</ErrorBoundary>
```

---

## CloudWatch Integration

### Log Format

All logs are JSON, compatible with CloudWatch Logs Insights:

```json
{
    "time": "2026-02-19T07:00:00Z",
    "level": "INFO",
    "msg": "request completed",
    "correlation_id": "abc-123",
    "method": "GET",
    "path": "/api/users",
    "status": 200,
    "duration_ms": 45,
    "size_bytes": 1024
}
```

### Useful CloudWatch Queries

**Find all errors:**
```sql
fields @timestamp, @message
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

**Trace a single request:**
```sql
fields @timestamp, level, msg
| filter correlation_id = "abc-123"
| sort @timestamp asc
```

**Slow requests (>1s):**
```sql
fields @timestamp, method, path, duration_ms
| filter msg = "request completed" and duration_ms > 1000
| sort duration_ms desc
| limit 50
```

**Error rate by endpoint:**
```sql
fields path
| filter msg = "request completed"
| stats count(*) as total, 
        sum(case when status >= 500 then 1 else 0 end) as errors
  by path
| display path, total, errors, (errors * 100.0 / total) as error_rate
```

**Panics in the last 24h:**
```sql
fields @timestamp, correlation_id, error, path
| filter msg = "panic recovered"
| sort @timestamp desc
```

---

## Debugging Guide

### Tracing a Failed Request

1. **Get the correlation ID** from the error response or logs
2. **Search CloudWatch** with the correlation ID
3. **Review the request flow** from start to completion

### Common Issues

| Symptom | Likely Cause | Check |
|---------|--------------|-------|
| 500 error, no logs | Panic before logging | Check RecoveryMiddleware logs |
| Missing correlation ID | Middleware order wrong | Verify stack order in main.go |
| Logs not JSON | Wrong handler | Check slog.NewJSONHandler setup |
| Error boundary not catching | Not a render error | Use try/catch in event handlers |

### Local Development

Set debug logging:
```bash
LOG_LEVEL=debug go run ./cmd/api
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOG_LEVEL` | `info` | Logging verbosity (debug, info, warn, error) |

---

## Requirements Traceability

| Pattern | Requirements |
|---------|-------------|
| JSON logging | NFR-MON-001 |
| Correlation IDs | NFR-MON-004 |
| Panic recovery | NFR-AVAIL-001 |
| Error boundaries | NFR-AVAIL-002 |
| Standard error format | NFR-SEC-004 |

---

*Document version: 1.0.0*
*Last updated: 2026-02-19*
