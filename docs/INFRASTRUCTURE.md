# Infrastructure as Code Standards - DS App Skeleton

> Canonical IaC patterns for all DigiStratum applications.
> Uses AWS CDK (TypeScript) for infrastructure definition.
> Applications based on ds-app-skeleton inherit these patterns.

---

## Table of Contents
1. [Overview](#overview)
2. [Environment Separation](#environment-separation)
3. [CDK Patterns by Service](#cdk-patterns-by-service)
4. [Reusable Constructs](#reusable-constructs)
5. [Security Patterns](#security-patterns)
6. [Deployment Patterns](#deployment-patterns)
7. [Naming Conventions](#naming-conventions)

---

## Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CloudFront                                │
│              (CDN, SSL termination, routing)                     │
├─────────────────────────────────────────────────────────────────┤
│            │                                │                    │
│       S3 Bucket                      API Gateway                 │
│    (Static Frontend)              (HTTP API v2)                  │
│            │                                │                    │
│            │                         Lambda Function             │
│            │                         (Go, ARM64)                 │
│            │                                │                    │
│            │                         DynamoDB                    │
│            │                      (Single-table)                 │
│            │                                │                    │
│            │                      Secrets Manager                │
│            │                     (JWT, SSO secrets)              │
└─────────────────────────────────────────────────────────────────┘
                                      │
                              Route53 (DNS)
                              ACM (Certificates)
```

### CDK Project Structure

```
cdk/
├── bin/
│   └── app.ts              # CDK app entry point
├── lib/
│   ├── skeleton-stack.ts   # Main application stack
│   ├── constructs/         # Reusable L2/L3 constructs
│   │   ├── api-lambda.ts
│   │   ├── spa-hosting.ts
│   │   └── index.ts
│   └── edge-functions/     # CloudFront Functions
│       └── spa-rewrite.js
├── cdk.json
├── package.json
└── tsconfig.json
```

### Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| IaC Tool | AWS CDK (TypeScript) | Type safety, reusable constructs, imperative logic |
| API Gateway | HTTP API v2 | Lower latency, lower cost, simpler CORS |
| Compute | Lambda (ARM64) | Serverless, ARM for cost savings |
| Runtime | provided.al2023 | Go custom runtime, latest Amazon Linux |
| Database | DynamoDB | Serverless, single-table design, multi-tenant ready |
| CDN | CloudFront | Global edge, caching, HTTPS |
| DNS | Route53 | Native AWS integration |
| Secrets | Secrets Manager | Automatic rotation capability |

---

## Environment Separation

### Environment Types

| Environment | Purpose | Data | Cost Profile |
|-------------|---------|------|--------------|
| `dev` | Development, testing | Synthetic | Minimal |
| `staging` | Pre-production validation | Anonymized production | Moderate |
| `prod` | Production workloads | Real user data | Full |

### Stack Naming Convention

```typescript
// Pattern: {AppName}-{Environment}
new AppStack(app, `DSAppSkeleton-${environment}`, { ... });

// Results in:
// - DSAppSkeleton-dev
// - DSAppSkeleton-staging  
// - DSAppSkeleton-prod
```

### Environment-Specific Configuration

```typescript
interface StackConfig {
  environment: 'dev' | 'staging' | 'prod';
  domainName: string;
  hostedZoneId: string;
  dsAccountUrl: string;
}

// Environment detection
const environment = app.node.tryGetContext('env') || 'dev';
const isProd = environment === 'prod';
const isStaging = environment === 'staging';

// Deploy with: cdk deploy -c env=prod
```

### Environment-Specific Defaults

```typescript
// DynamoDB
removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
pointInTimeRecovery: isProd || isStaging,

// S3
autoDeleteObjects: !isProd,
removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,

// Lambda
memorySize: isProd ? 512 : 256,
reservedConcurrentExecutions: isProd ? undefined : 10,

// API Gateway
throttlingBurstLimit: isProd ? 200 : 50,
throttlingRateLimit: isProd ? 100 : 20,
```

### Domain Naming

```typescript
// Pattern: {app}.digistratum.com (prod)
//          {app}-{env}.digistratum.com (non-prod)

const domainName = isProd 
  ? 'skeleton.digistratum.com'
  : `skeleton-${environment}.digistratum.com`;
```

---

## CDK Patterns by Service

### Lambda Functions

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';

const apiHandler = new lambda.Function(this, 'ApiHandler', {
  // Naming: {app}-{purpose}-{env}
  functionName: `${appName}-api-${environment}`,
  
  // Runtime: Go custom runtime on ARM64
  runtime: lambda.Runtime.PROVIDED_AL2023,
  handler: 'bootstrap',
  architecture: lambda.Architecture.ARM_64,
  
  // Code location
  code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
  
  // Resources
  memorySize: isProd ? 512 : 256,
  timeout: cdk.Duration.seconds(30),
  
  // Environment variables (non-sensitive)
  environment: {
    ENVIRONMENT: environment,
    DYNAMODB_TABLE: table.tableName,
    APP_URL: `https://${domainName}`,
  },
});
```

**Key Patterns:**
- Always use ARM64 for cost optimization (~20% savings)
- Use `provided.al2023` for Go (latest Amazon Linux)
- Configure environment variables for non-sensitive config
- Set appropriate timeouts (30s for API, longer for async)
- Use least-privilege IAM (grant* methods)

### API Gateway (HTTP API v2)

```typescript
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

const httpApi = new apigateway.HttpApi(this, 'HttpApi', {
  apiName: `${appName}-api-${environment}`,
  
  // CORS configuration [NFR-SEC-005]
  corsPreflight: {
    allowOrigins: [`https://${domainName}`],
    allowMethods: [apigateway.CorsHttpMethod.ANY],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    allowCredentials: true,
  },
});

// Proxy all to Lambda
httpApi.addRoutes({
  path: '/{proxy+}',
  methods: [apigateway.HttpMethod.ANY],
  integration: new integrations.HttpLambdaIntegration('LambdaIntegration', apiHandler),
});
```

**Key Patterns:**
- Prefer HTTP API v2 over REST API (lower latency, cost)
- Configure CORS at API Gateway level
- Use catch-all proxy route for Lambda-based routing
- No API keys needed when behind CloudFront

### DynamoDB

```typescript
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const table = new dynamodb.Table(this, 'Table', {
  // Naming: {app}-{env}
  tableName: `${appName}-${environment}`,
  
  // Single-table design [FR-TENANT-003]
  partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
  
  // Serverless billing
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  
  // Environment-specific settings
  removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
  pointInTimeRecovery: isProd || isStaging,
  
  // TTL for session cleanup
  timeToLiveAttribute: 'TTL',
});

// GSI for additional access patterns
table.addGlobalSecondaryIndex({
  indexName: 'GSI1',
  partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL,
});

// Grant access to Lambda
table.grantReadWriteData(apiHandler);
```

**Key Patterns:**
- Single-table design with PK/SK for multi-tenant data
- PAY_PER_REQUEST billing (scales to zero)
- RETAIN policy in production (data protection)
- GSI for alternative access patterns
- TTL for automatic cleanup of temporary data

### S3 (Frontend Hosting)

```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';

const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
  // Naming: {app}-frontend-{env}-{account}
  bucketName: `${appName}-frontend-${environment}-${this.account}`,
  
  // Security: No public access (CloudFront OAC instead)
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  
  // Environment-specific
  removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: !isProd,
});
```

**Key Patterns:**
- Block all public access (serve via CloudFront only)
- Include account ID in bucket name for uniqueness
- Auto-delete objects in dev for easy cleanup

### CloudFront

```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

const distribution = new cloudfront.Distribution(this, 'Distribution', {
  comment: `${appName} ${environment}`,
  
  // Default: S3 static content
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    functionAssociations: [{
      function: spaRewriteFunction,
      eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
    }],
  },
  
  // API routes: No caching, proxy all headers
  additionalBehaviors: {
    '/api/*': {
      origin: new origins.HttpOrigin(`${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    },
    '/auth/*': {
      // Same as /api/* for auth endpoints
    },
    '/health': {
      origin: new origins.HttpOrigin(`${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
    },
  },
  
  // SPA configuration
  defaultRootObject: 'index.html',
  errorResponses: [{
    httpStatus: 404,
    responseHttpStatus: 200,
    responsePagePath: '/index.html',
    ttl: cdk.Duration.seconds(0),
  }],
  
  // Custom domain
  domainNames: [domainName],
  certificate,
});
```

**Key Patterns:**
- Use Origin Access Control (OAC) for S3 (not OAI)
- Disable caching for API routes
- Forward all headers except Host for API
- 404 → index.html for SPA routing
- CloudFront Function for SPA URL rewriting

### CloudFront Functions (Edge)

```javascript
// cdk/lib/edge-functions/spa-rewrite.js
// CloudFront Function: SPA route rewriting

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  // Don't rewrite API requests
  if (uri.startsWith('/api/') || uri.startsWith('/auth/')) {
    return request;
  }
  
  // Check if this looks like a file (has an extension)
  if (uri.includes('.')) {
    return request;
  }
  
  // Rewrite to index.html for SPA routing
  request.uri = '/index.html';
  return request;
}
```

```typescript
// In CDK stack
const spaRewriteFunction = new cloudfront.Function(this, 'SpaRewriteFunction', {
  functionName: `${appName}-spa-rewrite-${environment}`,
  code: cloudfront.FunctionCode.fromFile({
    filePath: path.join(__dirname, 'edge-functions/spa-rewrite.js'),
  }),
  comment: 'Rewrite SPA routes to /index.html',
});
```

### ACM Certificates

```typescript
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';

// Hosted zone lookup
const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
  hostedZoneId: props.hostedZoneId,
  zoneName: 'digistratum.com',
});

