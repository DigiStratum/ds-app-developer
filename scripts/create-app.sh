#!/bin/bash
# create-app.sh - Create a new DS app from developer template
#
# Usage: ./scripts/create-app.sh <subdomain.apex.com>
#
# Examples:
#   ./scripts/create-app.sh hello14.digistratum.com
#   # Creates ds-app-hello14 at hello14.digistratum.com (DS ecosystem)
#
#   ./scripts/create-app.sh marketplace.leapkick.com
#   # Creates lk-marketplace at marketplace.leapkick.com (LK ecosystem)
#
# The apex domain determines the ecosystem config, which provides:
#   - SSO cookie domain
#   - Account service URL
#   - App registry URL
#   - CDN shell URL
#   - Logo/branding
#   - AWS settings
#
# This script does EVERYTHING:
#   1. Parses domain → loads ecosystem config
#   2. Copies templates with substitutions
#   3. Creates GitHub repo (no push yet)
#   4. Creates AWS secret placeholder
#   5. Registers app with DSAccount and stores secret in AWS
#   6. Commits and pushes code (triggers CI with E2E tests)
#   7. Waits for deploy
#   8. Confirms site is live
#
# Environment variables:
#   DSACCOUNT_ADMIN_TOKEN - Super-admin session token for auto-registration (optional)
#   NPM_TOKEN             - GitHub PAT with read:packages scope for @digistratum packages

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
ECOSYSTEMS_DIR="$REPO_ROOT/ecosystems"
FRONTEND_DIR="$REPO_ROOT/frontend"
BACKEND_DIR="$REPO_ROOT/backend"
CDK_DIR="$REPO_ROOT/cdk"
TEMPLATES_DIR="$REPO_ROOT/templates"

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing domain${NC}"
    echo ""
    echo "Usage: $0 <subdomain.apex.com>"
    echo ""
    echo "Examples:"
    echo "  $0 hello14.digistratum.com"
    echo "  # Creates ds-app-hello14 at hello14.digistratum.com (DS ecosystem)"
    echo ""
    echo "  $0 marketplace.leapkick.com"
    echo "  # Creates lk-marketplace at marketplace.leapkick.com (LK ecosystem)"
    echo ""
    echo "Available ecosystems:"
    for f in "$ECOSYSTEMS_DIR"/*.json; do
        [ -f "$f" ] || continue
        [[ "$(basename "$f")" == "ecosystem.schema.json" ]] && continue
        apex=$(jq -r '.apex' "$f")
        name=$(jq -r '.name' "$f")
        echo "  - $apex ($name)"
    done
    exit 1
fi

FULL_DOMAIN="$1"

# Parse domain into subdomain and apex
# e.g., "hello14.digistratum.com" -> subdomain="hello14", apex="digistratum.com"
# e.g., "marketplace.leapkick.com" -> subdomain="marketplace", apex="leapkick.com"
if [[ ! "$FULL_DOMAIN" =~ ^([a-z][a-z0-9-]*)\.(([a-z0-9-]+\.)+[a-z]{2,})$ ]]; then
    echo -e "${RED}Error: Invalid domain format: $FULL_DOMAIN${NC}"
    echo "Expected format: subdomain.apex.com (e.g., hello14.digistratum.com)"
    exit 1
fi

APP_SLUG="${BASH_REMATCH[1]}"
APEX_DOMAIN="${BASH_REMATCH[2]}"

# Load ecosystem config
ECOSYSTEM_FILE="$ECOSYSTEMS_DIR/$APEX_DOMAIN.json"
if [ ! -f "$ECOSYSTEM_FILE" ]; then
    # Try without the TLD variations
    APEX_BASE="${APEX_DOMAIN%%.*}"
    ECOSYSTEM_FILE="$ECOSYSTEMS_DIR/$APEX_BASE.json"
fi

if [ ! -f "$ECOSYSTEM_FILE" ]; then
    echo -e "${RED}Error: No ecosystem config found for $APEX_DOMAIN${NC}"
    echo ""
    echo "Available ecosystems:"
    for f in "$ECOSYSTEMS_DIR"/*.json; do
        [ -f "$f" ] || continue
        [[ "$(basename "$f")" == "ecosystem.schema.json" ]] && continue
        echo "  - $(jq -r '.apex' "$f")"
    done
    exit 1
fi

echo -e "${GREEN}Loading ecosystem: $ECOSYSTEM_FILE${NC}"

# Extract ecosystem config values
ECOSYSTEM_ID=$(jq -r '.id' "$ECOSYSTEM_FILE")
ECOSYSTEM_NAME=$(jq -r '.name' "$ECOSYSTEM_FILE")
COOKIE_DOMAIN=$(jq -r '.auth.cookieDomain' "$ECOSYSTEM_FILE")
SESSION_COOKIE=$(jq -r '.auth.sessionCookieName // "ds-session"' "$ECOSYSTEM_FILE")
PREFS_COOKIE=$(jq -r '.auth.prefsCookieName // "ds-prefs"' "$ECOSYSTEM_FILE")
ACCOUNT_URL=$(jq -r '.services.account' "$ECOSYSTEM_FILE")
REGISTRY_URL=$(jq -r '.services.registry' "$ECOSYSTEM_FILE")
SHELL_URL=$(jq -r '.services.shell' "$ECOSYSTEM_FILE")
LOGO_FILE=$(jq -r '.branding.logo' "$ECOSYSTEM_FILE")
COPYRIGHT_HOLDER=$(jq -r '.branding.copyrightHolder' "$ECOSYSTEM_FILE")
PRIVACY_URL=$(jq -r '.legal.privacyUrl // "https://www.digistratum.com/privacy"' "$ECOSYSTEM_FILE")
TERMS_URL=$(jq -r '.legal.termsUrl // "https://www.digistratum.com/terms"' "$ECOSYSTEM_FILE")
SUPPORT_URL=$(jq -r '.legal.supportUrl // "https://www.digistratum.com/support"' "$ECOSYSTEM_FILE")
AWS_REGION=$(jq -r '.aws.region // "us-west-2"' "$ECOSYSTEM_FILE")
ROUTE53_ZONE_ID=$(jq -r '.aws.route53ZoneId // ""' "$ECOSYSTEM_FILE")
ROUTE53_ZONE_NAME=$(jq -r '.aws.route53ZoneName // ""' "$ECOSYSTEM_FILE")

# Validate required AWS config (no defaults - must be explicit to prevent DNS accidents)
if [ -z "$ROUTE53_ZONE_ID" ] || [ -z "$ROUTE53_ZONE_NAME" ]; then
    echo -e "${RED}Error: Ecosystem config missing Route53 zone configuration${NC}"
    echo "  route53ZoneId: $ROUTE53_ZONE_ID"
    echo "  route53ZoneName: $ROUTE53_ZONE_NAME"
    echo ""
    echo "Update $ECOSYSTEM_FILE with valid aws.route53ZoneId and aws.route53ZoneName"
    exit 1
fi

# Determine repo prefix based on ecosystem
case "$ECOSYSTEM_ID" in
    digistratum)
        REPO_PREFIX="ds-app"
        ;;
    leapkick)
        REPO_PREFIX="lk"
        ;;
    *)
        REPO_PREFIX="${ECOSYSTEM_ID:0:2}-app"
        ;;
esac

APP_NAME="$REPO_PREFIX-$APP_SLUG"
DISPLAY_NAME="$(echo "$APP_SLUG" | sed -E "s/-/ /g; s/\b(.)/\u\1/g")"
DEST_PATH="$HOME/repos/digistratum/$APP_NAME"
GITHUB_ORG="DigiStratum"

# Validate app slug
if [[ ! "$APP_SLUG" =~ ^[a-z][a-z0-9-]*$ ]]; then
    echo -e "${RED}Error: App slug must start with letter, contain only lowercase alphanumeric and hyphens${NC}"
    exit 1
fi

# Check source directories
if [ ! -d "$FRONTEND_DIR" ] || [ ! -d "$BACKEND_DIR" ] || [ ! -d "$CDK_DIR" ]; then
    echo -e "${RED}Error: Source directories (frontend, backend, cdk) not found in $REPO_ROOT${NC}"
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

# Check if destination exists
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

# Check if GitHub repo exists
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
echo "  Ecosystem: $ECOSYSTEM_NAME ($ECOSYSTEM_ID)"
echo "  App Slug: $APP_SLUG"
echo "  Domain: $FULL_DOMAIN"
echo "  Cookie Domain: $COOKIE_DOMAIN"
echo "  Account: $ACCOUNT_URL"
echo "  Registry: $REGISTRY_URL"
echo "  Logo: $LOGO_FILE"
echo "  Path: $DEST_PATH"
echo "  GitHub: $GITHUB_ORG/$APP_NAME"
echo ""

# Create destination
mkdir -p "$DEST_PATH"

# Step 1: Copy source files
echo -e "${BLUE}[1/8] Copying source files...${NC}"
mkdir -p "$DEST_PATH/frontend" "$DEST_PATH/backend" "$DEST_PATH/cdk" "$DEST_PATH/.github"
rsync -a --exclude='node_modules' --exclude='.vite' --exclude='dist' "$FRONTEND_DIR"/ "$DEST_PATH/frontend/"
rsync -a "$BACKEND_DIR"/ "$DEST_PATH/backend/"
rsync -a --exclude='node_modules' --exclude='cdk.out' "$CDK_DIR"/ "$DEST_PATH/cdk/"
rsync -a "$REPO_ROOT/templates/.github"/ "$DEST_PATH/.github/"
cp "$REPO_ROOT/templates/README.md" "$DEST_PATH/README.md"

# Copy ecosystem-specific logo
if [ -f "$REPO_ROOT/frontend/public/$LOGO_FILE" ]; then
    cp "$REPO_ROOT/frontend/public/$LOGO_FILE" "$DEST_PATH/frontend/public/logo.svg"
fi

# Step 2: Replace placeholders with ecosystem and app values
echo -e "${BLUE}[2/8] Applying ecosystem config and app values...${NC}"

CDK_STACK_NAME="DSApp$(echo "$APP_SLUG" | sed -r 's/(^|-)([a-z])/\U\2/g')Stack"

find "$DEST_PATH" -type f \( -name "*.go" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" -o -name "*.html" -o -name "*.css" \) | while read -r file; do
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # App name replacements
        sed -i '' "s|ds-app-developer|$APP_NAME|g" "$file"
        sed -i '' "s|developer\.digistratum\.com|$FULL_DOMAIN|g" "$file"
        sed -i '' "s|DSAppDeveloperStack|$CDK_STACK_NAME|g" "$file"
        # Route53 zone replacements
        sed -i '' "s|hostedZoneId: 'Z2HSQ1OB6HFLSJ'|hostedZoneId: '$ROUTE53_ZONE_ID'|g" "$file"
        sed -i '' "s|zoneName: 'digistratum.com'|zoneName: '$ROUTE53_ZONE_NAME'|g" "$file"
        sed -i '' "s|dsAccountAppId: 'developer'|dsAccountAppId: '$APP_SLUG'|g" "$file"
        sed -i '' "s|appName: 'developer'|appName: '$APP_SLUG'|g" "$file"
        
        # Ecosystem-specific replacements
        # First: preserve packages.digistratum.com (shared package CDN for all ecosystems)
        sed -i '' "s|packages\.digistratum\.com|__PACKAGES_CDN__|g" "$file"
        sed -i '' "s|\.digistratum\.com|$COOKIE_DOMAIN|g" "$file"
        # Restore packages CDN
        sed -i '' "s|__PACKAGES_CDN__|packages.digistratum.com|g" "$file"
        sed -i '' "s|https://account\.digistratum\.com|$ACCOUNT_URL|g" "$file"
        sed -i '' "s|https://registry\.digistratum\.com/api/apps|$REGISTRY_URL|g" "$file"
        sed -i '' "s|https://apps.digistratum.com/shell|${SHELL_URL%/v1/*}|g" "$file"
        sed -i '' "s|lk_logo\.svg|$LOGO_FILE|g" "$file"
        sed -i '' "s|ds-logo\.svg|$LOGO_FILE|g" "$file"
        sed -i '' "s|ds-session|$SESSION_COOKIE|g" "$file"
        sed -i '' "s|ds-prefs|$PREFS_COOKIE|g" "$file"
        sed -i '' "s|DigiStratum LLC|$COPYRIGHT_HOLDER|g" "$file"
        sed -i '' "s|https://www.digistratum.com/privacy|$PRIVACY_URL|g" "$file"
        sed -i '' "s|https://www.digistratum.com/terms|$TERMS_URL|g" "$file"
        sed -i '' "s|https://www.digistratum.com/support|$SUPPORT_URL|g" "$file"
        
        # Template placeholders
        sed -i '' "s|{{APP_NAME}}|$APP_NAME|g" "$file"
        sed -i '' "s|{{DOMAIN}}|$FULL_DOMAIN|g" "$file"
        sed -i '' "s|{{ACCOUNT_ID}}|171949636152|g" "$file"
        sed -i '' "s|{{CLOUDFRONT_ID}}|<your-dist-id>|g" "$file"
        sed -i '' "s|{{ECOSYSTEM}}|$ECOSYSTEM_ID|g" "$file"
    else
        # Linux sed
        # Preserve packages.digistratum.com (shared package CDN for all ecosystems)
        sed -i "s|packages\.digistratum\.com|__PACKAGES_CDN__|g" "$file"
        sed -i "s|ds-app-developer|$APP_NAME|g" "$file"
        sed -i "s|developer\.digistratum\.com|$FULL_DOMAIN|g" "$file"
        sed -i "s|DSAppDeveloperStack|$CDK_STACK_NAME|g" "$file"
        # Route53 zone replacements
        sed -i "s|hostedZoneId: 'Z2HSQ1OB6HFLSJ'|hostedZoneId: '$ROUTE53_ZONE_ID'|g" "$file"
        sed -i "s|zoneName: 'digistratum.com'|zoneName: '$ROUTE53_ZONE_NAME'|g" "$file"
        sed -i "s|dsAccountAppId: 'developer'|dsAccountAppId: '$APP_SLUG'|g" "$file"
        sed -i "s|appName: 'developer'|appName: '$APP_SLUG'|g" "$file"
        sed -i "s|\.digistratum\.com|$COOKIE_DOMAIN|g" "$file"
        # Restore packages CDN
        sed -i "s|__PACKAGES_CDN__|packages.digistratum.com|g" "$file"
        sed -i "s|https://account\.digistratum\.com|$ACCOUNT_URL|g" "$file"
        sed -i "s|https://registry\.digistratum\.com/api/apps|$REGISTRY_URL|g" "$file"
        sed -i "s|https://apps.digistratum.com/shell|${SHELL_URL%/v1/*}|g" "$file"
        sed -i "s|lk_logo\.svg|$LOGO_FILE|g" "$file"
        sed -i "s|ds-logo\.svg|$LOGO_FILE|g" "$file"
        sed -i "s|ds-session|$SESSION_COOKIE|g" "$file"
        sed -i "s|ds-prefs|$PREFS_COOKIE|g" "$file"
        sed -i "s|DigiStratum LLC|$COPYRIGHT_HOLDER|g" "$file"
        sed -i "s|{{APP_NAME}}|$APP_NAME|g" "$file"
        sed -i "s|{{DOMAIN}}|$FULL_DOMAIN|g" "$file"
        sed -i "s|{{ACCOUNT_ID}}|171949636152|g" "$file"
        sed -i "s|https://www.digistratum.com/privacy|$PRIVACY_URL|g" "$file"
        sed -i "s|https://www.digistratum.com/terms|$TERMS_URL|g" "$file"
        sed -i "s|https://www.digistratum.com/support|$SUPPORT_URL|g" "$file"
        sed -i "s|{{CLOUDFRONT_ID}}|<your-dist-id>|g" "$file"
        sed -i "s|{{ECOSYSTEM}}|$ECOSYSTEM_ID|g" "$file"
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

# Step 3: Create GitHub repo
echo -e "${BLUE}[3/8] Setting up GitHub repo...${NC}"
cd "$DEST_PATH"
git init -q

if [ "$REPO_EXISTS" = false ]; then
    echo "  Creating repo: $GITHUB_ORG/$APP_NAME"
    gh repo create "$GITHUB_ORG/$APP_NAME" --private
    git remote add origin "https://github.com/$GITHUB_ORG/$APP_NAME.git"
else
    echo "  Using existing repo: $GITHUB_ORG/$APP_NAME"
    git remote add origin "https://github.com/$GITHUB_ORG/$APP_NAME.git" 2>/dev/null || true
fi

# Step 4: Create AWS secret
echo -e "${BLUE}[4/8] Setting up AWS secret...${NC}"
SECRET_NAME="$APP_NAME/dsaccount-app-secret"

if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" &> /dev/null; then
    echo "  Secret already exists: $SECRET_NAME"
else
    echo "  Creating secret: $SECRET_NAME"
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "DSAccount SSO app secret for $APP_NAME ($ECOSYSTEM_ID ecosystem)" \
        --secret-string "PLACEHOLDER_UPDATE_AFTER_DSACCOUNT_REGISTRATION" \
        --region "$AWS_REGION" > /dev/null
    echo "  Secret created (placeholder)"
fi

# Step 5: Register with DSAccount
echo ""
echo -e "${BLUE}[5/8] Registering with DSAccount...${NC}"

DSACCOUNT_REGISTERED=false
DSACCOUNT_CREDENTIALS_FILE="$HOME/.openclaw/workspace/dsaccount-admin-credentials.env"
DSACCOUNT_API_URL="${DSACCOUNT_API_URL:-$ACCOUNT_URL}"

if [ -f "$DSACCOUNT_CREDENTIALS_FILE" ]; then
    source "$DSACCOUNT_CREDENTIALS_FILE"
fi

if [ -z "$DSACCOUNT_ADMIN_TOKEN" ]; then
    echo -e "  ${YELLOW}DSACCOUNT_ADMIN_TOKEN not set. Skipping SSO registration.${NC}"
    echo "  App will work but without SSO."
else
    REDIRECT_URI="https://$FULL_DOMAIN/api/auth/callback"
    
    REGISTER_PAYLOAD=$(cat <<EOF
{
  "app_id": "$APP_SLUG",
  "name": "$DISPLAY_NAME",
  "url": "https://$FULL_DOMAIN",
  "redirect_uris": ["$REDIRECT_URI"]
}
EOF
)
    
    echo "  Calling DSAccount registration API..."
    echo "  App ID: $APP_SLUG"
    echo "  Redirect URI: $REDIRECT_URI"
    
    REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "$DSACCOUNT_API_URL/api/admin/apps/register" \
        -H "Authorization: Bearer $DSACCOUNT_ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$REGISTER_PAYLOAD" 2>/dev/null)
    
    HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')
    
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
        APP_SECRET=$(echo "$RESPONSE_BODY" | jq -r '.app_secret // empty')
        
        if [ -n "$APP_SECRET" ] && [ "$APP_SECRET" != "null" ]; then
            echo -e "  ${GREEN}Registration successful!${NC}"
            
            aws secretsmanager put-secret-value \
                --secret-id "$SECRET_NAME" \
                --secret-string "$APP_SECRET" \
                --region "$AWS_REGION" > /dev/null 2>&1
            
            if [ $? -eq 0 ]; then
                echo -e "  ${GREEN}Secret stored: $SECRET_NAME${NC}"
                DSACCOUNT_REGISTERED=true
            else
                echo -e "  ${YELLOW}Warning: Failed to store secret in AWS${NC}"
            fi
        else
            echo -e "  ${YELLOW}Registration response missing app_secret${NC}"
        fi
    elif [ "$HTTP_STATUS" = "409" ]; then
        echo -e "  ${YELLOW}App already registered in DSAccount${NC}"
        DSACCOUNT_REGISTERED=true
    else
        echo -e "  ${YELLOW}Registration failed (HTTP $HTTP_STATUS)${NC}"
    fi
fi

# Step 6: Commit and push
echo -e "${BLUE}[6/8] Committing and pushing...${NC}"
git add -A
git commit -q -m "Initial commit from ds-app-developer

App: $APP_NAME
Domain: $FULL_DOMAIN
Ecosystem: $ECOSYSTEM_ID ($ECOSYSTEM_NAME)
Stack: $CDK_STACK_NAME"
git branch -M main
git push -u origin main --force

echo "  Pushed to GitHub"

# Step 7: Wait for CI/Deploy
echo -e "${BLUE}[7/8] Waiting for CI/Deploy...${NC}"
echo "  Monitoring GitHub Actions..."

sleep 10

MAX_WAIT=1800
ELAPSED=0
INTERVAL=30

while [ $ELAPSED -lt $MAX_WAIT ]; do
    CI_STATUS=$(gh run list --repo "$GITHUB_ORG/$APP_NAME" --limit 1 --json name,status,conclusion 2>/dev/null | jq -r '.[0] | "\(.name):\(.status):\(.conclusion)"' 2>/dev/null || echo "none")
    
    echo "  [$((ELAPSED/60))m] $CI_STATUS"
    
    if [[ "$CI_STATUS" == *":completed:success"* ]]; then
        echo -e "  ${GREEN}CI/Deploy completed successfully!${NC}"
        break
    elif [[ "$CI_STATUS" == *":completed:failure"* ]]; then
        echo -e "  ${RED}CI/Deploy failed!${NC}"
        echo "  Check: https://github.com/$GITHUB_ORG/$APP_NAME/actions"
        exit 1
    fi
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}Warning: Timed out waiting for CI/Deploy${NC}"
fi

# Step 8: Verify site is live
echo -e "${BLUE}[8/8] Verifying site is live...${NC}"

sleep 30

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$FULL_DOMAIN" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Site is live: https://$FULL_DOMAIN${NC}"
else
    echo -e "${YELLOW}⚠️ Site returned HTTP $HTTP_CODE (may still be deploying)${NC}"
fi

echo ""
echo -e "${GREEN}=== Summary ===${NC}"
echo "  App: $APP_NAME"
echo "  Domain: https://$FULL_DOMAIN"
echo "  Ecosystem: $ECOSYSTEM_NAME"
echo "  GitHub: https://github.com/$GITHUB_ORG/$APP_NAME"
echo "  SSO: $([ "$DSACCOUNT_REGISTERED" = true ] && echo "Registered" || echo "Not registered")"
echo ""
echo -e "${GREEN}Done!${NC}"
