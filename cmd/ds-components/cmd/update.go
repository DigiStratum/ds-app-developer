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

var (
	updateDry bool
	updateAll bool
)

var updateCmd = &cobra.Command{
	Use:   "update [component...]",
	Short: "Update components to latest versions",
	Long: `Update one or more components to their latest versions.

Without arguments, updates all components in ds-components.json.

Examples:
  ds-components update              # Update all components
  ds-components update my-component # Update specific component
  ds-components update --dry-run    # Show what would be updated`,
	Run: runUpdate,
}

func init() {
	updateCmd.Flags().BoolVar(&updateDry, "dry-run", false, "Show what would be updated without downloading")
	updateCmd.Flags().BoolVar(&updateAll, "all", false, "Update all components (default behavior)")
	rootCmd.AddCommand(updateCmd)
}

func runUpdate(cmd *cobra.Command, args []string) {
	cfg := config.Get()
	client := api.NewClient(cfg.APIURL, cfg.AuthToken, cfg.Verbose)

	// Read manifest
	manifestPath := "ds-components.json"
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: Could not read %s: %v\n", manifestPath, err)
		os.Exit(1)
	}

	var manifest Manifest
	if err := json.Unmarshal(manifestData, &manifest); err != nil {
		fmt.Fprintf(os.Stderr, "Error: Invalid manifest: %v\n", err)
		os.Exit(1)
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

	// Determine which components to update
	toUpdate := make(map[string]bool)
	if len(args) == 0 {
		// Update all
		for name := range manifest.Components {
			toUpdate[name] = true
		}
	} else {
		for _, name := range args {
			if _, ok := manifest.Components[name]; !ok {
				fmt.Fprintf(os.Stderr, "Warning: %s not in manifest, skipping\n", name)
				continue
			}
			toUpdate[name] = true
		}
	}

	if len(toUpdate) == 0 {
		fmt.Println("No components to update.")
		return
	}

	outputDir := manifest.Output
	if outputDir == "" {
		outputDir = "./ds-components"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	var newLock LockFile
	updated := 0

	for name := range manifest.Components {
		locked, hasLock := lockMap[name]

		if !toUpdate[name] {
			// Keep existing lock
			if hasLock {
				newLock.Components = append(newLock.Components, locked)
			}
			continue
		}

		// Get latest version
		comp, err := client.GetComponent(ctx, name)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting %s: %v\n", name, err)
			os.Exit(1)
		}

		latestVersion := comp.Component.LatestVersion
		if latestVersion == "" {
			fmt.Fprintf(os.Stderr, "Warning: No versions for %s\n", name)
			continue
		}

		// Check if already at latest
		if hasLock && locked.Version == latestVersion {
			fmt.Printf("⏭  %s@%s (already latest)\n", name, latestVersion)
			newLock.Components = append(newLock.Components, locked)
			continue
		}

		if updateDry {
			if hasLock {
				fmt.Printf("Would update: %s %s → %s\n", name, locked.Version, latestVersion)
			} else {
				fmt.Printf("Would install: %s@%s\n", name, latestVersion)
			}
			continue
		}

		if hasLock {
			fmt.Printf("Updating %s %s → %s...\n", name, locked.Version, latestVersion)
		} else {
			fmt.Printf("Installing %s@%s...\n", name, latestVersion)
		}

		// Get download URL
		downloadResp, err := client.GetVersion(ctx, name, latestVersion)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting %s@%s: %v\n", name, latestVersion, err)
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
			Version:  latestVersion,
			Checksum: checksum,
		})

		fmt.Printf("✓ %s@%s\n", name, latestVersion)
		updated++
	}

	if !updateDry {
		// Write lock file
		newLock.UpdatedAt = time.Now()
		lockData, _ := json.MarshalIndent(newLock, "", "  ")
		if err := os.WriteFile(lockPath, lockData, 0644); err != nil {
			fmt.Fprintf(os.Stderr, "Warning: Could not write lock file: %v\n", err)
		}

		fmt.Printf("\nUpdated %d components\n", updated)
	}
}
