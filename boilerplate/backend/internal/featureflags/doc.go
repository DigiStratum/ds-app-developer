// Package featureflags provides infrastructure for feature flag management.
//
// # Overview
//
// Feature flags enable deploy/release separation by allowing code to be deployed
// without immediately being available to users. This package provides:
//
//   - FeatureFlag struct with support for user/tenant overrides and percentage rollouts
//   - DynamoDB-backed storage with in-memory caching
//   - Evaluation logic with clear priority ordering
//   - HTTP handlers for flag management API
//   - Middleware for easy context-based evaluation
//
// # Evaluation Priority
//
// Flags are evaluated in this order (first match wins):
//
//  1. User-specific disable (DisabledUsers list)
//  2. User-specific enable (Users list)
//  3. Tenant-specific disable (DisabledTenants list)
//  4. Tenant-specific enable (Tenants list)
//  5. Percentage rollout (hash-based, deterministic)
//  6. Global default (Enabled field)
//
// # Usage
//
// In handlers (with middleware applied):
//
//	if featureflags.IsEnabled(ctx, "new-dashboard") {
//	    // Show new dashboard
//	} else {
//	    // Show old dashboard
//	}
//
// Without middleware:
//
//	enabled := featureflags.IsEnabledForUser(ctx, "feature", userID, sessionID, tenantID)
//
// # DynamoDB Schema
//
// Flags are stored in the main application table:
//
//	PK: FF#<flag-key>
//	SK: FLAG
//
// # API Endpoints
//
//	GET  /api/flags/evaluate  - Evaluate all flags for current context (any user)
//	GET  /api/flags           - List all flags (admin only)
//	PUT  /api/flags/:key      - Create/update flag (admin only)
//	DELETE /api/flags/:key    - Delete flag (admin only)
package featureflags