// Certificate - MUST be in us-east-1 for CloudFront
const certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
  domainName: props.domainName,
  hostedZone,
  region: 'us-east-1', // CloudFront requires us-east-1
});
```

**Key Patterns:**
- CloudFront requires certificates in us-east-1
- Use DnsValidatedCertificate for cross-region support
- DNS validation is automatic with Route53

### Route53 DNS

```typescript
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';

new route53.ARecord(this, 'AliasRecord', {
  zone: hostedZone,
  recordName: props.domainName,
  target: route53.RecordTarget.fromAlias(
    new route53targets.CloudFrontTarget(distribution)
  ),
});
```

### Secrets Manager

```typescript
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

// Reference existing secret (create manually or via separate stack)
const secrets = secretsmanager.Secret.fromSecretNameV2(
  this, 'Secrets', 
  `${appId}/secrets`
);

// Use in Lambda environment
environment: {
  JWT_SECRET: secrets.secretValueFromJson('JWT_SECRET').unsafeUnwrap(),
  SSO_APP_SECRET: secrets.secretValueFromJson('SSO_APP_SECRET').unsafeUnwrap(),
},

// Grant read access
secrets.grantRead(apiHandler);
```

**Key Patterns:**
- Create secrets manually or in separate bootstrap stack
- Reference by name, not ARN (portable across accounts)
- Grant minimal access (grantRead, not grantReadWrite)
- Secret structure: `{"JWT_SECRET": "...", "SSO_APP_SECRET": "..."}`

**Secret Creation (CLI):**
```bash
# Dev environment (use placeholder values)
aws secretsmanager create-secret \
  --name myapp/secrets \
  --secret-string '{"JWT_SECRET":"dev-secret-change-me","SSO_APP_SECRET":"dev-sso-secret"}'

