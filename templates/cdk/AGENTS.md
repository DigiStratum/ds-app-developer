# CDK — AGENTS.md

## Resource Naming Convention

All AWS resources are named using the **domain-based** convention:

| Pattern | Example |
|---------|---------|
| With dots (where allowed) | `hello4.leapkick.com` |
| With dashes (where required) | `hello4-leapkick-com` |

**Use dots for:** Tags, CloudWatch Logs, DynamoDB tables, S3 buckets
**Use dashes for:** Lambda functions, API Gateway, SNS topics, CloudWatch Dashboards

---

## Stack Structure

```
cdk/
├── lib/
│   └── developer-stack.ts    # Main stack definition
├── bin/
│   └── cdk.ts                # CDK app entry
├── cdk.json                  # CDK config
└── AGENTS.md                 # This file
```

---

## Required Tags

All resources MUST include these tags:

```typescript
Tags.of(this).add('Application', domainName);   // e.g., 'hello4.leapkick.com'
Tags.of(this).add('Environment', 'prod');
Tags.of(this).add('ManagedBy', 'CDK');
```

---

## CDK Outputs

All infrastructure ARNs and names MUST be exported as CDK outputs for the manifest system:

```typescript
new cdk.CfnOutput(this, 'DynamoTableArn', {
  value: table.tableArn,
  description: 'DynamoDB table ARN',
});
```

**Required outputs:**
- DynamoDB: `DynamoTableName`, `DynamoTableArn`
- Lambda: `LambdaFunctionName`, `LambdaFunctionArn`
- API Gateway: `ApiGatewayId`, `ApiGatewayArn`, `ApiGatewayEndpoint`
- S3: `FrontendBucketName`, `FrontendBucketArn`
- CloudFront: `DistributionId`, `DistributionArn`, `DistributionDomain`
- ACM: `CertificateArn`
- CloudWatch: `LogGroupName`, `LogGroupArn`
- Meta: `AppDomain`, `AwsAccount`, `AwsRegion`

---

## Infrastructure Manifest

> ⚠️ **MANDATORY:** After ANY `cdk deploy`, you MUST update the manifest.

```bash
./scripts/register-manifest.sh
```

This collects CDK outputs and pushes them to the ecosystem account service. Other apps and agents depend on this being accurate.

**Triggers for manifest update:**
- Any `cdk deploy`
- Adding new AWS resources
- Changing resource names or configurations
- Modifying stack outputs

---

## Log Groups

Create explicit log groups for retention control:

```typescript
const logGroup = new logs.LogGroup(this, 'ApiLogGroup', {
  logGroupName: `/aws/lambda/${domainName}`,
  retention: logs.RetentionDays.ONE_MONTH,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
```

**Don't** let Lambda auto-create log groups — they have infinite retention by default.

---

## Common Resources

| Resource | Type | Naming |
|----------|------|--------|
| DynamoDB | Main data store | `{domain}` |
| Lambda | API handler | `{domain-with-dashes}-api` |
| API Gateway | HTTP API | `{domain-with-dashes}-api` |
| S3 | Frontend assets | `{domain}-frontend-{account}` |
| CloudFront | CDN | (auto-generated ID) |
| Log Group | Lambda logs | `/aws/lambda/{domain}` |

---

## Deployment

```bash
cd cdk
npx cdk deploy

# REQUIRED: Update manifest
../scripts/register-manifest.sh
```

---

## References

| Doc | Purpose |
|-----|---------|
| [INFRASTRUCTURE.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/INFRASTRUCTURE.md) | AWS architecture |
| [DEPLOYMENT-RUNBOOK.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/DEPLOYMENT-RUNBOOK.md) | Deploy procedures |
| [MONITORING.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/MONITORING.md) | Monitoring setup |
| [SECURITY.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/SECURITY.md) | Security requirements |
