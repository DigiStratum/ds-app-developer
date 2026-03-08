#!/bin/bash
# update-app.sh - Update an existing app with latest boilerplate
#
# Usage: ./scripts/update-app.sh <target-repo-path>
#
# Example:
#   ./scripts/update-app.sh ~/repos/digistratum/lk-account
#
# This script updates:
#   - frontend/src/shell/      (wholesale replacement)
#   - frontend/src/boilerplate/ (wholesale replacement)
#   - backend/internal/         (selective update)
#   - .github/workflows/        (wholesale replacement)
#
# It preserves:
#   - frontend/src/app/         (app-specific code)
#   - frontend/src/main.tsx     (may have app customizations)
#   - backend/cmd/              (app entry points)
#   - cdk/                      (infrastructure config)
#   - Any app-specific configs

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
BOILERPLATE_DIR="$REPO_ROOT/boilerplate"

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing target repo path${NC}"
    echo ""
    echo "Usage: $0 <target-repo-path> [--dry-run]"
    echo ""
    echo "Example:"
    echo "  $0 ~/repos/digistratum/lk-account"
    echo "  $0 ~/repos/digistratum/lk-account --dry-run"
    exit 1
fi

TARGET_PATH=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $1${NC}"
            exit 1
            ;;
        *)
            if [ -z "$TARGET_PATH" ]; then
                TARGET_PATH="$1"
            fi
            shift
            ;;
    esac
done

# Expand path
TARGET_PATH="$(cd "$TARGET_PATH" 2>/dev/null && pwd)" || {
    echo -e "${RED}Error: Target path does not exist: $1${NC}"
    exit 1
}

# Validate target is a repo
if [ ! -d "$TARGET_PATH/.git" ]; then
    echo -e "${RED}Error: Target is not a git repository: $TARGET_PATH${NC}"
    exit 1
fi

if [ ! -d "$TARGET_PATH/frontend" ]; then
    echo -e "${RED}Error: Target has no frontend/ directory: $TARGET_PATH${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Updating: $TARGET_PATH ===${NC}"
echo "  Boilerplate source: $BOILERPLATE_DIR"
echo "  Dry run: $DRY_RUN"
echo ""

# Function to sync a directory
sync_dir() {
    local src="$1"
    local dest="$2"
    local desc="$3"
    
    if [ ! -d "$src" ]; then
        echo -e "${YELLOW}  Skip: $desc (source not found)${NC}"
        return
    fi
    
    echo -e "${BLUE}  Syncing: $desc${NC}"
    echo "    $src → $dest"
    
    if [ "$DRY_RUN" = true ]; then
        echo "    (dry-run, no changes)"
    else
        mkdir -p "$dest"
        rsync -a --delete --exclude='node_modules' "$src"/ "$dest"/
    fi
}

# Function to sync file
sync_file() {
    local src="$1"
    local dest="$2"
    local desc="$3"
    
    if [ ! -f "$src" ]; then
        echo -e "${YELLOW}  Skip: $desc (source not found)${NC}"
        return
    fi
    
    echo -e "${BLUE}  Syncing: $desc${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo "    (dry-run, no changes)"
    else
        cp "$src" "$dest"
    fi
}

echo -e "${GREEN}[1/4] Updating frontend shell...${NC}"
sync_dir "$BOILERPLATE_DIR/frontend/src/shell" "$TARGET_PATH/frontend/src/shell" "shell/"

echo ""
echo -e "${GREEN}[2/4] Updating frontend boilerplate...${NC}"
sync_dir "$BOILERPLATE_DIR/frontend/src/boilerplate" "$TARGET_PATH/frontend/src/boilerplate" "boilerplate/"

echo ""
echo -e "${GREEN}[3/4] Updating workflows...${NC}"
# Workflows are app-specific, not synced
# sync_dir "$BOILERPLATE_DIR/../.github/workflows" "$TARGET_PATH/.github/workflows" ".github/workflows/"

echo ""
echo -e "${GREEN}[4/4] Updating shared configs...${NC}"
# These files are typically identical across apps
sync_file "$BOILERPLATE_DIR/frontend/tsconfig.json" "$TARGET_PATH/frontend/tsconfig.json" "frontend/tsconfig.json"
sync_file "$BOILERPLATE_DIR/frontend/vite.config.ts" "$TARGET_PATH/frontend/vite.config.ts" "frontend/vite.config.ts"
sync_file "$BOILERPLATE_DIR/frontend/.eslintrc.cjs" "$TARGET_PATH/frontend/.eslintrc.cjs" "frontend/.eslintrc.cjs"

echo ""
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}Dry run complete. No changes made.${NC}"
    echo "Run without --dry-run to apply changes."
else
    echo -e "${GREEN}✓ Update complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. cd $TARGET_PATH"
    echo "  2. Review changes: git diff"
    echo "  3. Test locally: cd frontend && npm install && npm run build"
    echo "  4. Commit: git add -A && git commit -m 'chore: update boilerplate from ds-app-developer'"
    echo "  5. Push: git push"
fi
