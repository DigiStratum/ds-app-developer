#!/bin/bash
# destroy-app.sh - Destroy a DS app and all its resources
#
# Usage: ./scripts/destroy-app.sh <app-slug> [--dry-run | --force]
#
# Examples:
#   ./scripts/destroy-app.sh hello3 --dry-run   # Preview what would be deleted
#   ./scripts/destroy-app.sh hello3 --force     # Actually delete everything
#
# This script destroys EVERYTHING in reverse order of creation:
#   1. CloudFormation/CDK stacks (DSApp{Name}Stack)
#   2. S3 bucket contents and bucket
#   3. Secrets Manager secrets (ds-app-{name}/*)
#   4. Route53 records ({name}.digistratum.com)
#   5. DSAccount app registration (if DELETE endpoint exists)
#   6. GitHub repo (DigiStratum/ds-app-{name})
#
# SAFETY:
#   - Requires --force flag for actual deletion
#   - Use --dry-run to preview what would be deleted
#   - Handles missing resources gracefully (already deleted = success)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_ORG="DigiStratum"
ROUTE53_HOSTED_ZONE_ID="Z2HSQ1OB6HFLSJ"
DOMAIN_SUFFIX="digistratum.com"
AWS_REGION="us-west-2"

# Parse arguments
APP_SLUG=""
DRY_RUN=false
FORCE=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $arg${NC}"
            echo ""
            echo "Usage: $0 <app-slug> [--dry-run | --force]"
            exit 1
            ;;
        *)
            if [ -z "$APP_SLUG" ]; then
                APP_SLUG="$arg"
            else
                echo -e "${RED}Error: Unexpected argument $arg${NC}"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [ -z "$APP_SLUG" ]; then
    echo -e "${RED}Error: Missing app slug${NC}"
    echo ""
    echo "Usage: $0 <app-slug> [--dry-run | --force]"
    echo ""
    echo "Examples:"
    echo "  $0 hello3 --dry-run   # Preview what would be deleted"
    echo "  $0 hello3 --force     # Actually delete everything"
    exit 1
fi

if [ "$DRY_RUN" = false ] && [ "$FORCE" = false ]; then
    echo -e "${RED}Error: Must specify --dry-run or --force${NC}"
    echo ""
    echo "Usage: $0 <app-slug> [--dry-run | --force]"
    echo ""
    echo "Examples:"
    echo "  $0 $APP_SLUG --dry-run   # Preview what would be deleted"
    echo "  $0 $APP_SLUG --force     # Actually delete everything"
    exit 1
fi

if [ "$DRY_RUN" = true ] && [ "$FORCE" = true ]; then
    echo -e "${RED}Error: Cannot specify both --dry-run and --force${NC}"
    exit 1
fi

# Derived names
APP_NAME="ds-app-$APP_SLUG"
DOMAIN="$APP_SLUG.$DOMAIN_SUFFIX"
# CDK_STACK_NAME: e.g., "hello3" -> "DSAppHello3Stack"
CDK_STACK_NAME="DSApp$(echo "$APP_SLUG" | sed -E 's/(^|-)([a-z])/\U\2/g')Stack"
SECRET_NAME="$APP_NAME/dsaccount-app-secret"

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

if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq not installed${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites OK${NC}"
echo ""

# Summary
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}=== DRY RUN: Preview of resources to delete ===${NC}"
else
    echo -e "${RED}=== DESTRUCTIVE: The following will be PERMANENTLY DELETED ===${NC}"
fi
echo ""
echo "  App: $APP_NAME"
echo "  Domain: $DOMAIN"
echo "  Stack: $CDK_STACK_NAME"
echo "  Secret: $SECRET_NAME"
echo "  GitHub: $GITHUB_ORG/$APP_NAME"
echo ""

# Track what exists for deletion
RESOURCES_FOUND=0

# Helper function: action or preview
do_action() {
    local description="$1"
    local command="$2"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "  ${YELLOW}[WOULD]${NC} $description"
        return 0
    else
        echo -e "  ${BLUE}[DOING]${NC} $description"
        eval "$command"
        local result=$?
        if [ $result -eq 0 ]; then
            echo -e "  ${GREEN}[DONE]${NC} $description"
        fi
        return $result
    fi
}

