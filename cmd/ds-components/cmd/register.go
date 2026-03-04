package cmd

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/spf13/cobra"
	"github.com/DigiStratum/ds-app-developer/cmd/ds-components/internal/api"
	"github.com/DigiStratum/ds-app-developer/cmd/ds-components/internal/config"
)

var (
	registerDesc       string
	registerRepo       string
	registerLicense    string
	registerKeywords   []string
)

var registerCmd = &cobra.Command{
	Use:   "register <name>",
	Short: "Register a new component",
	Long: `Register a new component in the registry.

This creates a new component entry in the registry. After registration,
you can publish versions using the 'push' command.

Examples:
  ds-components register my-component --description "A useful component"
  ds-components register @myorg/component --description "Scoped component" --license MIT`,
	Args: cobra.ExactArgs(1),
	Run:  runRegister,
}

func init() {
	registerCmd.Flags().StringVarP(&registerDesc, "description", "d", "", "Component description (required)")
	registerCmd.Flags().StringVarP(&registerRepo, "repository", "r", "", "Source repository URL")
	registerCmd.Flags().StringVarP(&registerLicense, "license", "l", "", "SPDX license identifier (e.g., MIT, Apache-2.0)")
	registerCmd.Flags().StringSliceVarP(&registerKeywords, "keywords", "k", nil, "Keywords for searchability")
	_ = registerCmd.MarkFlagRequired("description")
	rootCmd.AddCommand(registerCmd)
}

func runRegister(cmd *cobra.Command, args []string) {
	requireAuth()

	cfg := config.Get()
	client := api.NewClient(cfg.APIURL, cfg.AuthToken, cfg.Verbose)

	name := args[0]

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req := &api.RegisterRequest{
		Name:        name,
		Description: registerDesc,
		Repository:  registerRepo,
		License:     registerLicense,
		Keywords:    registerKeywords,
	}

	component, err := client.Register(ctx, req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✓ Registered component: %s\n", component.Name)
	fmt.Printf("  Description: %s\n", component.Description)
	if component.Repository != "" {
		fmt.Printf("  Repository: %s\n", component.Repository)
	}
	if component.License != "" {
		fmt.Printf("  License: %s\n", component.License)
	}
	fmt.Println("\nNext step: Publish a version with 'ds-components push'")
}
