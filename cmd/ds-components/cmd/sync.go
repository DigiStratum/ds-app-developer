package cmd

import (
	"bytes"
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

// ComponentLock represents a locked component version
type ComponentLock struct {
	Name     string `json:"name"`
	Version  string `json:"version"`
	Checksum string `json:"checksum"`
}

// LockFile represents the ds-components.lock file
type LockFile struct {
	Components []ComponentLock `json:"components"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

var (
	syncDry bool
)

var syncCmd = &cobra.Command{
	Use:   "sync",
	Short: "Sync local components with registry",
	Long: `Sync local components based on a ds-components.json manifest file.

This command reads ds-components.json from the current directory and 
downloads/updates all listed components to the specified output directory.

Manifest format (ds-components.json):
{
  "components": {
    "my-component": "^1.0.0",
    "another-component": "2.3.4"
  },
  "output": "./components"
}

Use --dry-run to see what would be synced without downloading.`,
	Run: runSync,
}

func init() {
	syncCmd.Flags().BoolVar(&syncDry, "dry-run", false, "Show what would be synced without downloading")
	rootCmd.AddCommand(syncCmd)
}

// Manifest represents the ds-components.json file
type Manifest struct {
	Components map[string]string `json:"components"`
	Output     string            `json:"output"`
}

func runSync(cmd *cobra.Command, args []string) {
	cfg := config.Get()
	client := api.NewClient(cfg.APIURL, cfg.AuthToken, cfg.Verbose)

	// Read manifest
	manifestPath := "ds-components.json"
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: Could not read %s: %v\n", manifestPath, err)
		fmt.Fprintln(os.Stderr, "Create a ds-components.json file with your component dependencies.")
		os.Exit(1)
	}

	var manifest Manifest
	if err := json.Unmarshal(manifestData, &manifest); err != nil {
		fmt.Fprintf(os.Stderr, "Error: Invalid manifest: %v\n", err)
		os.Exit(1)
	}

	if len(manifest.Components) == 0 {
		fmt.Println("No components specified in manifest.")
		return
	}

	outputDir := manifest.Output
	if outputDir == "" {
		outputDir = "./ds-components"
	}

	// Read existing lock file
	lockPath := "ds-components.lock"
	var lock LockFile
	if lockData, err := os.ReadFile(lockPath); err == nil {
		_ = json.Unmarshal(lockData, &lock)
	}
	lockMap := make(map[string]ComponentLock)
	for _, c := range lock.Components {
		lockMap[c.Name] = c
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	var newLock LockFile
	synced := 0
	skipped := 0

	for name, versionSpec := range manifest.Components {
		// For now, we just use the version spec directly
		// Future: implement semver range resolution
		version := versionSpec

		// Check if version is a range (starts with ^, ~, etc)
		if version[0] == '^' || version[0] == '~' || version == "latest" {
			// Resolve to latest version
			comp, err := client.GetComponent(ctx, name)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error resolving %s: %v\n", name, err)
				os.Exit(1)
			}
			version = comp.Component.LatestVersion
		}

		// Check lock file
		if locked, ok := lockMap[name]; ok && locked.Version == version {
			// Check if already downloaded
			componentDir := filepath.Join(outputDir, name)
			if _, err := os.Stat(componentDir); err == nil {
				fmt.Printf("⏭  %s@%s (already synced)\n", name, version)
				newLock.Components = append(newLock.Components, locked)
				skipped++
				continue
			}
		}

		if syncDry {
			fmt.Printf("Would sync: %s@%s\n", name, version)
			continue
		}

		fmt.Printf("Syncing %s@%s...\n", name, version)

		// Get download URL
		downloadResp, err := client.GetVersion(ctx, name, version)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting %s@%s: %v\n", name, version, err)
			os.Exit(1)
		}

		// Download artifact
		data, err := client.DownloadArtifact(ctx, downloadResp.DownloadURL)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error downloading %s: %v\n", name, err)
			os.Exit(1)
		}

		// Verify checksum
		checksum := api.CalculateChecksum(data)
		if checksum != downloadResp.Version.Checksum {
			fmt.Fprintf(os.Stderr, "Error: Checksum mismatch for %s\n", name)
			os.Exit(1)
		}

		// Extract to output directory
		componentDir := filepath.Join(outputDir, name)
		_ = os.RemoveAll(componentDir) // Remove existing
		if err := os.MkdirAll(componentDir, 0755); err != nil {
			fmt.Fprintf(os.Stderr, "Error creating directory: %v\n", err)
			os.Exit(1)
		}

		if err := archive.ExtractReader(bytes.NewReader(data), componentDir); err != nil {
			fmt.Fprintf(os.Stderr, "Error extracting %s: %v\n", name, err)
			os.Exit(1)
		}

		newLock.Components = append(newLock.Components, ComponentLock{
			Name:     name,
			Version:  version,
			Checksum: checksum,
		})

		fmt.Printf("✓ %s@%s\n", name, version)
		synced++
	}

	if !syncDry {
		// Write lock file
		newLock.UpdatedAt = time.Now()
		lockData, _ := json.MarshalIndent(newLock, "", "  ")
		if err := os.WriteFile(lockPath, lockData, 0644); err != nil {
			fmt.Fprintf(os.Stderr, "Warning: Could not write lock file: %v\n", err)
		}

		fmt.Printf("\nSynced %d components, skipped %d\n", synced, skipped)
	}
}
