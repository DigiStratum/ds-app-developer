# Deployment Guide

This guide covers deploying your DigiStratum app to AWS.

## Prerequisites

- AWS CLI configured with credentials
- Node.js 18+ installed
- AWS CDK CLI installed (`npm install -g aws-cdk`)

## Quick Deploy

```bash
# Build the frontend
npm run build

# Deploy with CDK
cd cdk
npm install
cdk deploy
```

## Deployment Architecture

The default CDK stack creates:

1. **S3 Bucket** - Hosts static frontend assets
2. **CloudFront Distribution** - CDN for global delivery
3. **Origin Access Identity** - Secure S3 access

```
User → CloudFront → S3 (frontend)
                  ↘ API Gateway → Lambda (backend, optional)
```

## Environment Configuration

### Production Environment

Create `cdk/cdk.context.json`:

```json
{
  "environment": "production",
  "domainName": "app.yourdomain.com",
  "certificateArn": "arn:aws:acm:us-east-1:xxx:certificate/xxx"
}
```

### Staging Environment

```bash
cdk deploy --context environment=staging
```

## Custom Domain

To use a custom domain:

1. Create an ACM certificate in us-east-1 (CloudFront requirement)
2. Update the stack in `cdk/lib/stack.ts`:

```typescript
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

// In the constructor:
const certificate = acm.Certificate.fromCertificateArn(
  this,
  'Certificate',
  'arn:aws:acm:us-east-1:xxx:certificate/xxx'
);

const distribution = new cloudfront.Distribution(this, 'Distribution', {
  // ... existing config
  domainNames: ['app.yourdomain.com'],
  certificate,
});
```

3. Add DNS record pointing to CloudFront distribution

## Backend Deployment

If you have a backend, add Lambda functions to the stack:

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

// Lambda function
const handler = new lambda.Function(this, 'ApiHandler', {
  runtime: lambda.Runtime.PROVIDED_AL2,
  handler: 'bootstrap',
  code: lambda.Code.fromAsset('../backend/dist'),
  environment: {
    DSACCOUNT_URL: 'https://account.digistratum.com',
  },
});

// API Gateway
const api = new apigateway.RestApi(this, 'Api', {
  restApiName: '{{APP_NAME}} API',
});

api.root.addProxy({
  defaultIntegration: new apigateway.LambdaIntegration(handler),
});
```

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
          
      - name: Deploy CDK
        run: |
          cd cdk
          npm ci
          npx cdk deploy --require-approval never
```

## Monitoring

### CloudWatch

The CDK stack automatically sets up basic CloudWatch metrics. View them in the AWS Console.

### Error Tracking

Consider adding error tracking (e.g., Sentry):

```typescript
// In src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

## Cost Optimization

For low-traffic apps:
- CloudFront: ~$0.01/10K requests
- S3: ~$0.023/GB storage
- Lambda (if used): Pay per request

Typical monthly cost for a small app: $1-5

## Troubleshooting

### CloudFront 403 Errors

Check:
1. S3 bucket policy allows OAI access
2. Objects exist in the bucket
3. Default root object is set

### Deploy Fails

```bash
# Check CDK synth works
cdk synth

# Bootstrap if needed
cdk bootstrap aws://ACCOUNT/REGION
```

### Cache Issues

Invalidate CloudFront cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id XXXXX \
  --paths "/*"
```