# Prod environment (use real values)
aws secretsmanager create-secret \
  --name myapp/secrets \
  --secret-string '{"JWT_SECRET":"<real-jwt-secret>","SSO_APP_SECRET":"<real-sso-secret>"}'
```

---

## Reusable Constructs

### Construct Library Structure

```
cdk/lib/constructs/
├── index.ts              # Barrel exports
├── api-lambda.ts         # Lambda + API Gateway pattern
├── spa-hosting.ts        # S3 + CloudFront pattern
└── data-table.ts         # DynamoDB single-table pattern
```

### ApiLambda Construct

```typescript
// cdk/lib/constructs/api-lambda.ts
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export interface ApiLambdaProps {
  appName: string;
  environment: string;
  codePath: string;
  memorySize?: number;
  timeout?: cdk.Duration;
  environmentVariables?: Record<string, string>;
  corsAllowOrigins?: string[];
}

export class ApiLambda extends Construct {
  public readonly function: lambda.Function;
  public readonly api: apigateway.HttpApi;

  constructor(scope: Construct, id: string, props: ApiLambdaProps) {
    super(scope, id);

    const isProd = props.environment === 'prod';

    this.function = new lambda.Function(this, 'Function', {
      functionName: `${props.appName}-api-${props.environment}`,
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: 'bootstrap',
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset(props.codePath),
      memorySize: props.memorySize ?? (isProd ? 512 : 256),
      timeout: props.timeout ?? cdk.Duration.seconds(30),
      environment: {
        ENVIRONMENT: props.environment,
        ...props.environmentVariables,
      },
    });

    this.api = new apigateway.HttpApi(this, 'Api', {
      apiName: `${props.appName}-api-${props.environment}`,
      corsPreflight: {
        allowOrigins: props.corsAllowOrigins ?? ['*'],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
        allowCredentials: true,
      },
    });

    this.api.addRoutes({
      path: '/{proxy+}',
      methods: [apigateway.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration('Integration', this.function),
    });
  }
}
```

### SpaHosting Construct

```typescript
// cdk/lib/constructs/spa-hosting.ts
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export interface SpaHostingProps {
  appName: string;
  environment: string;
  domainName?: string;
  certificate?: acm.ICertificate;
  apiOrigin?: cloudfront.IOrigin;
  apiPaths?: string[];
}

export class SpaHosting extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SpaHostingProps) {
    super(scope, id);

