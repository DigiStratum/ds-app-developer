#!/bin/bash
#
# deploy-shared-runtime.sh
#
# Builds @ds/core UMD bundle and deploys it to the shared runtime S3 bucket.
# The bundle is uploaded to both versioned and latest paths:
#   - core/v{version}/ds-core.umd.js
#   - core/latest/ds-core.umd.js
#
# Usage:
#   ./scripts/deploy-shared-runtime.sh                  # Deploy latest version from package.json
#   ./scripts/deploy-shared-runtime.sh --version 1.0.0  # Deploy with specific version
#   ./scripts/deploy-shared-runtime.sh --dry-run        # Show what would be uploaded
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - npm installed
#   - Stack deployed (S3 bucket exists)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DS_CORE_DIR="$REPO_ROOT/packages/ds-core"
DIST_DIR="$DS_CORE_DIR/dist/umd"

# Default values
DRY_RUN=false
VERSION=""
BUCKET_NAME="ds-shared-runtime-171949636152"  # Will be queried from stack if not set
CLOUDFRONT_DISTRIBUTION_ID=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            VERSION="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --bucket)
            BUCKET_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--version VERSION] [--dry-run] [--bucket BUCKET_NAME]"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Get version from package.json if not specified
if [[ -z "$VERSION" ]]; then
    VERSION=$(node -p "require('$DS_CORE_DIR/package.json').version")
fi

echo "=== DS Core Shared Runtime Deployment ==="
echo "Version: $VERSION"
echo "Bucket: $BUCKET_NAME"
echo "Dry run: $DRY_RUN"
echo ""

# Build the UMD bundle
echo "📦 Building @ds/core UMD bundle..."
cd "$DS_CORE_DIR"
npm install --silent
npm run build

# Find the UMD bundle (tsup outputs as .global.js for IIFE)
UMD_FILE=""
if [[ -f "$DIST_DIR/ds-core.umd.global.js" ]]; then
    UMD_FILE="$DIST_DIR/ds-core.umd.global.js"
elif [[ -f "$DIST_DIR/ds-core.umd.js" ]]; then
    UMD_FILE="$DIST_DIR/ds-core.umd.js"
else
    echo "❌ Error: UMD bundle not found in $DIST_DIR/"
    echo "   Expected: ds-core.umd.global.js or ds-core.umd.js"
    ls -la "$DIST_DIR/"
    exit 1
fi

UMD_MAP="${UMD_FILE}.map"

echo "✅ UMD bundle built: $UMD_FILE"
ls -lh "$DIST_DIR/"

# Upload to S3
S3_VERSIONED_PATH="core/v$VERSION/ds-core.umd.js"
S3_LATEST_PATH="core/latest/ds-core.umd.js"
S3_VERSIONED_MAP="core/v$VERSION/ds-core.umd.js.map"
S3_LATEST_MAP="core/latest/ds-core.umd.js.map"

upload_file() {
    local src="$1"
    local dest="$2"
    local content_type="$3"
    local cache_control="$4"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "  [DRY RUN] Would upload: $src -> s3://$BUCKET_NAME/$dest"
    else
        echo "  Uploading: $src -> s3://$BUCKET_NAME/$dest"
        aws s3 cp "$src" "s3://$BUCKET_NAME/$dest" \
            --content-type "$content_type" \
            --cache-control "$cache_control"
    fi
}

echo ""
echo "📤 Uploading to S3..."

# Upload versioned bundle (long cache)
upload_file "$UMD_FILE" "$S3_VERSIONED_PATH" "application/javascript" "public, max-age=31536000, immutable"

# Upload versioned source map (long cache)
if [[ -f "$UMD_MAP" ]]; then
    upload_file "$UMD_MAP" "$S3_VERSIONED_MAP" "application/json" "public, max-age=31536000, immutable"
fi

# Upload latest bundle (short cache)
upload_file "$UMD_FILE" "$S3_LATEST_PATH" "application/javascript" "public, max-age=300"

# Upload latest source map (short cache)
if [[ -f "$UMD_MAP" ]]; then
    upload_file "$UMD_MAP" "$S3_LATEST_MAP" "application/json" "public, max-age=300"
fi

# Invalidate CloudFront cache for /core/latest/*
if [[ "$DRY_RUN" == "false" ]]; then
    echo ""
    echo "🔄 Invalidating CloudFront cache for latest..."
    
    # Get distribution ID from stack output
    CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name DSAppDeveloperStack \
        --query "Stacks[0].Outputs[?contains(OutputKey, 'SharedRuntimeDistributionId')].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
        aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
            --paths "/core/latest/*" > /dev/null
        echo "✅ CloudFront invalidation created"
    else
        echo "⚠️  Could not find CloudFront distribution ID. Skipping invalidation."
    fi
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 URLs:"
echo "   Latest:    https://apps.digistratum.com/core/latest/ds-core.umd.js"
echo "   Versioned: https://apps.digistratum.com/core/v$VERSION/ds-core.umd.js"
echo ""
echo "📝 Usage in browser:"
echo '   <script src="https://apps.digistratum.com/core/latest/ds-core.umd.js"></script>'
echo '   <script>console.log(window.DSCore);</script>'
echo ""
echo "📝 Usage with dynamic import:"
echo '   const DSCore = await import("https://apps.digistratum.com/core/latest/ds-core.umd.js");'
