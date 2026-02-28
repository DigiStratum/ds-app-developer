// Package health provides health check capabilities for DS App Boilerplate.
//
// The health check system supports two modes:
//
// Shallow checks (GET /health or GET /health?depth=shallow) are unauthenticated
// and designed for load balancer probes. They return quickly without checking
// external dependencies.
//
// Deep checks (GET /health?depth=deep) require authentication via M2M token
// or superadmin session. They check all configured dependencies in parallel
// and return detailed status, latency metrics, and uptime information.
//
// # Configuration
//
// Dependencies are configured via the HEALTH_DEPENDENCIES environment variable
// using a pipe-delimited format:
//
//	name|url|timeout_ms|critical|description
//
// Multiple dependencies are comma-separated:
//
//	HEALTH_DEPENDENCIES="svc1|https://svc1.example.com/health|5000|true|Service 1,svc2|https://svc2.example.com/health|3000|false|Service 2"
//
// # Authentication for Deep Checks
//
// Deep checks accept either:
//   - M2M token in Authorization header (Bearer token matching HEALTH_M2M_TOKEN)
//   - Superadmin session (user ID in SUPERADMIN_USER_IDS or email with +superadmin@)
//
// # Status Values
//
// The overall status is determined by dependency results:
//   - "up": All dependencies are healthy
//   - "degraded": Non-critical dependency is down or any dependency is degraded
//   - "down": Critical dependency is down
package health
