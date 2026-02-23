#!/bin/bash
# register-manifest.sh
# 
# Post-deploy script to register app manifest with DSAccount.
# Can be run independently of CDK or from GitHub Actions.
#
# Usage:
#   ./scripts/register-manifest.sh
#
# Required environment variables:
#   DSACCOUNT_URL       - DSAccount API URL (e.g., https://account.digistratum.com)
#   DSACCOUNT_APP_ID    - App ID registered with DSAccount
#   DSACCOUNT_APP_SECRET - App secret (or use DSACCOUNT_APP_SECRET_ARN with AWS)
#
# Optional environment variables:
#   DSACCOUNT_APP_SECRET_ARN - AWS Secrets Manager ARN (used if DSACCOUNT_APP_SECRET not set)
#   APP_VERSION         - App version (defaults to package.json version)
#   HEALTH_CHECK_URL    - Health check URL
#   CDK_STACK_NAME      - CDK stack name
#   MANIFEST_FILE       - Path to manifest.json (default: ./manifest.json)
#
# Manifest file format (manifest.json):
# {
#   "frontendRoutes": [
#     { "path": "/dashboard", "name": "Dashboard", "authRequired": true }
#   ],
#   "backendResources": [
#     { "name": "items.list", "path": "/api/items", "methods": ["GET"], "authType": "jwt" }
#   ],
#   "dependencies": [
#     { "appId": "dsaccount", "resourceName": "auth.validate", "required": true }
#   ]
# }

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Validate required env vars
if [ -z "$DSACCOUNT_URL" ]; then
    log_error "DSACCOUNT_URL is required"
    exit 1
fi

if [ -z "$DSACCOUNT_APP_ID" ]; then
    log_error "DSACCOUNT_APP_ID is required"
    exit 1
fi

# Get app secret from env var or AWS Secrets Manager
if [ -z "$DSACCOUNT_APP_SECRET" ]; then
    if [ -n "$DSACCOUNT_APP_SECRET_ARN" ]; then
        log_info "Fetching app secret from AWS Secrets Manager..."
        DSACCOUNT_APP_SECRET=$(aws secretsmanager get-secret-value \
            --secret-id "$DSACCOUNT_APP_SECRET_ARN" \
            --query SecretString \
            --output text)
        if [ -z "$DSACCOUNT_APP_SECRET" ]; then
            log_error "Failed to fetch secret from $DSACCOUNT_APP_SECRET_ARN"
            exit 1
        fi
    else
        log_error "DSACCOUNT_APP_SECRET or DSACCOUNT_APP_SECRET_ARN is required"
        exit 1
    fi
fi

# Get version from package.json if not set
if [ -z "$APP_VERSION" ]; then
    if [ -f "package.json" ]; then
        APP_VERSION=$(jq -r '.version' package.json)
        log_info "Using version from package.json: $APP_VERSION"
    else
        APP_VERSION="unknown"
        log_warn "No APP_VERSION set and no package.json found"
    fi
fi

# Load manifest file
MANIFEST_FILE="${MANIFEST_FILE:-./manifest.json}"
if [ -f "$MANIFEST_FILE" ]; then
    log_info "Loading manifest from $MANIFEST_FILE"
    FRONTEND_ROUTES=$(jq -c '.frontendRoutes // []' "$MANIFEST_FILE")
    BACKEND_RESOURCES=$(jq -c '.backendResources // []' "$MANIFEST_FILE")
    DEPENDENCIES=$(jq -c '.dependencies // []' "$MANIFEST_FILE")
else
    log_warn "No manifest file found at $MANIFEST_FILE, using empty manifest"
    FRONTEND_ROUTES="[]"
    BACKEND_RESOURCES="[]"
    DEPENDENCIES="[]"
fi

# Build the payload
PAYLOAD=$(jq -n \
    --arg version "$APP_VERSION" \
    --arg healthCheckUrl "${HEALTH_CHECK_URL:-}" \
    --arg cdkStack "${CDK_STACK_NAME:-}" \
    --arg cdkDataStack "${CDK_DATA_STACK_NAME:-}" \
    --argjson frontendRoutes "$FRONTEND_ROUTES" \
    --argjson backendResources "$BACKEND_RESOURCES" \
    --argjson dependencies "$DEPENDENCIES" \
    '{
        version: $version,
        health_check_url: $healthCheckUrl,
        cdk_stack: $cdkStack,
        cdk_data_stack: $cdkDataStack,
        frontend_routes: $frontendRoutes,
        backend_resources: $backendResources,
        dependencies: $dependencies
    }'
)

log_info "Registering manifest for app: $DSACCOUNT_APP_ID"
log_info "DSAccount URL: $DSACCOUNT_URL"
log_info "Version: $APP_VERSION"

# POST to DSAccount
ENDPOINT="${DSACCOUNT_URL}/api/apps/${DSACCOUNT_APP_ID}/manifest"
log_info "POST $ENDPOINT"

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $DSACCOUNT_APP_SECRET" \
    -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    log_info "Manifest registered successfully!"
    echo "$BODY" | jq .
else
    log_error "Failed to register manifest (HTTP $HTTP_CODE)"
    echo "$BODY"
    exit 1
fi
