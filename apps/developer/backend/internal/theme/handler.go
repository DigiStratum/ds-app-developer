// Package theme provides tenant-specific theming configuration.
// [FR-THEME-004, FR-THEME-005]
package theme

import (
	"encoding/json"
	"net/http"

	"github.com/DigiStratum/ds-app-skeleton/backend/internal/middleware"
	"github.com/DigiStratum/ds-app-skeleton/backend/internal/session"
)

// ThemeConfig represents the theme configuration returned to clients.
// This structure allows tenant-specific branding and CSS customization.
type ThemeConfig struct {
	// CSSVars contains CSS custom property overrides
	// e.g., {"--ds-primary": "#ff6600", "--ds-accent": "#00cc66"}
	CSSVars map[string]string `json:"cssVars,omitempty"`

	// LogoURL is the URL for a custom logo (null = use default)
	LogoURL *string `json:"logoUrl,omitempty"`

	// LogoAlt is alt text for the logo
	LogoAlt string `json:"logoAlt,omitempty"`

	// FaviconURL is the URL for a custom favicon
	FaviconURL *string `json:"faviconUrl,omitempty"`
}

// Handler returns the theme configuration for the current session's tenant.
// If no custom theme is configured, returns an empty config (defaults apply).
//
// GET /api/theme
//
// Response: ThemeConfig JSON
// - 200: Theme config (may be empty for default theme)
// - 500: Internal error
func Handler(w http.ResponseWriter, r *http.Request) {
	logger := middleware.LoggerWithCorrelation(r.Context())

	// Get tenant from session (if available)
	sess := session.GetSession(r.Context())
	tenantID := ""
	if sess != nil {
		tenantID = sess.TenantID
	}

	logger.Debug("theme requested", "tenant_id", tenantID)

	// TODO: Look up tenant theme from DynamoDB
	// For now, return empty config (frontend will use CSS defaults)
	//
	// Future implementation:
	// 1. Query DynamoDB themes table by tenant_id
	// 2. Check for user-level overrides (if authenticated)
	// 3. Merge tenant + user configs
	// 4. Cache result with TTL
	config := getThemeForTenant(tenantID)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "private, max-age=300") // Cache for 5 min
	_ = json.NewEncoder(w).Encode(config)
}

// getThemeForTenant retrieves the theme configuration for a tenant.
// Currently returns default empty config; will be replaced with DynamoDB lookup.
func getThemeForTenant(tenantID string) ThemeConfig {
	// Placeholder for future DynamoDB integration:
	//
	// type ThemeRecord struct {
	//     TenantID   string            `dynamodbav:"tenant_id"`
	//     CSSVars    map[string]string `dynamodbav:"css_vars"`
	//     LogoURL    string            `dynamodbav:"logo_url"`
	//     FaviconURL string            `dynamodbav:"favicon_url"`
	//     UpdatedAt  time.Time         `dynamodbav:"updated_at"`
	// }
	//
	// Example query:
	// result, err := db.GetItem(&dynamodb.GetItemInput{
	//     TableName: aws.String("ds-themes"),
	//     Key: map[string]*dynamodb.AttributeValue{
	//         "tenant_id": {S: aws.String(tenantID)},
	//     },
	// })

	_ = tenantID // Unused for now

	// Return empty config - frontend CSS defaults will apply
	return ThemeConfig{}
}
