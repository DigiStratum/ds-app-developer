# Service Discovery & Manifest Registration

This document describes how DigiStratum applications register their service manifests with DSAccount for service discovery.

## Overview

Every DS app can expose:
- **Frontend Routes**: UI pages/routes available to users
- **Backend Resources**: API endpoints available to other services
- **Dependencies**: Other DS apps this app depends on

This information is registered with DSAccount post-deploy, enabling:
- Service discovery (find which app provides a resource)
- Dependency graphing (visualize app relationships)
- Health monitoring (track app versions and health endpoints)
- Portal integration (show available apps in user dashboards)

## Quick Start

### 1. Create a manifest.json

In your app root, create `manifest.json`:

```json
{
  "frontendRoutes": [
    {
      "path": "/dashboard",
      "name": "Dashboard",
      "description": "Main dashboard view",
      "authRequired": true
    }
  ],
  "backendResources": [
    {
      "name": "items.list",
      "path": "/api/items",
      "methods": ["GET"],
      "description": "List all items",
      "authType": "jwt"
    },
    {
      "name": "items.create",
      "path": "/api/items",
      "methods": ["POST"],
      "description": "Create a new item",
      "authType": "jwt"
    }
  ],
  "dependencies": [
    {
      "appId": "dsaccount",
      "resourceName": "sso.authorize",
      "required": true
    }
  ]
}
```

### 2. Register Post-Deploy

#### Option A: CDK Construct (Recommended)

Add the `ManifestRegistration` construct to your CDK stack:

```typescript
import { ManifestRegistration } from '@digistratum/cdk-constructs';
import * as manifest from '../manifest.json';

// In your stack constructor:
new ManifestRegistration(this, 'Manifest', {
  dsAccountUrl: 'https://account.digistratum.com',
  appId: 'myapp',
  appSecretArn: 'arn:aws:secretsmanager:us-west-2:123456789:secret:myapp/dsaccount-secret',
  version: require('../package.json').version,
  healthCheckUrl: `https://${props.domainName}/health`,
  frontendRoutes: manifest.frontendRoutes,
  backendResources: manifest.backendResources,
  dependencies: manifest.dependencies,
});
```

This creates a CloudFormation CustomResource that automatically registers on every deploy.

#### Option B: Shell Script (GitHub Actions)

Add to your deploy workflow:

```yaml
- name: Register manifest with DSAccount
  run: ./scripts/register-manifest.sh
  env:
    DSACCOUNT_URL: https://account.digistratum.com
    DSACCOUNT_APP_ID: myapp
    DSACCOUNT_APP_SECRET_ARN: myapp/dsaccount-secret
    HEALTH_CHECK_URL: https://myapp.digistratum.com/health
    CDK_STACK_NAME: MyAppStack
```

#### Option C: Direct API Call

```bash
curl -X POST "https://account.digistratum.com/api/apps/myapp/manifest" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $APP_SECRET" \
  -d '{
    "version": "1.2.3",
    "health_check_url": "https://myapp.digistratum.com/health",
    "cdk_stack": "MyAppStack",
    "frontend_routes": [...],
    "backend_resources": [...],
    "dependencies": [...]
  }'
```

## Manifest Schema

### FrontendRoute

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Route path (e.g., `/dashboard`) |
| `name` | string | Yes | Human-readable name |
| `description` | string | No | Optional description |
| `authRequired` | boolean | Yes | Whether auth is required |

### BackendResource

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Canonical name (e.g., `items.list`) |
| `path` | string | Yes | API path (e.g., `/api/items`) |
| `methods` | string[] | Yes | HTTP methods (`GET`, `POST`, etc.) |
| `description` | string | No | Optional description |
| `authType` | string | No | Auth type: `none`, `api_key`, `jwt`, `sso` |

### AppDependency

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `appId` | string | Yes | Target app ID |
| `resourceName` | string | Yes | Canonical resource name |
| `required` | boolean | Yes | Is this required for operation? |

## Resource Naming Convention

Backend resources use a `category.action` naming pattern:

```
items.list      - List items
items.get       - Get a single item
items.create    - Create an item
items.update    - Update an item
items.delete    - Delete an item
auth.validate   - Validate authentication
sso.authorize   - SSO authorization endpoint
```

This enables service discovery queries like:
```bash
curl "https://account.digistratum.com/api/discovery/resource/items.list"
# Returns: { "app_id": "myapp", "url": "https://myapp.digistratum.com", "resource": {...} }
```

## Authentication

Manifest registration requires the app's DSAccount secret in the `X-API-Key` header.

### Setting Up the Secret

1. Register your app with DSAccount (via admin API or portal)
2. DSAccount generates an app ID and secret
3. Store the secret in AWS Secrets Manager:
   ```bash
   aws secretsmanager create-secret \
     --name myapp/dsaccount-app-secret \
     --secret-string "your-app-secret"
   ```
4. Reference the ARN in your CDK/workflow

### Security Best Practices

- **Never commit secrets** to source control
- Store in AWS Secrets Manager
- Use IAM roles for access (OIDC in GitHub Actions)
- Rotate secrets periodically

## API Reference

### POST /api/apps/:id/manifest

Register or update an app's manifest.

**Request:**
```json
{
  "version": "1.2.3",
  "health_check_url": "https://myapp.example.com/health",
  "cdk_stack": "MyAppStack",
  "cdk_data_stack": "MyAppDataStack",
  "frontend_routes": [...],
  "backend_resources": [...],
  "dependencies": [...]
}
```

**Response:**
```json
{
  "success": true,
  "app_id": "myapp",
  "version": "1.2.3",
  "resources_registered": 5,
  "routes_registered": 3,
  "message": "Manifest registered successfully"
}
```

### GET /api/apps/:id/manifest

Retrieve an app's manifest (public, no auth required).

### GET /api/discovery/resource/:name

Find a resource by canonical name across all apps.

## Troubleshooting

### Common Errors

**401 Unauthorized: X-API-Key header required**
- Ensure you're passing the `X-API-Key` header
- Verify the app secret is correct

**401 Unauthorized: Invalid API key**
- The app secret doesn't match DSAccount records
- Check if the secret was rotated

**404 Not Found: Invalid app_id**
- The app ID doesn't exist in DSAccount
- Register the app first via admin API

### Debugging

Enable verbose output in the registration script:
```bash
DEBUG=1 ./scripts/register-manifest.sh
```

Check Lambda logs for CDK CustomResource:
```bash
aws logs tail /aws/lambda/myapp-manifest-registration --follow
```

## Integration with CI/CD

The registration step should run **after successful deployment validation**:

```
Build → Deploy → Health Check → Promote → Register Manifest
                       ↓
                   Rollback (on failure, skip registration)
```

This ensures we only register the manifest for successfully deployed versions.