    const isProd = props.environment === 'prod';
    const account = cdk.Stack.of(this).account;

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `${props.appName}-frontend-${props.environment}-${account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    // SPA rewrite function
    const spaRewriteFunction = new cloudfront.Function(this, 'SpaRewrite', {
      functionName: `${props.appName}-spa-rewrite-${props.environment}`,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          var uri = request.uri;
          if (uri.startsWith('/api/') || uri.startsWith('/auth/') || uri.includes('.')) {
            return request;
          }
          request.uri = '/index.html';
          return request;
        }
      `),
    });

    // Build behaviors
    const additionalBehaviors: Record<string, cloudfront.BehaviorOptions> = {};
    
    if (props.apiOrigin && props.apiPaths) {
      for (const path of props.apiPaths) {
        additionalBehaviors[path] = {
          origin: props.apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        };
      }
    }

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${props.appName} ${props.environment}`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [{
          function: spaRewriteFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      additionalBehaviors,
      defaultRootObject: 'index.html',
      errorResponses: [{
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.seconds(0),
      }],
      domainNames: props.domainName ? [props.domainName] : undefined,
      certificate: props.certificate,
    });
  }
}
```

### DataTable Construct

```typescript
// cdk/lib/constructs/data-table.ts
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface DataTableProps {
  appName: string;
  environment: string;
  gsiCount?: number;
}

export class DataTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DataTableProps) {
    super(scope, id);

    const isProd = props.environment === 'prod';
    const isStaging = props.environment === 'staging';

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `${props.appName}-${props.environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: isProd || isStaging,
      timeToLiveAttribute: 'TTL',
    });

    // Add GSIs
    const gsiCount = props.gsiCount ?? 1;
    for (let i = 1; i <= gsiCount; i++) {
      this.table.addGlobalSecondaryIndex({
        indexName: `GSI${i}`,
        partitionKey: { name: `GSI${i}PK`, type: dynamodb.AttributeType.STRING },
        sortKey: { name: `GSI${i}SK`, type: dynamodb.AttributeType.STRING },
        projectionType: dynamodb.ProjectionType.ALL,
      });
    }
  }

  grantReadWriteData(grantee: cdk.aws_iam.IGrantable) {
    this.table.grantReadWriteData(grantee);
  }
}
```

### Using Constructs

```typescript
// cdk/lib/skeleton-stack.ts
import { ApiLambda, SpaHosting, DataTable } from './constructs';

export class SkeletonStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const dataTable = new DataTable(this, 'Data', {
      appName: 'ds-app-skeleton',
      environment: props.environment,
    });

    const apiLambda = new ApiLambda(this, 'Api', {
      appName: 'ds-app-skeleton',
      environment: props.environment,
      codePath: path.join(__dirname, '../../backend/dist'),
      corsAllowOrigins: [`https://${props.domainName}`],
      environmentVariables: {
        DYNAMODB_TABLE: dataTable.table.tableName,
      },
    });

    dataTable.grantReadWriteData(apiLambda.function);

    const spaHosting = new SpaHosting(this, 'Frontend', {
      appName: 'ds-app-skeleton',
      environment: props.environment,
      domainName: props.domainName,
      certificate,
      apiOrigin: new origins.HttpOrigin(
        `${apiLambda.api.apiId}.execute-api.${this.region}.amazonaws.com`
      ),
      apiPaths: ['/api/*', '/auth/*', '/health'],
    });
  }
}
```

---

## Security Patterns

### IAM Least Privilege

```typescript
// ✅ Correct - specific grants
table.grantReadWriteData(apiHandler);
secrets.grantRead(apiHandler);
bucket.grantRead(apiHandler);

