package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/DigiStratum/ds-app-developer/cmd/ds-components/internal/config"
)

var (
	cfgFile   string
	apiURL    string
	authToken string
	verbose   bool
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "ds-components",
	Short: "Manage DS Component Registry",
	Long: `ds-components is a CLI tool for managing components in the DS Component Registry.

Consumer commands:
  list     List available components
  pull     Download a specific component version
  sync     Sync local components with registry
  update   Update components to latest versions

Producer commands:
  register Register a new component
  push     Publish a new version of a component
  versions List versions of a component`,
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	cobra.OnInitialize(initConfig)

	// Global flags
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.ds-components.yaml)")
	rootCmd.PersistentFlags().StringVar(&apiURL, "api-url", "", "API URL (default: https://developer.digistratum.com)")
	rootCmd.PersistentFlags().StringVar(&authToken, "token", "", "Authentication token (or set DS_COMPONENTS_TOKEN env var)")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "verbose output")
}

// initConfig reads in config file and ENV variables if set.
func initConfig() {
	cfg := config.Get()

	// Override with flags if provided
	if apiURL != "" {
		cfg.APIURL = apiURL
	}
	if authToken != "" {
		cfg.AuthToken = authToken
	}
	cfg.Verbose = verbose

	// Ensure API URL is set
	if cfg.APIURL == "" {
		cfg.APIURL = "https://developer.digistratum.com"
	}

	// Try to load token from environment if not set
	if cfg.AuthToken == "" {
		cfg.AuthToken = os.Getenv("DS_COMPONENTS_TOKEN")
	}
}

// requireAuth checks if auth token is available and exits with error if not
func requireAuth() {
	cfg := config.Get()
	if cfg.AuthToken == "" {
		fmt.Fprintln(os.Stderr, "Error: Authentication required. Set DS_COMPONENTS_TOKEN or use --token flag")
		os.Exit(1)
	}
}
