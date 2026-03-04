package cmd

import (
	"context"
	"encoding/json"
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
	pushDir string
)

var pushCmd = &cobra.Command{
	Use:   "push <name> <version>",
	Short: "Publish a new version of a component",
	Long: `Publish a new version of a component to the registry.

This command packages the component directory as a tar.gz archive,
uploads it to the registry, and creates a new version entry.

The component must already be registered using 'ds-components register'.

Examples:
  ds-components push my-component 1.0.0
  ds-components push my-component 1.0.0 --dir ./my-component
  ds-components push @myorg/component 2.0.0-beta.1`,
	Args: cobra.ExactArgs(2),
	Run:  runPush,
}

func init() {
	pushCmd.Flags().StringVar(&pushDir, "dir", ".", "Directory to package (default: current directory)")
	rootCmd.AddCommand(pushCmd)
}

// ComponentManifest represents a component.json file in the component directory
type ComponentManifest struct {
	Name             string            `json:"name"`
	Version          string            `json:"version"`
	Description      string            `json:"description"`
	Dependencies     map[string]string `json:"dependencies,omitempty"`
	PeerDependencies map[string]string `json:"peer_dependencies,omitempty"`
}

func runPush(cmd *cobra.Command, args []string) {
	requireAuth()

	cfg := config.Get()
	client := api.NewClient(cfg.APIURL, cfg.AuthToken, cfg.Verbose)

	name := args[0]
	version := args[1]

	// Validate directory exists
	if _, err := os.Stat(pushDir); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "Error: Directory %s does not exist\n", pushDir)
		os.Exit(1)
	}

	// Try to read component.json for dependencies
	var dependencies, peerDeps map[string]string
	manifestPath := filepath.Join(pushDir, "component.json")
	if manifestData, err := os.ReadFile(manifestPath); err == nil {
		var manifest ComponentManifest
		if err := json.Unmarshal(manifestData, &manifest); err == nil {
			dependencies = manifest.Dependencies
			peerDeps = manifest.PeerDependencies
		}
	}

	fmt.Printf("Packaging %s@%s from %s...\n", name, version, pushDir)

	// Create archive
	archiveData, _, err := archive.Create(pushDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating archive: %v\n", err)
		os.Exit(1)
	}

	// Calculate checksum
	checksum := api.CalculateChecksum(archiveData)

	fmt.Printf("  Archive size: %d bytes\n", len(archiveData))
	fmt.Printf("  Checksum: %s\n", checksum[:16]+"...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// Publish version (get upload URL)
	publishReq := &api.PublishRequest{
		Size:             int64(len(archiveData)),
		Checksum:         checksum,
		Dependencies:     dependencies,
		PeerDependencies: peerDeps,
	}

	publishResp, err := client.Publish(ctx, name, version, publishReq)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	// Upload artifact
	fmt.Println("Uploading artifact...")
	if err := client.UploadArtifact(ctx, publishResp.UploadURL, archiveData); err != nil {
		fmt.Fprintf(os.Stderr, "Error uploading artifact: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✓ Published %s@%s\n", name, version)
	fmt.Printf("  Size: %d bytes\n", publishResp.Version.Size)
	fmt.Printf("  Checksum: %s\n", checksum[:16]+"...")
}