// ❌ Wrong - overly permissive
apiHandler.role?.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
);
```

### Secrets Handling

```typescript
// ✅ Correct - reference from Secrets Manager
const secrets = secretsmanager.Secret.fromSecretNameV2(this, 'Secrets', 'app/secrets');
environment: {
  JWT_SECRET: secrets.secretValueFromJson('JWT_SECRET').unsafeUnwrap(),
}

// ❌ Wrong - hardcoded secrets
environment: {
  JWT_SECRET: 'my-super-secret-key', // Never do this!
}
```

### Network Security

```typescript
// CloudFront forces HTTPS
viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,

// S3 blocks all public access
blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

// CORS restricted to specific origins
corsPreflight: {
  allowOrigins: [`https://${domainName}`], // Not '*' in production
}
```

---

## Deployment Patterns

### CDK Commands

```bash
# Install dependencies
cd cdk && npm install

# Build TypeScript
npm run build

# Synthesize CloudFormation
cdk synth

# Deploy to dev (default)
cdk deploy

# Deploy to specific environment
cdk deploy -c env=staging
cdk deploy -c env=prod

# Preview changes
cdk diff -c env=prod

# Destroy (non-prod only)
cdk destroy -c env=dev
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
    paths: ['cdk/**']

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install CDK
        run: cd cdk && npm ci
      - name: Deploy
        run: cd cdk && npx cdk deploy -c env=dev --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-west-2

  deploy-prod:
    runs-on: ubuntu-latest
    needs: deploy-dev
    if: github.ref == 'refs/heads/main'
    environment: production  # Requires approval
    steps:
      # ... same as dev but with -c env=prod
```

### Pre-Deployment Checklist

- [ ] `cdk diff` shows expected changes only
- [ ] Backend code builds successfully (`backend/scripts/build.sh`)
- [ ] Frontend builds successfully (`cd frontend && npm run build`)
- [ ] All tests pass
- [ ] Secrets exist in Secrets Manager (for new deployments)
- [ ] Route53 hosted zone exists (for custom domain)

---

## Naming Conventions

### Resource Naming

| Resource Type | Pattern | Example |
|---------------|---------|---------|
| Stack | `{App}-{Env}` | `DSAppSkeleton-prod` |
| Lambda | `{app}-{purpose}-{env}` | `ds-app-skeleton-api-prod` |
| API Gateway | `{app}-api-{env}` | `ds-app-skeleton-api-prod` |
| DynamoDB Table | `{app}-{env}` | `ds-app-skeleton-prod` |
| S3 Bucket | `{app}-{purpose}-{env}-{account}` | `ds-app-skeleton-frontend-prod-123456` |
| CloudFront Function | `{app}-{purpose}-{env}` | `ds-app-skeleton-spa-rewrite-prod` |
| Secret | `{app}/secrets` | `ds-app-skeleton/secrets` |

### Tag Conventions

```typescript
cdk.Tags.of(this).add('Application', appName);
cdk.Tags.of(this).add('Environment', environment);
cdk.Tags.of(this).add('ManagedBy', 'CDK');
cdk.Tags.of(this).add('CostCenter', 'Engineering');
```

---

## Appendix: CDK Best Practices

### Do

- ✅ Use TypeScript for type safety
- ✅ Use L2/L3 constructs over L1 (Cfn*)
- ✅ Use environment variables for non-sensitive config
- ✅ Use Secrets Manager for sensitive values
- ✅ Use `RemovalPolicy.RETAIN` for production data
- ✅ Enable Point-in-Time Recovery for production DynamoDB
- ✅ Use ARM64 Lambda for cost savings
- ✅ Create reusable constructs for repeated patterns

### Don't

- ❌ Hardcode secrets in code
- ❌ Use `*` for CORS origins in production
- ❌ Skip `cdk diff` before deploy
- ❌ Use `RemovalPolicy.DESTROY` for production data
- ❌ Grant `AdministratorAccess` to Lambda
- ❌ Create resources without environment suffix

---

*Document version: 1.0.0*
*Last updated: 2026-02-19*
