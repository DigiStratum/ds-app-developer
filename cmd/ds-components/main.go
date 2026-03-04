// Package main provides the ds-components CLI tool for managing
// components in the DS Component Registry.
//
// Consumer commands:
//   - list: List available components
//   - pull: Download a specific component version
//   - sync: Sync local components with registry
//   - update: Update components to latest versions
//
// Producer commands:
//   - register: Register a new component
//   - push: Publish a new version of a component
//   - versions: List versions of a component
package main

import (
	"os"

	"github.com/DigiStratum/ds-app-developer/cmd/ds-components/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
