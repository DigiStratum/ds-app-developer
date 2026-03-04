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

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List available components",
	Long:  `List all available components in the registry.`,
	Run:   runList,
}

func init() {
	rootCmd.AddCommand(listCmd)
}

func runList(cmd *cobra.Command, args []string) {
	cfg := config.Get()
	client := api.NewClient(cfg.APIURL, cfg.AuthToken, cfg.Verbose)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	components, err := client.ListComponents(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	if len(components) == 0 {
		fmt.Println("No components found.")
		return
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "NAME\tVERSION\tDESCRIPTION\tAUTHOR")
	for _, c := range components {
		version := c.LatestVersion
		if version == "" {
			version = "-"
		}
		desc := c.Description
		if len(desc) > 50 {
			desc = desc[:47] + "..."
		}
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", c.Name, version, desc, c.Author)
	}
	w.Flush()
}