# Step 1: CloudFormation/CDK Stack
echo -e "${BLUE}[1/6] CloudFormation Stack: $CDK_STACK_NAME${NC}"

STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" --region "$AWS_REGION" 2>/dev/null && echo "true" || echo "false")

if [ "$STACK_EXISTS" = "true" ]; then
    RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
    # Get stack resources for context
    if [ "$DRY_RUN" = true ]; then
        echo -e "  ${GREEN}Found${NC} - Stack exists"
        # Show some key resources
        aws cloudformation list-stack-resources --stack-name "$CDK_STACK_NAME" --region "$AWS_REGION" 2>/dev/null | \
            jq -r '.StackResourceSummaries[] | select(.ResourceType | contains("Bucket") or contains("Distribution") or contains("Function")) | "    - \(.ResourceType): \(.LogicalResourceId)"' 2>/dev/null || true
    fi
    
    # CDK destroy is best, but if we can't run CDK, use CloudFormation delete
    # First, try to find if there's a CDK app we can use
    # For now, use CloudFormation delete-stack which handles most cases
    do_action "Delete CloudFormation stack $CDK_STACK_NAME" \
        "aws cloudformation delete-stack --stack-name '$CDK_STACK_NAME' --region '$AWS_REGION' && \
         echo '    Waiting for stack deletion (this may take several minutes)...' && \
         aws cloudformation wait stack-delete-complete --stack-name '$CDK_STACK_NAME' --region '$AWS_REGION' 2>/dev/null || true"
else
    echo -e "  ${YELLOW}Not found${NC} - Stack does not exist (skipping)"
fi

# Step 2: S3 Bucket
echo ""
echo -e "${BLUE}[2/6] S3 Bucket${NC}"

# The bucket name pattern from CDK is: dsapp{slug}bucket{suffix} (no hyphens in slug part)
# e.g., for app "hello3" -> dsapphello3bucket12345678
# We also check for ds-app-{slug} prefix pattern
# IMPORTANT: Use shell-side filtering to avoid jq/JMESPath shell expansion issues

APP_SLUG_NOHYPHENS=$(echo "$APP_SLUG" | tr -d '-')

# Get all bucket names, then filter in shell
ALL_BUCKETS=$(aws s3api list-buckets --query "Buckets[].Name" --output text 2>/dev/null || echo "")
BUCKETS=""
for bucket in $ALL_BUCKETS; do
    # Match: dsapp{slug}bucket* OR ds-app-{slug}-* OR ds-app-{slug}
    if [[ "$bucket" == dsapp${APP_SLUG_NOHYPHENS}bucket* ]] || \
       [[ "$bucket" == ds-app-${APP_SLUG}-* ]] || \
       [[ "$bucket" == ds-app-${APP_SLUG} ]]; then
        BUCKETS="$BUCKETS $bucket"
    fi
done
BUCKETS=$(echo "$BUCKETS" | xargs)  # trim whitespace

if [ -n "$BUCKETS" ] && [ "$BUCKETS" != "None" ]; then
    for BUCKET in $BUCKETS; do
        RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
        echo -e "  ${GREEN}Found${NC} - Bucket: $BUCKET"
        
        if [ "$DRY_RUN" = false ]; then
            # Empty the bucket first (required before deletion)
            echo -e "  ${BLUE}[DOING]${NC} Empty bucket $BUCKET"
            aws s3 rm "s3://$BUCKET" --recursive --region "$AWS_REGION" 2>/dev/null || true
            
            # Delete bucket versioning objects if versioned
            aws s3api list-object-versions --bucket "$BUCKET" --query 'Versions[].{Key:Key,VersionId:VersionId}' --output json 2>/dev/null | \
                jq -r '.[] | "--key \"\(.Key)\" --version-id \"\(.VersionId)\""' 2>/dev/null | \
                while read -r line; do
                    eval "aws s3api delete-object --bucket '$BUCKET' $line" 2>/dev/null || true
                done
            
            # Delete delete markers if any
            aws s3api list-object-versions --bucket "$BUCKET" --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' --output json 2>/dev/null | \
                jq -r '.[] | "--key \"\(.Key)\" --version-id \"\(.VersionId)\""' 2>/dev/null | \
                while read -r line; do
                    eval "aws s3api delete-object --bucket '$BUCKET' $line" 2>/dev/null || true
                done
            
            echo -e "  ${BLUE}[DOING]${NC} Delete bucket $BUCKET"
            aws s3api delete-bucket --bucket "$BUCKET" --region "$AWS_REGION" 2>/dev/null || true
            echo -e "  ${GREEN}[DONE]${NC} Bucket $BUCKET deleted"
        else
            echo -e "  ${YELLOW}[WOULD]${NC} Empty and delete bucket $BUCKET"
        fi
    done
