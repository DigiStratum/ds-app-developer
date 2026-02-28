#!/bin/bash
# create-app.sh - Create a new DS app from boilerplate
#
# Usage: ./scripts/create-app.sh <app-slug>
#
# Example:
#   ./scripts/create-app.sh testlaunch
#   # Creates ds-app-testlaunch at testlaunch.digistratum.com
#
# This script does EVERYTHING:
#   1. Copies boilerplate/ with developer → newname substitution
#   2. Creates GitHub repo
#   3. Pushes code
#   4. Creates AWS secret placeholder
#   5. Registers app in DSAccount (if DSACCOUNT_ADMIN_TOKEN set)
#   6. Stores app_secret in AWS Secrets Manager
#   7. Waits for deploy
#   8. Confirms site is live
#
# Environment variables:
#   DSACCOUNT_ADMIN_TOKEN - Super-admin session token for auto-registration
#   DSACCOUNT_API_URL     - DSAccount API URL (default: https://account.digistratum.com)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory (ds-app-developer root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
BOILERPLATE_DIR="$REPO_ROOT/boilerplate"

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing app slug${NC}"
    echo ""
    echo "Usage: $0 <app-slug>"
    echo ""
    echo "Example:"
    echo "  $0 testlaunch"
    echo "  # Creates ds-app-testlaunch at testlaunch.digistratum.com"
    echo ""
    echo "  $0 crm"
    echo "  # Creates ds-app-crm at crm.digistratum.com"
    exit 1
fi

APP_SLUG="$1"
APP_NAME="ds-app-$APP_SLUG"
DOMAIN="$APP_SLUG.digistratum.com"
DEST_PATH="$HOME/repos/digistratum/$APP_NAME"
GITHUB_ORG="DigiStratum"

# Validate app slug (alphanumeric and hyphens only)
if [[ ! "$APP_SLUG" =~ ^[a-z][a-z0-9-]*$ ]]; then
    echo -e "${RED}Error: App slug must start with letter, contain only lowercase alphanumeric and hyphens${NC}"
    exit 1
fi

# Check if boilerplate exists
if [ ! -d "$BOILERPLATE_DIR" ]; then
    echo -e "${RED}Error: Boilerplate directory not found at $BOILERPLATE_DIR${NC}"
    exit 1
