// Package theme tests for tenant-specific theming.
// Tests FR-THEME-004, FR-THEME-005
package theme

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// Tests FR-THEME-004: Theme endpoint returns theme configuration
func TestHandler_ReturnsThemeConfig(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/theme", nil)
	rec := httptest.NewRecorder()

	Handler(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	// Should return JSON
	contentType := rec.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", contentType)
	}

	// Should be valid JSON that parses to ThemeConfig
	var config ThemeConfig
	if err := json.NewDecoder(rec.Body).Decode(&config); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
}

// Tests FR-THEME-005: Theme response is cacheable
func TestHandler_SetsCacheHeaders(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/theme", nil)
	rec := httptest.NewRecorder()

	Handler(rec, req)

	cacheControl := rec.Header().Get("Cache-Control")
	if cacheControl == "" {
		t.Error("expected Cache-Control header to be set")
	}
	// Should be private (tenant-specific) with reasonable max-age
	if cacheControl != "private, max-age=300" {
		t.Errorf("unexpected Cache-Control: %q", cacheControl)
	}
}

func TestHandler_ReturnsEmptyConfigByDefault(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/theme", nil)
	rec := httptest.NewRecorder()

	Handler(rec, req)

	var config ThemeConfig
	if err := json.NewDecoder(rec.Body).Decode(&config); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Default should have empty/nil values
	if len(config.CSSVars) > 0 {
		t.Error("expected empty CSSVars by default")
	}
	if config.LogoURL != nil {
		t.Error("expected nil LogoURL by default")
	}
	if config.FaviconURL != nil {
		t.Error("expected nil FaviconURL by default")
	}
}

func TestGetThemeForTenant_ReturnsEmptyConfig(t *testing.T) {
	tests := []struct {
		name     string
		tenantID string
	}{
		{"empty tenant", ""},
		{"specific tenant", "tenant-123"},
		{"different tenant", "tenant-456"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := getThemeForTenant(tt.tenantID)

			// Currently returns empty config for all tenants
			// This will change when DynamoDB integration is added
			if len(config.CSSVars) > 0 {
				t.Error("expected empty CSSVars")
			}
		})
	}
}

// Test ThemeConfig structure
func TestThemeConfig_JSONSerialization(t *testing.T) {
	logoURL := "https://example.com/logo.png"
	faviconURL := "https://example.com/favicon.ico"

	config := ThemeConfig{
		CSSVars: map[string]string{
			"--ds-primary": "#ff6600",
			"--ds-accent":  "#00cc66",
		},
		LogoURL:    &logoURL,
		LogoAlt:    "Custom Logo",
		FaviconURL: &faviconURL,
	}

	// Marshal to JSON
	data, err := json.Marshal(config)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	// Unmarshal back
	var decoded ThemeConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if len(decoded.CSSVars) != 2 {
		t.Errorf("expected 2 CSS vars, got %d", len(decoded.CSSVars))
	}
	if decoded.CSSVars["--ds-primary"] != "#ff6600" {
		t.Error("expected --ds-primary to be preserved")
	}
	if decoded.LogoURL == nil || *decoded.LogoURL != logoURL {
		t.Error("expected logoUrl to be preserved")
	}
	if decoded.LogoAlt != "Custom Logo" {
		t.Error("expected logoAlt to be preserved")
	}
}

func TestThemeConfig_OmitsEmptyFields(t *testing.T) {
	config := ThemeConfig{
		LogoAlt: "Just Alt",
		// All other fields empty/nil
	}

	data, err := json.Marshal(config)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	// Should not include omitempty fields when nil/empty
	var decoded map[string]interface{}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	// cssVars should be omitted when nil (omitempty)
	if _, ok := decoded["cssVars"]; ok {
		t.Error("expected cssVars to be omitted when nil")
	}

	// logoUrl should be omitted when nil (omitempty)
	if _, ok := decoded["logoUrl"]; ok {
		t.Error("expected logoUrl to be omitted when nil")
	}
}
