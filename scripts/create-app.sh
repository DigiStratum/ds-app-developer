#!/bin/bash
# create-app.sh - Create a new DS app from boilerplate
#
# Usage: ./scripts/create-app.sh <app-name> <domain> [destination-path]
#
# Example:
#   ./scripts/create-app.sh ds-crm crm.digistratum.com ~/repos/digistratum/ds-crm
#
# This script:
#   1. Copies the boilerplate/ folder to the destination
#   2. Replaces placeholders ({{APP_NAME}}, {{DOMAIN}}, etc.)
#   3. Initializes git if not already in a repo
#   4. Provides next steps

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory (ds-app-developer root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
BOILERPLATE_DIR="$REPO_ROOT/boilerplate"

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo ""
    echo "Usage: $0 <app-name> <domain> [destination-path]"
    echo ""
    echo "Arguments:"
    echo "  app-name         Name of the new app (e.g., ds-crm, ds-kanban)"
    echo "  domain           Domain for the app (e.g., crm.digistratum.com)"
    echo "  destination-path Optional. Default: ~/repos/digistratum/<app-name>"
    echo ""
    echo "Example:"
    echo "  $0 ds-crm crm.digistratum.com"
    echo "  $0 ds-crm crm.digistratum.com /path/to/ds-crm"
    exit 1
fi

APP_NAME="$1"
DOMAIN="$2"
DEST_PATH="${3:-$HOME/repos/digistratum/$APP_NAME}"

# Validate app name (alphanumeric and hyphens only)
if [[ ! "$APP_NAME" =~ ^[a-z0-9-]+$ ]]; then
    echo -e "${RED}Error: App name must be lowercase alphanumeric with hyphens only${NC}"
    exit 1
fi

# Check if boilerplate exists
if [ ! -d "$BOILERPLATE_DIR" ]; then
    echo -e "${RED}Error: Boilerplate directory not found at $BOILERPLATE_DIR${NC}"
    exit 1
fi

# Check if destination already exists
if [ -d "$DEST_PATH" ]; then
    echo -e "${YELLOW}Warning: Destination already exists: $DEST_PATH${NC}"
    read -p "Do you want to overwrite? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    rm -rf "$DEST_PATH"
fi

echo -e "${GREEN}Creating new app: $APP_NAME${NC}"
echo "  Domain: $DOMAIN"
echo "  Path: $DEST_PATH"
echo ""

# Create destination directory
mkdir -p "$DEST_PATH"

# Build and bundle DigiStratum packages
echo "Building DigiStratum packages..."
cd "$REPO_ROOT"

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "  Installing root dependencies..."
    npm install --silent
fi

# Build ds-core first (layout depends on it)
echo "  Building @digistratum/ds-core..."
cd "$REPO_ROOT/packages/ds-core"
npm run build --silent 2>/dev/null || npm run build

# Build layout
echo "  Building @digistratum/layout..."
cd "$REPO_ROOT/packages/layout"
npm run build --silent 2>/dev/null || npm run build

cd "$REPO_ROOT"

# Copy boilerplate
echo "Copying boilerplate..."
cp -r "$BOILERPLATE_DIR"/* "$DEST_PATH/"

# Create docs directory
mkdir -p "$DEST_PATH/docs"

# Create .ds-packages directory and copy built packages
echo "Bundling DigiStratum packages..."
mkdir -p "$DEST_PATH/frontend/.ds-packages"

# Copy ds-core package
cp -r "$REPO_ROOT/packages/ds-core" "$DEST_PATH/frontend/.ds-packages/ds-core"
rm -rf "$DEST_PATH/frontend/.ds-packages/ds-core/node_modules"
# Fix ds-core's internal file: dependency for standalone use
if [ -f "$DEST_PATH/frontend/.ds-packages/ds-core/package.json" ]; then
    # Remove file: dependencies that won't work standalone
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's|"file:[^"]*"|"*"|g' "$DEST_PATH/frontend/.ds-packages/ds-core/package.json"
    else
        sed -i 's|"file:[^"]*"|"*"|g' "$DEST_PATH/frontend/.ds-packages/ds-core/package.json"
    fi
fi

# Copy layout package
cp -r "$REPO_ROOT/packages/layout" "$DEST_PATH/frontend/.ds-packages/layout"
rm -rf "$DEST_PATH/frontend/.ds-packages/layout/node_modules"
# Update layout's ds-core reference to point to sibling
if [ -f "$DEST_PATH/frontend/.ds-packages/layout/package.json" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's|"@digistratum/ds-core": "file:[^"]*"|"@digistratum/ds-core": "file:../ds-core"|g' "$DEST_PATH/frontend/.ds-packages/layout/package.json"
    else
        sed -i 's|"@digistratum/ds-core": "file:[^"]*"|"@digistratum/ds-core": "file:../ds-core"|g' "$DEST_PATH/frontend/.ds-packages/layout/package.json"
    fi
fi

# Add .ds-packages to .gitignore if not already there
if [ -f "$DEST_PATH/frontend/.gitignore" ]; then
    if ! grep -q ".ds-packages" "$DEST_PATH/frontend/.gitignore"; then
        echo -e "\n# Bundled DigiStratum packages\n.ds-packages/" >> "$DEST_PATH/frontend/.gitignore"
    fi
else
    echo -e "# Bundled DigiStratum packages\n.ds-packages/" > "$DEST_PATH/frontend/.gitignore"
fi

# Replace placeholders in all files
echo "Replacing placeholders..."

APP_DESCRIPTION="Description for $APP_NAME. Update this with your app's purpose."

# Find all relevant files and replace placeholders
# Uses explicit sed calls to avoid bash associative array quirks with special characters
while read -r file; do
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|{{APP_NAME}}|$APP_NAME|g" "$file"
        sed -i '' "s|{{DOMAIN}}|$DOMAIN|g" "$file"
        sed -i '' "s|{{APP_DESCRIPTION}}|$APP_DESCRIPTION|g" "$file"
    else
        sed -i "s|{{APP_NAME}}|$APP_NAME|g" "$file"
        sed -i "s|{{DOMAIN}}|$DOMAIN|g" "$file"
        sed -i "s|{{APP_DESCRIPTION}}|$APP_DESCRIPTION|g" "$file"
    fi
done < <(find "$DEST_PATH" -type f \( -name "*.md" -o -name "*.go" -o -name "*.tsx" -o -name "*.ts" -o -name "*.json" -o -name "*.html" -o -name "*.css" \))

# Update go.mod module path
GO_MOD="$DEST_PATH/backend/go.mod"
if [ -f "$GO_MOD" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|module github.com/DigiStratum/{{APP_NAME}}/backend|module github.com/DigiStratum/$APP_NAME/backend|g" "$GO_MOD"
    else
        sed -i "s|module github.com/DigiStratum/{{APP_NAME}}/backend|module github.com/DigiStratum/$APP_NAME/backend|g" "$GO_MOD"
    fi
fi

# Initialize git if not in a repo
if [ ! -d "$DEST_PATH/.git" ]; then
    echo "Initializing git repository..."
    cd "$DEST_PATH"
    git init -q
    git add .
    git commit -q -m "Initial commit from ds-app-developer boilerplate"
fi

echo ""
echo -e "${GREEN}✓ App created successfully!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Navigate to your new app:"
echo "     cd $DEST_PATH"
echo ""
echo "  2. Set up the backend:"
echo "     cd backend"
echo "     go mod tidy"
echo "     go run ./cmd/api  # Starts on :8080"
echo ""
echo "  3. Set up the frontend:"
echo "     cd frontend"
echo "     npm install"
echo "     npm run dev  # Starts on :3000"
echo ""
echo "  4. Create GitHub repo and push:"
echo "     gh repo create DigiStratum/$APP_NAME --private"
echo "     git remote add origin https://github.com/DigiStratum/$APP_NAME.git"
echo "     git push -u origin main"
echo ""
echo "  5. Register app in DSAccount for SSO"
echo ""
echo "  6. Deploy infrastructure (CDK)"
echo ""
echo "For more details, see:"
echo "  https://github.com/DigiStratum/ds-app-developer#creating-new-apps"