else
    echo -e "  ${YELLOW}Not found${NC} - No matching buckets (skipping)"
fi

# Step 3: Secrets Manager
echo ""
echo -e "${BLUE}[3/6] Secrets Manager: $SECRET_NAME${NC}"

SECRET_EXISTS=$(aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" 2>/dev/null && echo "true" || echo "false")

if [ "$SECRET_EXISTS" = "true" ]; then
    RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
    echo -e "  ${GREEN}Found${NC} - Secret exists"
    
    do_action "Delete secret $SECRET_NAME (force, no recovery)" \
        "aws secretsmanager delete-secret --secret-id '$SECRET_NAME' --force-delete-without-recovery --region '$AWS_REGION'"
else
    echo -e "  ${YELLOW}Not found${NC} - Secret does not exist (skipping)"
fi

# Also check for any other secrets with the app name prefix
OTHER_SECRETS=$(aws secretsmanager list-secrets --region "$AWS_REGION" --query "SecretList[?contains(Name, '$APP_NAME/')].Name" --output text 2>/dev/null || echo "")

if [ -n "$OTHER_SECRETS" ] && [ "$OTHER_SECRETS" != "None" ]; then
    for SECRET in $OTHER_SECRETS; do
        if [ "$SECRET" != "$SECRET_NAME" ]; then
            RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
            echo -e "  ${GREEN}Found${NC} - Additional secret: $SECRET"
            do_action "Delete secret $SECRET" \
                "aws secretsmanager delete-secret --secret-id '$SECRET' --force-delete-without-recovery --region '$AWS_REGION'"
        fi
    done
fi

# Step 4: Route53 Records
echo ""
echo -e "${BLUE}[4/6] Route53 Records: $DOMAIN${NC}"

# Get all record sets for this domain
RECORD_SETS=$(aws route53 list-resource-record-sets --hosted-zone-id "$ROUTE53_HOSTED_ZONE_ID" \
    --query "ResourceRecordSets[?contains(Name, '$DOMAIN')]" --output json 2>/dev/null || echo "[]")

RECORD_COUNT=$(echo "$RECORD_SETS" | jq 'length')

if [ "$RECORD_COUNT" -gt 0 ]; then
    RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
    echo -e "  ${GREEN}Found${NC} - $RECORD_COUNT record(s)"
    
    if [ "$DRY_RUN" = true ]; then
        echo "$RECORD_SETS" | jq -r '.[] | "    - \(.Type): \(.Name)"'
    else
        # Build change batch for deletion
        CHANGE_BATCH=$(echo "$RECORD_SETS" | jq '{
            Changes: [.[] | {
                Action: "DELETE",
                ResourceRecordSet: .
            }]
        }')
        
        echo -e "  ${BLUE}[DOING]${NC} Delete Route53 records"
        aws route53 change-resource-record-sets \
            --hosted-zone-id "$ROUTE53_HOSTED_ZONE_ID" \
            --change-batch "$CHANGE_BATCH" 2>/dev/null || true
        echo -e "  ${GREEN}[DONE]${NC} Route53 records deleted"
    fi
else
    echo -e "  ${YELLOW}Not found${NC} - No matching records (skipping)"
fi

# Step 5: DSAccount App Registration
echo ""
echo -e "${BLUE}[5/6] DSAccount App Registration: $APP_SLUG${NC}"

# Auto-source credentials if available
DSACCOUNT_CREDENTIALS_FILE="$HOME/.openclaw/workspace/dsaccount-admin-credentials.env"
if [ -f "$DSACCOUNT_CREDENTIALS_FILE" ] && [ -z "$DSACCOUNT_ADMIN_TOKEN" ]; then
    source "$DSACCOUNT_CREDENTIALS_FILE"
fi

# Check if DSAccount API endpoint exists and has DELETE support
DSACCOUNT_API_URL="${DSACCOUNT_API_URL:-https://account.digistratum.com}"

if [ -n "$DSACCOUNT_ADMIN_TOKEN" ]; then
    # Try to check if the app exists
    APP_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $DSACCOUNT_ADMIN_TOKEN" \
        "$DSACCOUNT_API_URL/api/admin/apps/$APP_SLUG" 2>/dev/null || echo "000")
    
    if [ "$APP_EXISTS" = "200" ]; then
        RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
        echo -e "  ${GREEN}Found${NC} - App registered in DSAccount"
        
        if [ "$DRY_RUN" = true ]; then
            echo -e "  ${YELLOW}[WOULD]${NC} DELETE $DSACCOUNT_API_URL/api/admin/apps/$APP_SLUG"
        else
            echo -e "  ${BLUE}[DOING]${NC} Delete app from DSAccount"
            DELETE_RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
                -H "Authorization: Bearer $DSACCOUNT_ADMIN_TOKEN" \
                "$DSACCOUNT_API_URL/api/admin/apps/$APP_SLUG" 2>/dev/null || echo "000")
            
            if [ "$DELETE_RESULT" = "200" ] || [ "$DELETE_RESULT" = "204" ]; then
                echo -e "  ${GREEN}[DONE]${NC} App deleted from DSAccount"
            elif [ "$DELETE_RESULT" = "404" ]; then
                echo -e "  ${YELLOW}[SKIP]${NC} App not found (already deleted)"
            elif [ "$DELETE_RESULT" = "405" ]; then
                echo -e "  ${YELLOW}[SKIP]${NC} DELETE not supported by DSAccount API"
            else
                echo -e "  ${YELLOW}[WARN]${NC} DSAccount returned HTTP $DELETE_RESULT"
            fi
        fi
    elif [ "$APP_EXISTS" = "404" ]; then
        echo -e "  ${YELLOW}Not found${NC} - App not registered (skipping)"
    else
        echo -e "  ${YELLOW}Skip${NC} - Could not check DSAccount (HTTP $APP_EXISTS)"
    fi
