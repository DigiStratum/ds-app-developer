#!/bin/bash
# register-manifest.sh - Register app infrastructure manifest with the registry
#
# Usage: ./scripts/register-manifest.sh [stack-name]
#
# Collects CDK outputs and pushes infrastructure manifest to DSAccount.
# Run after successful CDK deploy.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Determine stack name
if [ -n "$1" ]; then
    STACK_NAME="$1"
else
    # Try to detect from cdk.json or default
    STACK_NAME=$(cd "$REPO_ROOT/cdk" && npx cdk list 2>/dev/null | head -1 || echo "")
    if [ -z "$STACK_NAME" ]; then
        echo -e "${RED}Error: Could not determine stack name. Pass it as argument.${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}Collecting CDK outputs for stack: $STACK_NAME${NC}"

# Get all outputs from CloudFormation
OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs' --output json 2>/dev/null)

if [ -z "$OUTPUTS" ] || [ "$OUTPUTS" = "null" ]; then
    echo -e "${RED}Error: Could not get outputs for stack $STACK_NAME${NC}"
    exit 1
fi

# Extract values from outputs
get_output() {
    echo "$OUTPUTS" | jq -r ".[] | select(.OutputKey==\"$1\") | .OutputValue // empty"
}

DOMAIN=$(get_output "AppDomain")
ACCOUNT=$(get_output "AwsAccount")
REGION=$(get_output "AwsRegion")

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: AppDomain output not found${NC}"
    exit 1
fi

# Extract subdomain as app_id (e.g., hello4.leapkick.com -> hello4)
APP_ID="${DOMAIN%%.*}"

echo -e "${BLUE}Building manifest for: $DOMAIN (app_id: $APP_ID)${NC}"

# Build the infrastructure manifest JSON
INFRA_MANIFEST=$(cat <<MANIFEST_EOF
{
  "infrastructure": {
    "aws": {
      "account": "$ACCOUNT",
      "region": "$REGION"
    },
    "dynamodb": {
      "name": "$(get_output 'DynamoTableName')",
      "arn": "$(get_output 'DynamoTableArn')"
    },
    "lambda": {
      "api": {
        "name": "$(get_output 'LambdaFunctionName')",
        "arn": "$(get_output 'LambdaFunctionArn')"
      }
    },
    "apigateway": {
      "id": "$(get_output 'ApiGatewayId')",
      "arn": "$(get_output 'ApiGatewayArn')",
      "endpoint": "$(get_output 'ApiGatewayEndpoint')"
    },
    "s3": {
      "frontend": {
        "name": "$(get_output 'FrontendBucketName')",
        "arn": "$(get_output 'FrontendBucketArn')"
      }
    },
    "cloudfront": {
      "id": "$(get_output 'DistributionId')",
      "arn": "$(get_output 'DistributionArn')",
      "domain": "$(get_output 'DistributionDomain')"
    },
    "acm": {
      "arn": "$(get_output 'CertificateArn')"
    },
    "logs": {
      "api": {
        "name": "$(get_output 'LogGroupName')",
        "arn": "$(get_output 'LogGroupArn')"
      }
    }
  }
}
MANIFEST_EOF
)

# Pretty print for verification
echo -e "${BLUE}Generated infrastructure manifest:${NC}"
echo "$INFRA_MANIFEST" | jq .

# Determine account URL from ecosystem config
APEX="${DOMAIN#*.}"
ECOSYSTEM_FILE="$REPO_ROOT/ecosystems/$APEX.json"

if [ -f "$ECOSYSTEM_FILE" ]; then
    ACCOUNT_URL=$(jq -r '.services.account // empty' "$ECOSYSTEM_FILE")
else
    # Fallback: try to find ecosystem by checking all configs
    for f in "$REPO_ROOT/ecosystems"/*.json; do
        [ -f "$f" ] || continue
        [[ "$(basename "$f")" == "ecosystem.schema.json" ]] && continue
        ECOSYSTEM_APEX=$(jq -r '.apex' "$f")
        if [ "$ECOSYSTEM_APEX" = "$APEX" ]; then
            ACCOUNT_URL=$(jq -r '.services.account // empty' "$f")
            break
        fi
    done
fi

if [ -z "$ACCOUNT_URL" ]; then
    echo -e "${RED}Warning: Could not determine account URL${NC}"
    echo "Manifest saved locally but not registered."
    
    # Save locally as fallback
    MANIFEST_FILE="$REPO_ROOT/infrastructure-manifest.json"
    echo "$INFRA_MANIFEST" | jq . > "$MANIFEST_FILE"
    echo -e "${GREEN}Saved to: $MANIFEST_FILE${NC}"
    exit 0
fi

# Get app secret from AWS Secrets Manager
RESOURCE_PREFIX="${DOMAIN//./-}"
SECRET_NAME="$RESOURCE_PREFIX/dsaccount-app-secret"
APP_SECRET=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --query SecretString --output text 2>/dev/null || echo "")

if [ -z "$APP_SECRET" ]; then
    echo -e "${RED}Warning: Could not retrieve app secret from $SECRET_NAME${NC}"
    echo "Manifest saved locally but not registered."
    
    MANIFEST_FILE="$REPO_ROOT/infrastructure-manifest.json"
    echo "$INFRA_MANIFEST" | jq . > "$MANIFEST_FILE"
    echo -e "${GREEN}Saved to: $MANIFEST_FILE${NC}"
    exit 0
fi

# Push to DSAccount
echo -e "${BLUE}Registering with: $ACCOUNT_URL/api/apps/$APP_ID/manifest${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
    "$ACCOUNT_URL/api/apps/$APP_ID/manifest" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $APP_SECRET" \
    -d "$INFRA_MANIFEST" 2>/dev/null)

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ] || [ "$HTTP_STATUS" = "204" ]; then
    echo -e "${GREEN}✅ Infrastructure manifest registered successfully${NC}"
    echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
else
    echo -e "${RED}⚠️  DSAccount returned HTTP $HTTP_STATUS${NC}"
    echo "$RESPONSE_BODY"
    
    # Save locally as fallback
    MANIFEST_FILE="$REPO_ROOT/infrastructure-manifest.json"
    echo "$INFRA_MANIFEST" | jq . > "$MANIFEST_FILE"
    echo -e "${GREEN}Saved locally to: $MANIFEST_FILE${NC}"
fi
