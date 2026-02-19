# CI/CD Pipeline

> Complete CI/CD pipeline with canary deployment strategy for DS App Skeleton.
> Zero pre-prod environments — validated directly in production with automatic rollback.

---

## Table of Contents
1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [CI Pipeline](#ci-pipeline)
4. [Deployment Pipeline](#deployment-pipeline)
5. [Canary Strategy](#canary-strategy)
6. [Health Checks & Validation](#health-checks--validation)
7. [Rollback Triggers](#rollback-triggers)
8. [Secrets & Configuration](#secrets--configuration)
9. [Monitoring & Alerts](#monitoring--alerts)

---

## Overview

### Philosophy

This pipeline follows a **trunk-based development** model with **canary deployments**:

- No staging/pre-prod environment (reduces infrastructure costs and complexity)
- All changes validated in production with limited traffic exposure
- Automatic rollback if validation fails
- Fast feedback loop (5-10 minute canary validation)

### Key Metrics

| Metric | Target | Rollback Threshold |
|--------|--------|-------------------|
| Error Rate | < 1% | > 5% |
| P95 Latency | < 500ms | > 1000ms |
| Health Check Success | 100% | < 95% |

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CI Pipeline                                     │
│  (Triggered on: push to main, pull requests)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│   │Backend Lint  │  │Backend Test  │  │Frontend Lint │  │Frontend Test │   │
│   │  (golangci)  │  │  (coverage)  │  │   (eslint)   │  │  (coverage)  │   │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│          │                │                   │                 │           │
│          └────────────────┴───────────────────┴─────────────────┘           │
│                                    │                                         │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │Security Scan │         │  CDK Synth   │         │   CI Pass    │       │
│   │  (CodeQL)    │         │  (validate)  │         │   (gate)     │       │
│   └──────────────┘         └──────────────┘         └──────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ (only on main, after CI passes)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Deploy Pipeline                                    │
│  (Triggered by: CI success on main)                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐         ┌──────────────────────────┐                    │
│   │   Build      │ ──────▶ │    Deploy Canary         │                    │
│   │  Artifacts   │         │ (10% traffic to new ver) │                    │
│   └──────────────┘         └──────────────────────────┘                    │
│                                      │                                       │
│                                      ▼                                       │
│                          ┌──────────────────────────┐                       │
│                          │   Canary Validation      │                       │
│                          │  (5-10 min monitoring)   │                       │
│                          │  • Health checks         │                       │
│                          │  • CloudWatch metrics    │                       │
│                          │  • E2E smoke tests       │                       │
│                          └──────────────────────────┘                       │
│                                      │                                       │
│                          ┌───────────┴───────────┐                          │
│                          ▼                       ▼                           │
│               ┌──────────────────┐    ┌──────────────────┐                  │
│               │  Promote (100%)  │    │    Rollback      │                  │
│               │   (if healthy)   │    │   (if unhealthy) │                  │
│               └──────────────────┘    └──────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CI Pipeline

### Workflow File
`.github/workflows/ci.yml`

### Trigger Events
- **Push to main**: Full CI + build artifacts
- **Pull requests**: Full CI, no deployment artifacts

### Jobs

#### 1. Backend Lint
```yaml
- golangci-lint with default configuration
- Enforces Go code standards
```

#### 2. Backend Test
```yaml
- Runs all Go tests with race detection
- Generates coverage report
- Enforces 80% coverage threshold (NFR-TEST-001)
```

#### 3. Frontend Lint
```yaml
- ESLint for TypeScript/React
- TypeScript type checking
```

#### 4. Frontend Test
```yaml
- Jest/Vitest unit tests
- Coverage report generation
```

#### 5. Security Scan
```yaml
- govulncheck (Go vulnerability scanner)
- npm audit (Node.js dependencies)
- CodeQL static analysis (Go + JavaScript)
```

#### 6. CDK Synth
```yaml
- Validates CDK can synthesize without errors
- Catches infrastructure definition issues early
```

#### 7. CI Pass Gate
```yaml
- Aggregates all job results
- Blocks deployment if any job fails
```

---

## Deployment Pipeline

### Workflow File
`.github/workflows/deploy.yml`

### Trigger Events
- **workflow_run**: Triggered when CI workflow completes successfully on main

### Jobs

#### 1. Preflight
- Validates CI workflow succeeded
- Extracts commit SHA for deployment

#### 2. Build Artifacts
- Builds Lambda binary (ARM64)
- Builds frontend (Vite production build)
- Uploads artifacts for deployment

#### 3. Deploy Canary
- Deploys CDK stack changes
- Publishes new Lambda version
- Configures weighted alias (10% to new version)
- Deploys frontend to canary path

#### 4. Canary Validation
- Runs health checks for 5 minutes
- Monitors CloudWatch metrics
- Executes E2E smoke tests

#### 5. Promote / Rollback
- **Promote**: Routes 100% traffic to new version
- **Rollback**: Reverts to previous version

---

## Canary Strategy

### Lambda Weighted Aliases

AWS Lambda aliases support weighted traffic routing between versions:

```
┌───────────────────────────────────────────────────────────┐
│                   Lambda Function                          │
│                  (ds-app-skeleton-api)                     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│    Version $LATEST ────┐                                  │
│                        │                                  │
│    Version 5 ──────────┼───▶ Alias: live                  │
│    (previous)          │     • 90% → Version 5            │
│                        │     • 10% → Version 6 (canary)   │
│    Version 6 ──────────┘                                  │
│    (canary)                                               │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Traffic Routing Stages

| Stage | Traffic Distribution | Duration |
|-------|---------------------|----------|
| Deploy | 90% current, 10% canary | Immediate |
| Validate | 90% current, 10% canary | 5-10 min |
| Promote | 100% canary | After validation |
| Rollback | 100% previous | On failure |

### Frontend Canary

Frontend uses a path-based approach:

```
S3 Bucket:
├── index.html        (production)
├── assets/           (production assets)
└── canary/
    ├── index.html    (canary version)
    └── assets/       (canary assets)
```

> **Note**: Full frontend A/B testing would require CloudFront Functions
> or Lambda@Edge to route a percentage of users to `/canary/`.
> Current implementation validates canary in staging path then promotes.

---

## Health Checks & Validation

### Health Check Endpoint

**URL**: `https://skeleton.digistratum.com/health`

**Expected Response**:
```json
{
  "status": "healthy",
  "version": "1.2.3",
  "timestamp": "2026-02-19T08:00:00Z"
}
```

### Validation Criteria

#### Error Rate
- **Calculation**: `(failed_requests / total_requests) * 100`
- **Threshold**: 5%
- **Check interval**: Every 30 seconds for 5 minutes

#### Latency (P95)
- **Calculation**: 95th percentile of response times
- **Threshold**: 1000ms
- **Measured via**: curl timing + CloudWatch metrics

#### E2E Smoke Tests
Quick functional validation:
1. Health endpoint returns 200
2. API endpoint accessible (200 or 401)
3. Frontend loads correctly

### CloudWatch Metrics Monitored

| Metric | Namespace | Dimensions |
|--------|-----------|------------|
| Errors | AWS/Lambda | FunctionName |
| Invocations | AWS/Lambda | FunctionName |
| Duration | AWS/Lambda | FunctionName |
| 4xxError | AWS/ApiGateway | ApiId |
| 5xxError | AWS/ApiGateway | ApiId |

---

## Rollback Triggers

### Automatic Rollback Conditions

The deployment automatically rolls back if **ANY** of these conditions are met:

| Trigger | Threshold | Detection Method |
|---------|-----------|------------------|
| Error rate spike | > 5% | Health checks + CloudWatch |
| Latency spike | P95 > 1000ms | Health checks timing |
| Health check failures | < 95% success | curl to /health |
| E2E test failures | Any failure | Smoke test suite |

### Rollback Process

1. **Detect failure** in canary-validation job
2. **Trigger rollback job** (runs when `canary_healthy == 'false'`)
3. **Revert Lambda alias** to previous version (100% traffic)
4. **Clean up canary frontend** from S3
5. **Report failure** with metrics

### Manual Rollback

If needed, manually rollback via AWS CLI:

```bash
# Find previous version
aws lambda list-versions-by-function \
  --function-name ds-app-skeleton-api \
  --query 'Versions[-2:].Version'

# Rollback alias
aws lambda update-alias \
  --function-name ds-app-skeleton-api \
  --name live \
  --function-version <PREVIOUS_VERSION> \
  --routing-config 'AdditionalVersionWeights={}'
```

---

## Secrets & Configuration

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN` | IAM role for OIDC authentication |

### GitHub OIDC Setup

The pipeline uses OIDC federation (no static AWS credentials):

```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    aws-region: us-west-2
```

Required IAM trust policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:DigiStratum/ds-app-skeleton:*"
        }
      }
    }
  ]
}
```

### Environment Protection

The `production` environment should have:
- Required reviewers (optional, for manual gate)
- Wait timer (optional)
- Deployment branch rules (main only)

---

## Monitoring & Alerts

### Recommended CloudWatch Alarms

Create these alarms for production monitoring:

```typescript
// In CDK stack
new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
  metric: apiHandler.metricErrors(),
  threshold: 5,
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
});

new cloudwatch.Alarm(this, 'LatencyAlarm', {
  metric: apiHandler.metricDuration({
    statistic: 'p95',
  }),
  threshold: 1000,
  evaluationPeriods: 2,
});
```

### Dashboard Metrics

Key metrics to display:
- Request count (per minute)
- Error rate (%)
- P50/P95/P99 latency
- Lambda concurrent executions
- CloudFront cache hit ratio

---

## Troubleshooting

### CI Failures

| Issue | Solution |
|-------|----------|
| Coverage below 80% | Add tests to uncovered code paths |
| golangci-lint errors | Fix linting issues locally: `golangci-lint run` |
| CodeQL findings | Review security findings in GitHub Security tab |
| CDK synth fails | Check CDK code compiles: `npm run build && cdk synth` |

### Deployment Failures

| Issue | Solution |
|-------|----------|
| AWS credentials error | Verify OIDC role trust policy |
| Lambda version publish fails | Check Lambda permissions in IAM role |
| Health check timeout | Verify application starts within Lambda timeout |
| Canary validation fails | Check CloudWatch logs for Lambda errors |

### Rollback Not Working

```bash
# Manually check alias configuration
aws lambda get-alias \
  --function-name ds-app-skeleton-api \
  --name live

# Force rollback to specific version
aws lambda update-alias \
  --function-name ds-app-skeleton-api \
  --name live \
  --function-version <VERSION> \
  --routing-config 'AdditionalVersionWeights={}'
```

---

## Future Improvements

1. **Gradual traffic shifting**: Increase canary traffic over time (10% → 25% → 50% → 100%)
2. **Synthetic monitoring**: CloudWatch Synthetics canaries for continuous validation
3. **Automated performance testing**: Load tests during canary phase
4. **Feature flags**: Progressive rollout with feature flags instead of traffic %
5. **Multi-region deployment**: Canary per region with global promotion

---

*Last updated: 2026-02-19*
