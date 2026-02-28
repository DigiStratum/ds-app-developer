# Deployment Runbook - DS App Developer

> Step-by-step deployment guide for developer.digistratum.com
> Last updated: 2026-02-19

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture Summary](#architecture-summary)
4. [Initial Deployment](#initial-deployment)
5. [Updating the Deployment](#updating-the-deployment)
6. [Verification Checklist](#verification-checklist)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

---

## Overview

DS App Developer is deployed to AWS with the following components:

| Component | Service | Resource Name |
|-----------|---------|---------------|
| Frontend | S3 + CloudFront | `ds-app-developer-frontend-{account}` |
| API | Lambda + API Gateway | `ds-app-developer-api` |
| Database | DynamoDB | `ds-app-developer` |
| DNS | Route53 | `developer.digistratum.com` |

**Production URL:** https://developer.digistratum.com

---

## Prerequisites

### Required Tools

```bash
# AWS CLI v2
aws --version  # aws-cli/2.x

# Node.js 20+
node --version  # v20.x or higher

# Go 1.22+ (IMPORTANT: routing syntax requires 1.22+)
go version  # go1.22.x

# AWS CDK
npx cdk --version  # 2.x
```

### AWS Configuration

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Required permissions:
# - CloudFormation full access
# - Lambda, API Gateway, S3, CloudFront, DynamoDB, Route53, ACM
# - Secrets Manager read
```

### Environment Variables

Create a `.env` file in the project root (DO NOT commit):

```bash
# Required for DSAccount SSO integration
DSACCOUNT_APP_ID=<app-id-from-dsaccount>
DSACCOUNT_SSO_URL=https://account.digistratum.com

# Optional
AWS_REGION=us-west-2
```

---

## Architecture Summary

```
                    ┌─────────────────────────────────────┐
                    │         CloudFront (CDN)            │
                    │   Distribution: E1ZIQHD3SMO9OH      │
                    │   Domain: developer.digistratum.com  │
                    └─────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────┐
    │  S3 (Frontend)  │ │  /api/*     │ │  /health    │
    │  /*, index.html │ │  /auth/*    │ │             │
    └─────────────────┘ └─────────────┘ └─────────────┘
              │                │                │
              │                └────────────────┘
              │                         │
              ▼                         ▼
    ┌─────────────────┐     ┌─────────────────────┐
    │     S3 Bucket   │     │   API Gateway v2    │
    │ ds-app-developer-│     │   hjd19jxhjg        │
    │ frontend-17...  │     └─────────────────────┘
    └─────────────────┘               │
                                      ▼
                          ┌─────────────────────┐
                          │   Lambda Function   │
                          │ ds-app-developer-api │
                          └─────────────────────┘
                                      │
                                      ▼
                          ┌─────────────────────┐
                          │     DynamoDB        │
                          │   ds-app-developer   │
                          └─────────────────────┘
```

---

## Initial Deployment

### Step 1: Clone and Setup

```bash
cd ~/Documents/projects
git clone https://github.com/DigiStratum/ds-app-developer.git
cd ds-app-developer
```

### Step 2: Build Backend

```bash
cd backend

# Ensure Go 1.22+ (required for routing syntax)
go version  # Must be 1.22+

# Download dependencies
go mod download

# Build for Lambda (ARM64)
GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o dist/bootstrap ./cmd/api

cd ..
```

### Step 3: Build Frontend

```bash
cd frontend

# Install dependencies
npm ci

# Build production bundle
npm run build  # Creates dist/ directory

cd ..
```

### Step 4: Deploy Infrastructure

```bash
cd cdk

# Install CDK dependencies
npm ci

# Synthesize CloudFormation template
npx cdk synth

# Review changes (first deployment will show all new resources)
npx cdk diff

# Deploy
npx cdk deploy --require-approval never

cd ..
```

### Step 5: Upload Frontend to S3

```bash
# Get bucket name from CDK output
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name DSAppDeveloperStack \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text)

# Sync frontend build to S3
aws s3 sync frontend/dist/ s3://$BUCKET_NAME/ --delete

# Invalidate CloudFront cache
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[?contains(@,'developer.digistratum.com')]].Id" \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

### Step 6: Configure Secrets (First Time Only)

```bash
# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name ds-app-developer/secrets \
  --secret-string '{
    "JWT_SECRET": "<generate-secure-random-string>",
    "DSACCOUNT_APP_ID": "<app-id-from-dsaccount>",
    "DSACCOUNT_APP_SECRET": "<app-secret-from-dsaccount>"
  }'
```

---

## Updating the Deployment

### Backend Only

```bash
cd backend
GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o dist/bootstrap ./cmd/api

# Update Lambda function
aws lambda update-function-code \
  --function-name ds-app-developer-api \
  --zip-file fileb://<(cd dist && zip -r - bootstrap)
```

### Frontend Only

```bash
cd frontend
npm run build

# Sync to S3 and invalidate CloudFront
aws s3 sync dist/ s3://ds-app-developer-frontend-171949636152/ --delete
aws cloudfront create-invalidation \
  --distribution-id E1ZIQHD3SMO9OH \
  --paths "/*"
```

### Full Stack (Infrastructure + Code)

```bash
# Build backend
cd backend
GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o dist/bootstrap ./cmd/api
cd ..

# Build frontend
cd frontend && npm run build && cd ..

# Deploy CDK (includes Lambda update)
cd cdk && npx cdk deploy --require-approval never && cd ..

# Sync frontend to S3
aws s3 sync frontend/dist/ s3://ds-app-developer-frontend-171949636152/ --delete

# Invalidate CDN
aws cloudfront create-invalidation \
  --distribution-id E1ZIQHD3SMO9OH \
  --paths "/*"
```

---

## Verification Checklist

After deployment, verify these endpoints and features:

### Automated Health Checks

```bash
# Frontend loads
curl -s -o /dev/null -w "%{http_code}" https://developer.digistratum.com/
# Expected: 200

# Health endpoint (API)
curl -s https://developer.digistratum.com/health
# Expected: {"status":"healthy","timestamp":"...","version":"1.0.0"}

# API responds (will redirect to login if unauthenticated)
curl -s -o /dev/null -w "%{http_code}" https://developer.digistratum.com/api/me
# Expected: 302 (redirect to SSO)
```

### Manual Verification

- [ ] **Homepage loads** - Navigate to https://developer.digistratum.com/
- [ ] **SPA routing works** - Navigate to /dashboard, refresh page
- [ ] **Login button works** - Click "Login with DSAccount", redirects to SSO
- [ ] **After login** - User info displayed, tenant switcher visible
- [ ] **Tenant switching** - Switch tenants, data refreshes
- [ ] **Logout works** - Click logout, session cleared, redirected
- [ ] **Dark mode toggle** - Theme persists across page loads
- [ ] **No console errors** - Check browser DevTools for JS errors

---

## Troubleshooting

### Common Issues

#### 1. Frontend returns 404 for routes

**Symptom:** Refreshing on /dashboard returns 404  
**Cause:** CloudFront not rewriting to index.html  
**Fix:** Verify CloudFront custom error response for 404 → /index.html

#### 2. API returns 404 for all routes

**Symptom:** curl /health returns 404  
**Cause:** Go version mismatch - routing syntax requires Go 1.22+  
**Fix:** Update go.mod to `go 1.22` and rebuild backend

```bash
# Check current Go version in go.mod
grep "^go " backend/go.mod

# If < 1.22, update:
cd backend
go mod edit -go=1.22
go mod tidy
```

#### 3. SSO redirect has empty app_id

**Symptom:** OAuth URL shows `app_id=&redirect_uri=...`  
**Cause:** `DSACCOUNT_APP_ID` not set in Lambda environment  
**Fix:** Update CDK stack to include the environment variable, or:

```bash
aws lambda update-function-configuration \
  --function-name ds-app-developer-api \
  --environment "Variables={DYNAMODB_TABLE=ds-app-developer,DSACCOUNT_SSO_URL=https://account.digistratum.com,APP_URL=https://developer.digistratum.com,DSACCOUNT_APP_ID=<your-app-id>}"
```

#### 4. CORS errors in browser console

**Symptom:** "Access-Control-Allow-Origin" errors  
**Cause:** API Gateway CORS misconfiguration  
**Fix:** Verify CORS settings in CDK stack include the domain

#### 5. CloudFront returns stale content

**Symptom:** Changes don't appear after deploy  
**Fix:** Create CloudFront invalidation

```bash
aws cloudfront create-invalidation \
  --distribution-id E1ZIQHD3SMO9OH \
  --paths "/*"
```

### Checking Logs

```bash
# Lambda logs
aws logs tail /aws/lambda/ds-app-developer-api --follow

# Recent errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/ds-app-developer-api \
  --filter-pattern "ERROR" \
  --limit 20
```

---

## Rollback Procedures

### Rollback Lambda to Previous Version

```bash
# List recent deployments
aws lambda list-versions-by-function \
  --function-name ds-app-developer-api \
  --query "Versions[-5:].Version"

# Update alias to previous version (if using aliases)
aws lambda update-alias \
  --function-name ds-app-developer-api \
  --name prod \
  --function-version <previous-version>
```

### Rollback Frontend

```bash
# Frontend is versioned in S3 with CloudFront
# To rollback, redeploy from a previous commit:
git checkout <previous-commit>
cd frontend && npm run build
aws s3 sync dist/ s3://ds-app-developer-frontend-171949636152/ --delete
aws cloudfront create-invalidation --distribution-id E1ZIQHD3SMO9OH --paths "/*"
```

### Rollback Infrastructure (CDK)

```bash
# CDK doesn't have built-in rollback, but CloudFormation does
# Rollback to previous successful deployment:
aws cloudformation cancel-update-stack --stack-name DSAppDeveloperStack

# Or rollback from CloudFormation console
```

---

## Resource Reference

| Resource | AWS Console Link |
|----------|------------------|
| CloudFront | [Distribution E1ZIQHD3SMO9OH](https://us-east-1.console.aws.amazon.com/cloudfront/home#/distributions/E1ZIQHD3SMO9OH) |
| Lambda | [ds-app-developer-api](https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/ds-app-developer-api) |
| API Gateway | [hjd19jxhjg](https://us-west-2.console.aws.amazon.com/apigateway/home?region=us-west-2#/apis/hjd19jxhjg) |
| DynamoDB | [ds-app-developer](https://us-west-2.console.aws.amazon.com/dynamodbv2/home?region=us-west-2#table?name=ds-app-developer) |
| S3 | [ds-app-developer-frontend-171949636152](https://s3.console.aws.amazon.com/s3/buckets/ds-app-developer-frontend-171949636152) |
| CloudWatch Logs | [/aws/lambda/ds-app-developer-api](https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fds-app-developer-api) |

---

*Document version: 1.0.0*  
*Created: 2026-02-19*
