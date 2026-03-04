package cmd

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"
	"github.com/DigiStratum/ds-app-developer/cmd/ds-components/internal/api"
	"github.com/DigiStratum/ds-app-developer/cmd/ds-components/internal/archive"
	"github.com/DigiStratum/ds-app-developer/cmd/ds-components/internal/config"
)

var (
	pullOutput string
)

var pullCmd = &cobra.Command{
	Use:   "pull <component> [version]",
	Short: "Download a component",
	Long: `Download a specific component version from the registry.

If no version is specified, the latest version is downloaded.

Examples:
  ds-components pull my-component
  ds-components pull my-component 1.0.0
  ds-components pull my-component --output ./components`,
	Args: cobra.RangeArgs(1, 2),
	Run:  runPull,
}

func init() {
	pullCmd.Flags().StringVarP(&pullOutput, "output", "o", "", "Output directory (default: current directory)")
	rootCmd.AddCommand(pullCmd)
}

func runPull(cmd *cobra.Command, args []string) {
	cfg := config.Get()
	client := api.NewClient(cfg.APIURL, cfg.AuthToken, cfg.Verbose)

	componentName := args[0]
	var version string

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// If version not specified, get latest
	if len(args) < 2 {
		comp, err := client.GetComponent(ctx, componentName)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}
		if comp.Component.LatestVersion == "" {
			fmt.Fprintf(os.Stderr, "Error: No versions available for %s\n", componentName)
			os.Exit(1)
		}
		version = comp.Component.LatestVersion
	} else {
		version = args[1]
	}

	fmt.Printf("Downloading %s@%s...\n", componentName, version)

	// Get download URL
	downloadResp, err := client.GetVersion(ctx, componentName, version)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	// Download artifact
	data, err := client.DownloadArtifact(ctx, downloadResp.DownloadURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error downloading artifact: %v\n", err)
		os.Exit(1)
	}

	// Verify checksum
	checksum := api.CalculateChecksum(data)
	if checksum != downloadResp.Version.Checksum {
		fmt.Fprintf(os.Stderr, "Error: Checksum mismatch (expected %s, got %s)\n", 
			downloadResp.Version.Checksum, checksum)
		os.Exit(1)
	}

	// Determine output directory
	outputDir := pullOutput
	if outputDir == "" {
		outputDir = "."
	}
	componentDir := filepath.Join(outputDir, componentName)

	// Extract archive
	if err := os.MkdirAll(componentDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Error creating directory: %v\n", err)
		os.Exit(1)
	}

	if err := archive.ExtractReader(bytes.NewReader(data), componentDir); err != nil {
		fmt.Fprintf(os.Stderr, "Error extracting archive: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✓ Downloaded %s@%s to %s\n", componentName, version, componentDir)
}