else
    echo -e "  ${YELLOW}Skip${NC} - DSACCOUNT_ADMIN_TOKEN not set"
fi

# Step 6: GitHub Repository
echo ""
echo -e "${BLUE}[6/6] GitHub Repository: $GITHUB_ORG/$APP_NAME${NC}"

if gh repo view "$GITHUB_ORG/$APP_NAME" &> /dev/null; then
    RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
    echo -e "  ${GREEN}Found${NC} - Repository exists"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "  ${YELLOW}[WOULD]${NC} Delete repository $GITHUB_ORG/$APP_NAME"
    else
        echo -e "  ${BLUE}[DOING]${NC} Delete repository $GITHUB_ORG/$APP_NAME"
        gh repo delete "$GITHUB_ORG/$APP_NAME" --yes
        echo -e "  ${GREEN}[DONE]${NC} Repository deleted"
    fi
else
    echo -e "  ${YELLOW}Not found${NC} - Repository does not exist (skipping)"
fi

# Summary
echo ""
echo "════════════════════════════════════════════"

if [ "$DRY_RUN" = true ]; then
    if [ $RESOURCES_FOUND -eq 0 ]; then
        echo -e "${YELLOW}No resources found for $APP_NAME${NC}"
        echo "The app may already be deleted or never existed."
    else
        echo -e "${YELLOW}DRY RUN COMPLETE${NC}"
        echo ""
        echo "Found $RESOURCES_FOUND resource(s) to delete."
        echo ""
        echo "To actually delete, run:"
        echo -e "  ${RED}$0 $APP_SLUG --force${NC}"
    fi
else
    if [ $RESOURCES_FOUND -eq 0 ]; then
        echo -e "${YELLOW}No resources found for $APP_NAME${NC}"
        echo "The app may already be deleted or never existed."
    else
        echo -e "${GREEN}✓ DESTRUCTION COMPLETE: $APP_NAME${NC}"
        echo ""
        echo "Deleted resources for: $APP_NAME"
        echo ""
        echo "Note: CloudFront distributions may take up to 15 minutes"
        echo "to fully propagate the deletion."
    fi
fi
echo "════════════════════════════════════════════"
