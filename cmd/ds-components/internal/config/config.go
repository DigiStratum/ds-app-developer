// Package config provides configuration management for the ds-components CLI.
package config

import (
	"os"
	"path/filepath"
	"sync"

	"gopkg.in/yaml.v3"
)

// Config holds the CLI configuration.
type Config struct {
	// APIURL is the base URL for the component registry API
	APIURL string `yaml:"api_url"`

	// AuthToken is the authentication token for producer commands
	AuthToken string `yaml:"auth_token"`

	// ComponentsDir is where components are synced locally
	ComponentsDir string `yaml:"components_dir"`

	// Verbose enables verbose output
	Verbose bool `yaml:"-"`
}

var (
	cfg     *Config
	cfgOnce sync.Once
)

// Get returns the global config instance.
func Get() *Config {
	cfgOnce.Do(func() {
		cfg = &Config{
			APIURL:        getEnvOrDefault("DS_COMPONENTS_API_URL", "https://developer.digistratum.com"),
			AuthToken:     os.Getenv("DS_COMPONENTS_TOKEN"),
			ComponentsDir: getEnvOrDefault("DS_COMPONENTS_DIR", defaultComponentsDir()),
		}
		// Try to load from config file
		_ = cfg.loadFromFile()
	})
	return cfg
}

// loadFromFile attempts to load config from the default config file.
func (c *Config) loadFromFile() error {
	configPath := defaultConfigPath()
	data, err := os.ReadFile(configPath)
	if err != nil {
		return err
	}
	return yaml.Unmarshal(data, c)
}

// Save writes the current config to the default config file.
func (c *Config) Save() error {
	configPath := defaultConfigPath()
	
	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(configPath), 0755); err != nil {
		return err
	}

	data, err := yaml.Marshal(c)
	if err != nil {
		return err
	}

	return os.WriteFile(configPath, data, 0600)
}

func defaultConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ".ds-components.yaml"
	}
	return filepath.Join(home, ".ds-components.yaml")
}

func defaultComponentsDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ".ds-components"
	}
	return filepath.Join(home, ".ds-components", "packages")
}

func getEnvOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
