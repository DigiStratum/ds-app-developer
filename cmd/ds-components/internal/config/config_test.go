package config

import (
	"os"
	"path/filepath"
	"sync"
	"testing"

	"gopkg.in/yaml.v3"
)

// Tests default config values
func TestGet_Defaults(t *testing.T) {
	// Clear singleton for test
	cfg = nil
	cfgOnce = sync.Once{}

	// Clear env vars
	os.Unsetenv("DS_COMPONENTS_API_URL")
	os.Unsetenv("DS_COMPONENTS_TOKEN")
	os.Unsetenv("DS_COMPONENTS_DIR")

	config := Get()

	if config.APIURL != "https://developer.digistratum.com" {
		t.Errorf("expected default API URL, got %s", config.APIURL)
	}
	if config.AuthToken != "" {
		t.Errorf("expected empty auth token, got %s", config.AuthToken)
	}
}

// Tests config from environment variables
func TestGet_FromEnv(t *testing.T) {
	// Clear singleton for test
	cfg = nil
	cfgOnce = sync.Once{}

	// Set env vars
	os.Setenv("DS_COMPONENTS_API_URL", "https://test.example.com")
	os.Setenv("DS_COMPONENTS_TOKEN", "test-token-123")
	defer os.Unsetenv("DS_COMPONENTS_API_URL")
	defer os.Unsetenv("DS_COMPONENTS_TOKEN")

	config := Get()

	if config.APIURL != "https://test.example.com" {
		t.Errorf("expected env API URL, got %s", config.APIURL)
	}
	if config.AuthToken != "test-token-123" {
		t.Errorf("expected env auth token, got %s", config.AuthToken)
	}
}

// Tests saving and loading config from file
func TestConfig_SaveAndLoad(t *testing.T) {
	// Create temp directory
	tmpDir, err := os.MkdirTemp("", "config-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create a config and save it
	config := &Config{
		APIURL:        "https://custom.example.com",
		AuthToken:     "my-token",
		ComponentsDir: filepath.Join(tmpDir, "components"),
	}

	// Write to temp file
	configPath := filepath.Join(tmpDir, ".ds-components.yaml")
	data, err := yaml.Marshal(config)
	if err != nil {
		t.Fatalf("failed to marshal config: %v", err)
	}
	if err := os.WriteFile(configPath, data, 0600); err != nil {
		t.Fatalf("failed to write config: %v", err)
	}

	// Load it back
	loaded := &Config{}
	loadedData, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("failed to read config: %v", err)
	}
	if err := yaml.Unmarshal(loadedData, loaded); err != nil {
		t.Fatalf("failed to unmarshal config: %v", err)
	}

	if loaded.APIURL != config.APIURL {
		t.Errorf("expected API URL %s, got %s", config.APIURL, loaded.APIURL)
	}
	if loaded.AuthToken != config.AuthToken {
		t.Errorf("expected auth token %s, got %s", config.AuthToken, loaded.AuthToken)
	}
}

// Tests getEnvOrDefault helper
func TestGetEnvOrDefault(t *testing.T) {
	tests := []struct {
		name       string
		key        string
		setVal     string
		defaultVal string
		expected   string
	}{
		{"env set", "TEST_VAR_SET", "custom", "default", "custom"},
		{"env not set", "TEST_VAR_NOTSET", "", "default", "default"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Unsetenv(tt.key)
			if tt.setVal != "" {
				os.Setenv(tt.key, tt.setVal)
				defer os.Unsetenv(tt.key)
			}

			result := getEnvOrDefault(tt.key, tt.defaultVal)
			if result != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, result)
			}
		})
	}
}
