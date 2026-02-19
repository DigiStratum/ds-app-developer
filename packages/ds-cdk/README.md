# @digistratum/ds-cdk

Reusable AWS CDK constructs for DigiStratum applications.

## Installation

```bash
npm install @digistratum/ds-cdk
```

Note: Requires `aws-cdk-lib` and `constructs` as peer dependencies.

## Constructs

### ApiLambda

Creates a Lambda function with HTTP API Gateway v2 and CORS support. Optimized for Go on ARM64 by default.

```typescript
import { ApiLambda } from '@digistratum/ds-cdk';
import * as path from 'path';

const api = new ApiLambda(this, 'Api', {
  appName: 'myapp',
  environment: 'prod',
  codePath: path.join(__dirname, '../backend/dist'),
  corsAllowOrigins: ['https://myapp.example.com'],
  environmentVariables: {
    TABLE_NAME: table.tableName,
  },
});

// Grant table access
table.grantReadWriteData(api.function);

// Access the API endpoint
console.log(api.apiEndpoint);
```

**Features:**
- Go/ARM64 optimized by default (fastest cold starts)
- HTTP API v2 with proxy integration
- Configurable CORS
- Standard environment variables (ENVIRONMENT, APP_NAME)
- X-Ray tracing (enabled in prod by default)
- Automatic standard tagging

### DataTable

Creates a DynamoDB table with single-table design patterns.

```typescript
import { DataTable } from '@digistratum/ds-cdk';

const table = new DataTable(this, 'Data', {
  appName: 'myapp',
  environment: 'prod',
  gsiCount: 2,
  enableStream: true,
});

// Grant access
table.grantReadWriteData(myLambda);
```

**Features:**
- Single-table design with PK/SK
- Configurable GSIs (GSI1PK/GSI1SK, GSI2PK/GSI2SK, etc.)
- TTL attribute
- Point-in-time recovery (prod/staging by default)
- DynamoDB Streams support
- Automatic standard tagging

### SpaHosting

Creates S3 + CloudFront distribution for SPA hosting.

```typescript
import { SpaHosting } from '@digistratum/ds-cdk';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

const frontend = new SpaHosting(this, 'Frontend', {
  appName: 'myapp',
  environment: 'prod',
  domainName: 'myapp.example.com',
  certificate: myCertificate,
  apiOrigin: new origins.HttpOrigin(api.apiDomain),
  apiPaths: ['/api/*', '/auth/*'],
});

console.log(frontend.url);
```

**Features:**
- Private S3 bucket with Origin Access Control
- SPA URL rewriting via CloudFront Function
- API/auth route passthrough to backend
- Custom domain support
- Automatic error page handling (404 → index.html)
- Automatic standard tagging

## Utilities

### Standard Naming

Generate consistent resource names across your stack:

```typescript
import { resourceName } from '@digistratum/ds-cdk';

const name = resourceName({
  appName: 'myapp',
  environment: 'prod',
  resourceType: 'api',
});
// => 'myapp-api-prod'

// Include account ID for globally unique names (e.g., S3 buckets)
const bucketName = resourceName(
  {
    appName: 'myapp',
    environment: 'prod',
    resourceType: 'assets',
    includeAccount: true,
  },
  this // scope required for account lookup
);
// => 'myapp-assets-prod-123456789012'
```

### Standard Tagging

Apply consistent tags across resources:

```typescript
import { applyStandardTags, TagKeys } from '@digistratum/ds-cdk';

// Apply to a construct and all its children
applyStandardTags(myStack, {
  appName: 'myapp',
  environment: 'prod',
  costCenter: 'engineering',
  owner: 'platform-team',
  additionalTags: {
    'custom-tag': 'value',
  },
});

// Standard tag keys
// TagKeys.APP_NAME      => 'ds:app-name'
// TagKeys.ENVIRONMENT   => 'ds:environment'
// TagKeys.MANAGED_BY    => 'ds:managed-by'
// TagKeys.COST_CENTER   => 'ds:cost-center'
// TagKeys.OWNER         => 'ds:owner'
```

### Environment Helpers

```typescript
import {
  isProdEnvironment,
  isStagingEnvironment,
  getRemovalPolicy,
} from '@digistratum/ds-cdk';

if (isProdEnvironment(environment)) {
  // Production-specific settings
}

// Get appropriate removal policy
const policy = getRemovalPolicy(environment);
// => RemovalPolicy.RETAIN for prod, DESTROY otherwise
```

## Base Properties

All constructs extend `BaseConstructProps`:

```typescript
interface BaseConstructProps {
  appName: string;           // Application name
  environment: string;       // Environment (dev, staging, prod)
  costCenter?: string;       // Cost allocation tag
  owner?: string;           // Owner/team tag
  additionalTags?: Record<string, string>;
  applyTags?: boolean;      // Default: true
}
```

## Full Example

```typescript
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import {
  ApiLambda,
  DataTable,
  SpaHosting,
  applyStandardTags,
} from '@digistratum/ds-cdk';
import * as path from 'path';

export class MyAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const appName = 'myapp';
    const environment = 'prod';

    // Apply tags to entire stack
    applyStandardTags(this, {
      appName,
      environment,
      costCenter: 'product',
      owner: 'backend-team',
    });

    // Database
    const table = new DataTable(this, 'Data', {
      appName,
      environment,
      gsiCount: 2,
    });

    // API
    const api = new ApiLambda(this, 'Api', {
      appName,
      environment,
      codePath: path.join(__dirname, '../backend/dist'),
      corsAllowOrigins: ['https://myapp.example.com'],
      environmentVariables: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(api.function);

    // Frontend
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Cert',
      'arn:aws:acm:us-east-1:...'
    );

    const frontend = new SpaHosting(this, 'Frontend', {
      appName,
      environment,
      domainName: 'myapp.example.com',
      certificate,
      apiOrigin: new origins.HttpOrigin(api.apiDomain),
      apiPaths: ['/api/*'],
    });
  }
}
```

## Publishing

This package is published to GitHub Packages. To use it:

1. Create a `.npmrc` file:
   ```
   @digistratum:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

2. Install:
   ```bash
   npm install @digistratum/ds-cdk
   ```

## License

MIT
