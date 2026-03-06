package api

// Admin API handlers for service-to-service and agent automation.
// Auth: API key via X-API-Key header (see middleware/apikey.go)
//
// Pattern:
//   - Mirror frontend handlers but with API key auth
//   - All CRUD operations must be available
//   - Enforce same business rules as frontend API
//   - Include audit logging for state changes
//
// Example:
//   func (h *Handler) AdminListItems(w http.ResponseWriter, r *http.Request) {
//       // Same logic as ListItems, different auth middleware
//   }

// TODO: Implement admin endpoints for your app's resources
// See AGENTS.md "API Architecture" section for requirements
