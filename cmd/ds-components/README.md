# ds-components CLI

Command-line tool for managing components in the DS Component Registry.

## Installation

```bash
# Build from source
cd cmd/ds-components
go build -o ds-components .

# Or install globally
go install github.com/DigiStratum/ds-app-developer/cmd/ds-components@latest
```

## Configuration

The CLI can be configured via:

1. **Environment variables** (recommended for CI/CD):
   - `DS_COMPONENTS_API_URL` - API endpoint (default: https://developer.digistratum.com)
   - `DS_COMPONENTS_TOKEN` - Authentication token for producer commands
   - `DS_COMPONENTS_DIR` - Local components directory

2. **Config file** (`~/.ds-components.yaml`):
   ```yaml
   api_url: https://developer.digistratum.com
   auth_token: your-token-here
   components_dir: ~/.ds-components/packages
   ```

3. **Command-line flags**:
   ```bash
   ds-components --api-url https://... --token xxx list
   ```

## Consumer Commands

### list

List all available components in the registry:

```bash
ds-components list
```

### pull

Download a specific component version:

```bash
# Pull latest version
ds-components pull my-component

# Pull specific version
ds-components pull my-component 1.0.0

# Pull to specific directory
ds-components pull my-component --output ./components
```

### sync

Sync local components based on a manifest file (`ds-components.json`):

```bash
ds-components sync
ds-components sync --dry-run
```

Manifest format:
```json
{
  "components": {
    "my-component": "^1.0.0",
    "another-component": "2.3.4"
  },
  "output": "./ds-components"
}
```

### update

Update components to their latest versions:

```bash
# Update all components
ds-components update

# Update specific component
ds-components update my-component

# Dry run
ds-components update --dry-run
```

## Producer Commands

> Producer commands require authentication. Set `DS_COMPONENTS_TOKEN` or use `--token` flag.

### register

Register a new component in the registry:

```bash
ds-components register my-component --description "A useful component"

# With all options
ds-components register @myorg/component \
  --description "Scoped component" \
  --license MIT \
  --repository https://github.com/myorg/component \
  --keywords ui,react,component
```

### push

Publish a new version of a component:

```bash
# Push from current directory
ds-components push my-component 1.0.0

# Push from specific directory
ds-components push my-component 1.0.0 --dir ./my-component

# Prerelease version
ds-components push my-component 2.0.0-beta.1
```

The `push` command:
1. Creates a tar.gz archive of the component directory
2. Calculates SHA256 checksum
3. Registers the version with the registry
4. Uploads the artifact to S3

### versions

List all versions of a component:

```bash
ds-components versions my-component
```

## Component Directory Structure

When pushing a component, include a `component.json` file:

```json
{
  "name": "my-component",
  "version": "1.0.0",
  "description": "My awesome component",
  "dependencies": {
    "other-component": "^1.0.0"
  },
  "peer_dependencies": {
    "react": "^18.0.0"
  }
}
```

## Lock File

The `sync` and `update` commands maintain a `ds-components.lock` file:

```json
{
  "components": [
    {
      "name": "my-component",
      "version": "1.0.0",
      "checksum": "abc123..."
    }
  ],
  "updated_at": "2024-01-15T10:30:00Z"
}
```

## Examples

### CI/CD Integration

```bash
# Install dependencies in CI
export DS_COMPONENTS_TOKEN=${{ secrets.DS_COMPONENTS_TOKEN }}
ds-components sync
```

### Publishing a Release

```bash
export DS_COMPONENTS_TOKEN=$MY_TOKEN

# First time: register the component
ds-components register my-component --description "My component"

# Publish version
ds-components push my-component 1.0.0 --dir ./dist
```

## Exit Codes

- `0` - Success
- `1` - Error (check stderr for details)

## Verbose Mode

Use `-v` or `--verbose` for detailed output:

```bash
ds-components -v sync
```
