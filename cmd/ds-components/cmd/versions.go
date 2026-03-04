package cmd

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"
	"time"

	"github.com/spf13/cobra"
	"github.com/DigiStratum/ds-app-developer/cmd/ds-components/internal/api"
	"github.com/DigiStratum/ds-app-developer/cmd/ds-components/internal/config"
)

var versionsCmd = &cobra.Command{
	Use:   "versions <component>",
	Short: "List versions of a component",
	Long: `List all published versions of a component.

Examples:
  ds-components versions my-component
  ds-components versions @myorg/component`,
	Args: cobra.ExactArgs(1),
	Run:  runVersions,
}

func init() {
	rootCmd.AddCommand(versionsCmd)
}

func runVersions(cmd *cobra.Command, args []string) {
	cfg := config.Get()
	client := api.NewClient(cfg.APIURL, cfg.AuthToken, cfg.Verbose)

	name := args[0]

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	result, err := client.GetComponent(ctx, name)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	if result.Component == nil {
		fmt.Fprintf(os.Stderr, "Error: Component %s not found\n", name)
		os.Exit(1)
	}

	fmt.Printf("Component: %s\n", result.Component.Name)
	fmt.Printf("Description: %s\n", result.Component.Description)
	if result.Component.LatestVersion != "" {
		fmt.Printf("Latest: %s\n", result.Component.LatestVersion)
	}
	fmt.Println()

	if len(result.Versions) == 0 {
		fmt.Println("No versions published.")
		return
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "VERSION\tPUBLISHED\tSIZE\tSTATUS")
	for _, v := range result.Versions {
		status := "active"
		if v.Deprecated {
			status = "deprecated"
		}
		published := v.PublishedAt.Format("2006-01-02 15:04")
		size := formatSize(v.Size)
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", v.Version, published, size, status)
	}
	w.Flush()
}

func formatSize(bytes int64) string {
	const (
		KB = 1024
		MB = KB * 1024
	)
	switch {
	case bytes >= MB:
		return fmt.Sprintf("%.1f MB", float64(bytes)/MB)
	case bytes >= KB:
		return fmt.Sprintf("%.1f KB", float64(bytes)/KB)
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}