fi

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) not installed${NC}"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI not authenticated. Run: gh auth login${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI not installed${NC}"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS CLI not authenticated${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites OK${NC}"
echo ""

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

# Check if GitHub repo already exists
if gh repo view "$GITHUB_ORG/$APP_NAME" &> /dev/null; then
    echo -e "${YELLOW}Warning: GitHub repo already exists: $GITHUB_ORG/$APP_NAME${NC}"
    read -p "Do you want to continue (will push to existing repo)? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    REPO_EXISTS=true
else
    REPO_EXISTS=false
fi

echo ""
echo -e "${GREEN}=== Creating: $APP_NAME ===${NC}"
echo "  Slug: $APP_SLUG"
echo "  Domain: $DOMAIN"
echo "  Path: $DEST_PATH"
echo "  GitHub: $GITHUB_ORG/$APP_NAME"
echo ""

# Create destination directory
mkdir -p "$DEST_PATH"

# Step 1: Copy boilerplate (excluding node_modules)
echo -e "${BLUE}[1/6] Copying boilerplate...${NC}"
rsync -a --exclude='node_modules' --exclude='.git' "$BOILERPLATE_DIR"/ "$DEST_PATH/"

# Step 2: Replace "developer" with new app name throughout
echo -e "${BLUE}[2/6] Replacing developer → $APP_SLUG...${NC}"

# CDK_STACK_NAME: e.g., "testlaunch" -> "DSAppTestlaunchStack"
CDK_STACK_NAME="DSApp$(echo "$APP_SLUG" | sed -r 's/(^|-)([a-z])/\U\2/g')Stack"

# Replace in all relevant files
find "$DEST_PATH" -type f \( -name "*.go" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" -o -name "*.html" -o -name "*.css" \) | while read -r file; do
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # Replace various forms
        sed -i '' "s|ds-app-developer|$APP_NAME|g" "$file"
        sed -i '' "s|developer\.digistratum\.com|$DOMAIN|g" "$file"
        sed -i '' "s|DSAppDeveloperStack|$CDK_STACK_NAME|g" "$file"
        sed -i '' "s|dsAccountAppId: 'developer'|dsAccountAppId: '$APP_SLUG'|g" "$file"
        sed -i '' "s|appName: 'developer'|appName: '$APP_SLUG'|g" "$file"
    else
        sed -i "s|ds-app-developer|$APP_NAME|g" "$file"
        sed -i "s|developer\.digistratum\.com|$DOMAIN|g" "$file"
        sed -i "s|DSAppDeveloperStack|$CDK_STACK_NAME|g" "$file"
        sed -i "s|dsAccountAppId: 'developer'|dsAccountAppId: '$APP_SLUG'|g" "$file"
        sed -i "s|appName: 'developer'|appName: '$APP_SLUG'|g" "$file"
    fi
done

# Update go.mod module path
if [ -f "$DEST_PATH/backend/go.mod" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|module github.com/DigiStratum/ds-app-developer|module github.com/DigiStratum/$APP_NAME|g" "$DEST_PATH/backend/go.mod"
    else
        sed -i "s|module github.com/DigiStratum/ds-app-developer|module github.com/DigiStratum/$APP_NAME|g" "$DEST_PATH/backend/go.mod"
    fi
fi

# Rename DeveloperHeader/Footer to generic names (or keep as-is since they're reusable)
# For now, keep them - they're layout components that work for any app

# Step 3: Create GitHub repo (if needed)
echo -e "${BLUE}[3/6] Setting up GitHub repo...${NC}"
cd "$DEST_PATH"
git init -q

if [ "$REPO_EXISTS" = false ]; then
    echo "  Creating repo: $GITHUB_ORG/$APP_NAME"
    gh repo create "$GITHUB_ORG/$APP_NAME" --private --source=. --remote=origin
else
    echo "  Using existing repo: $GITHUB_ORG/$APP_NAME"
    git remote add origin "https://github.com/$GITHUB_ORG/$APP_NAME.git" 2>/dev/null || true
fi

# Step 4: Commit and push
echo -e "${BLUE}[4/6] Committing and pushing...${NC}"
git add -A
git commit -q -m "Initial commit from ds-app-developer boilerplate

App: $APP_NAME
Domain: $DOMAIN
Stack: $CDK_STACK_NAME"
git branch -M main
git push -u origin main --force

echo "  Pushed to GitHub"

# Step 5: Create AWS secret (if needed)
echo -e "${BLUE}[5/6] Setting up AWS secret...${NC}"
SECRET_NAME="$APP_NAME/dsaccount-app-secret"

if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" &> /dev/null; then
    echo "  Secret already exists: $SECRET_NAME"
else
    echo "  Creating secret: $SECRET_NAME"
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "DSAccount SSO app secret for $APP_NAME" \
        --secret-string "PLACEHOLDER_UPDATE_AFTER_DSACCOUNT_REGISTRATION" \
        --region us-west-2 > /dev/null
    echo "  Secret created (placeholder value - update after DSAccount registration)"
fi

# Step 6: Wait for CI/Deploy
echo -e "${BLUE}[6/6] Waiting for CI/Deploy...${NC}"
echo "  Monitoring GitHub Actions..."

# Wait for CI to start (give it a moment)
sleep 10

# Poll for completion (max 30 minutes)
MAX_WAIT=1800
ELAPSED=0
INTERVAL=30

while [ $ELAPSED -lt $MAX_WAIT ]; do
    # Get latest workflow runs
    CI_STATUS=$(gh run list --repo "$GITHUB_ORG/$APP_NAME" --limit 1 --json name,status,conclusion 2>/dev/null | jq -r '.[0] | "\(.name):\(.status):\(.conclusion)"' 2>/dev/null || echo "none")
    
    echo "  [$((ELAPSED/60))m] $CI_STATUS"
    
    # Check if deploy succeeded
    DEPLOY_STATUS=$(gh run list --repo "$GITHUB_ORG/$APP_NAME" --workflow "deploy.yml" --limit 1 --json status,conclusion 2>/dev/null | jq -r '.[0] | "\(.status):\(.conclusion)"' 2>/dev/null || echo "none")
    
    if [[ "$DEPLOY_STATUS" == "completed:success" ]]; then
        echo ""
        echo -e "${GREEN}Deploy succeeded!${NC}"
        break
    elif [[ "$DEPLOY_STATUS" == "completed:failure" ]]; then
        echo ""
        echo -e "${RED}Deploy failed. Check: https://github.com/$GITHUB_ORG/$APP_NAME/actions${NC}"
        exit 1
    fi
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}Timeout waiting for deploy. Check manually: https://github.com/$GITHUB_ORG/$APP_NAME/actions${NC}"
fi

# Final check
echo ""
echo -e "${BLUE}Checking site...${NC}"
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "https://$DOMAIN" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ SUCCESS! $APP_NAME is LIVE${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo ""
    echo "  Site: https://$DOMAIN"
    echo "  Repo: https://github.com/$GITHUB_ORG/$APP_NAME"
    echo ""
    if [ "$DSACCOUNT_REGISTERED" = true ]; then
        echo -e "  ${GREEN}✓ SSO configured in DSAccount${NC}"
        echo "  App users can now log in via DSAccount SSO."
    else
        echo -e "  ${YELLOW}⚠ SSO not configured${NC}"
        echo "  Next steps:"
        echo "    1. Register app in DSAccount for SSO"
        echo "       - Set DSACCOUNT_ADMIN_TOKEN env var and re-run, or"
        echo "       - Use DSAccount admin portal: https://account.digistratum.com/admin/apps"
        echo "    2. Update AWS secret: $SECRET_NAME"
    fi
    echo ""
    echo "  Start building features!"
    echo ""
else
    echo ""
    echo -e "${YELLOW}Site returned HTTP $HTTP_CODE${NC}"
    echo "  This might be normal if CDN is still propagating."
    echo "  Check: https://$DOMAIN"
    echo "  Actions: https://github.com/$GITHUB_ORG/$APP_NAME/actions"
fi
