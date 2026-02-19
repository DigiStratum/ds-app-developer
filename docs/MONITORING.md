# Monitoring & Alerting - DS App Skeleton

> Comprehensive monitoring and alerting patterns for DigiStratum applications.
> Implements NFR-MON requirements with CloudWatch dashboards, alarms, and integrations.

---

## Table of Contents
1. [Overview](#overview)
2. [CloudWatch Dashboard](#cloudwatch-dashboard)
3. [Alarms & Thresholds](#alarms--thresholds)
4. [Performance Baselines](#performance-baselines)
5. [SNS Integration](#sns-integration)
6. [PagerDuty Integration](#pagerduty-integration)
7. [CDK Implementation](#cdk-implementation)
8. [CloudWatch Logs Insights](#cloudwatch-logs-insights)
9. [Runbooks](#runbooks)
10. [Cost Optimization](#cost-optimization)

---

## Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MONITORING FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CloudFront ──┐                                                             │
│               │                                                             │
│  API Gateway ─┼──► CloudWatch Metrics ──► CloudWatch Alarms                 │
│               │           │                      │                          │
│  Lambda ──────┤           │                      │                          │
│               │           ▼                      ▼                          │
│  DynamoDB ────┘    CloudWatch Dashboard    SNS Topic ──► PagerDuty         │
│                                                  │                          │
│  Lambda Logs ────► CloudWatch Logs              │──► Email                 │
│                          │                       │                          │
│                          ▼                       │──► Slack                 │
│                   Logs Insights                  │                          │
│                   (Queries)                      │──► AWS Chatbot          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Metrics Monitored

| Service | Metric | Purpose |
|---------|--------|---------|
| Lambda | Invocations | Request volume |
| Lambda | Errors | Application failures |
| Lambda | Duration (p95/p99) | Performance |
| Lambda | Throttles | Capacity issues |
| Lambda | ConcurrentExecutions | Scalability |
| API Gateway | Count | Request volume |
| API Gateway | 4XXError | Client errors |
| API Gateway | 5XXError | Server errors |
| API Gateway | Latency (p95/p99) | Performance |
| DynamoDB | ConsumedRCU/WCU | Database load |
| DynamoDB | ThrottledRequests | Capacity issues |
| DynamoDB | SuccessfulRequestLatency | Database performance |

### Requirements Traceability

| Requirement | Implementation |
|-------------|----------------|
| NFR-MON-001 | Structured JSON logging to CloudWatch |
| NFR-MON-002 | Error rate alarms via CloudWatch |
| NFR-MON-003 | Latency percentile dashboards |
| NFR-MON-004 | Request correlation IDs (see LOGGING.md) |
| NFR-PERF-002 | API response time < 500ms (p95) baseline |

---

## CloudWatch Dashboard

### Dashboard Layout

The dashboard is organized in logical rows:

**Row 1: Key Metrics (Single Value Widgets)**
- Requests (5m) — Current request volume
- Error Rate % — Calculated error percentage
- P95 Latency (ms) — API response time
- 5XX Errors — Server error count
- Lambda Throttles — Capacity issues
- Concurrent Executions — Current load

**Row 2: Request Volume & Errors**
- API Requests over time
- 4XX vs 5XX error trends

**Row 3: Latency**
- API Gateway latency with p95 target annotation
- Lambda duration distribution

**Row 4: Lambda Metrics**
- Invocations vs Errors
- Error rate with threshold annotation

**Row 5: DynamoDB (if configured)**
- Read/Write latency with targets
- Capacity utilization and throttles

### Accessing the Dashboard

```bash
# Dashboard URL format
https://{region}.console.aws.amazon.com/cloudwatch/home?region={region}#dashboards:name={appName}-{environment}

# Example
https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards:name=ds-app-skeleton-prod
```

The dashboard URL is output during CDK deployment.

---

## Alarms & Thresholds

### Standard Alarms

| Alarm | Metric | Threshold | Evaluation | Description |
|-------|--------|-----------|------------|-------------|
| High Error Rate | Lambda error rate | > 5% | 2/3 periods (5m) | Application is failing too often |
| High Latency | API Gateway P95 | > 500ms | 2/3 periods (1m) | Responses too slow |
| 5XX Errors | API Gateway 5XX | > 10/min | 2/2 periods (1m) | Server errors spiking |
| Lambda Errors | Lambda Errors | > 5/min | 2/2 periods (1m) | Lambda function failures |
| Lambda Throttles | Lambda Throttles | > 0 | 1/1 periods (1m) | Hitting concurrency limits |
| DynamoDB Throttles | ThrottledRequests | > 0 | 1/1 periods (1m) | Database capacity issues |

### Alarm States

- **OK** — Metric within threshold
- **ALARM** — Threshold breached
- **INSUFFICIENT_DATA** — Not enough data points

### Environment-Specific Behavior

| Environment | Alarms Enabled | SNS Notifications |
|-------------|----------------|-------------------|
| dev | No | No |
| staging | Yes | Yes |
| prod | Yes | Yes |

---

## Performance Baselines

These baselines are defined in `cdk/lib/constructs/monitoring.ts` and used for dashboard annotations and alarm thresholds:

```typescript
export const PerformanceBaselines = {
  /** Target API response time p95 (ms) - NFR-PERF-002 */
  apiLatencyP95Ms: 500,
  
  /** Target API response time p99 (ms) */
  apiLatencyP99Ms: 1000,
  
  /** Maximum acceptable error rate (%) */
  maxErrorRatePercent: 1,
  
  /** Target availability (%) - NFR-AVAIL-001 */
  availabilityTarget: 99.9,
  
  /** Lambda cold start acceptable threshold (ms) */
  coldStartThresholdMs: 1000,
  
  /** DynamoDB read latency target (ms) */
  dynamoReadLatencyMs: 25,
  
  /** DynamoDB write latency target (ms) */
  dynamoWriteLatencyMs: 50,
};
```

### Baseline Rationale

| Baseline | Value | Rationale |
|----------|-------|-----------|
| API Latency P95 | 500ms | NFR-PERF-002 requirement |
| API Latency P99 | 1000ms | Allows for cold starts |
| Error Rate | 1% | Industry standard for healthy services |
| Availability | 99.9% | NFR-AVAIL-001 requirement (3.65 min downtime/week) |
| Cold Start | 1000ms | Go on ARM64 typically < 500ms |
| DynamoDB Read | 25ms | Single-digit millisecond latency target |
| DynamoDB Write | 50ms | Slightly higher for consistency |

---

## SNS Integration

### Topic Structure

```typescript
// Created by Monitoring construct
Topic Name: {appName}-alerts-{environment}
Display Name: {appName} {environment} Alerts
```

### Subscribing to Alerts

**Email Subscription:**
```typescript
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

monitoring.alertTopic.addSubscription(
  new subscriptions.EmailSubscription('ops@digistratum.com')
);
```

**Slack via AWS Chatbot:**
```typescript
import * as chatbot from 'aws-cdk-lib/aws-chatbot';

const slackChannel = new chatbot.SlackChannelConfiguration(this, 'SlackChannel', {
  slackChannelConfigurationName: 'ds-alerts',
  slackWorkspaceId: 'YOUR_WORKSPACE_ID',
  slackChannelId: 'YOUR_CHANNEL_ID',
});

slackChannel.addNotificationTopic(monitoring.alertTopic);
```

**Lambda Subscription (custom processing):**
```typescript
monitoring.alertTopic.addSubscription(
  new subscriptions.LambdaSubscription(alertProcessorFunction)
);
```

### Alert Message Format

CloudWatch alarms send JSON to SNS:

```json
{
  "AlarmName": "ds-app-skeleton-prod-high-error-rate",
  "AlarmDescription": "Error rate exceeded 5% for ds-app-skeleton in prod",
  "AWSAccountId": "123456789012",
  "NewStateValue": "ALARM",
  "NewStateReason": "Threshold Crossed: 2 datapoints exceeded threshold",
  "StateChangeTime": "2026-02-19T10:00:00.000+0000",
  "Region": "US West (Oregon)",
  "Trigger": {
    "MetricName": "Errors",
    "Namespace": "AWS/Lambda",
    "Statistic": "SUM",
    "Period": 300,
    "EvaluationPeriods": 3,
    "Threshold": 5.0
  }
}
```

---

## PagerDuty Integration

### Integration Options

**Option 1: Direct CloudWatch Integration (Recommended)**

PagerDuty's native CloudWatch integration provides the best experience:

1. Create a CloudWatch integration in PagerDuty:
   - Go to Services → Select Service → Integrations → Add Integration
   - Select "Amazon CloudWatch"
   - Copy the Integration URL

2. Create an SNS subscription in CDK:
```typescript
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

const pagerDutyUrl = ssm.StringParameter.valueForStringParameter(
  this, '/ds-app-skeleton/pagerduty-integration-url'
);

monitoring.alertTopic.addSubscription(
  new subscriptions.UrlSubscription(pagerDutyUrl, {
    protocol: sns.SubscriptionProtocol.HTTPS,
  })
);
```

**Option 2: Events API v2 via Lambda**

For custom alert enrichment:

```typescript
// Lambda function to transform and forward to PagerDuty
const pagerDutyForwarder = new lambda.Function(this, 'PagerDutyForwarder', {
  functionName: `${appName}-pagerduty-forwarder-${environment}`,
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
    const https = require('https');
    
    exports.handler = async (event) => {
      const snsMessage = JSON.parse(event.Records[0].Sns.Message);
      
      const pagerDutyPayload = {
        routing_key: process.env.PAGERDUTY_ROUTING_KEY,
        event_action: snsMessage.NewStateValue === 'ALARM' ? 'trigger' : 'resolve',
        dedup_key: snsMessage.AlarmName,
        payload: {
          summary: \`[\${snsMessage.NewStateValue}] \${snsMessage.AlarmName}\`,
          severity: snsMessage.NewStateValue === 'ALARM' ? 'error' : 'info',
          source: 'AWS CloudWatch',
          custom_details: {
            alarm_description: snsMessage.AlarmDescription,
            reason: snsMessage.NewStateReason,
            region: snsMessage.Region,
            account: snsMessage.AWSAccountId,
          },
        },
      };
      
      // Send to PagerDuty Events API v2
      // Implementation details omitted for brevity
    };
  `),
  environment: {
    PAGERDUTY_ROUTING_KEY: '{{resolve:secretsmanager:pagerduty-routing-key}}',
  },
});

monitoring.alertTopic.addSubscription(
  new subscriptions.LambdaSubscription(pagerDutyForwarder)
);
```

### PagerDuty Configuration Best Practices

1. **Service Structure:**
   - Create one PagerDuty service per application
   - Use urgency rules to route based on environment (prod = high, staging = low)

2. **Alert Grouping:**
   - Enable intelligent alert grouping
   - Use `AlarmName` as the dedup key

3. **Escalation Policies:**
   - Prod: Immediate escalation, 5-minute timeout
   - Staging: Delayed escalation (15 min), business hours only

4. **Maintenance Windows:**
   - Create windows for planned deployments
   - Suppress alerts during infrastructure updates

### Storing PagerDuty Credentials

```bash
# Store routing key in Secrets Manager
aws secretsmanager create-secret \
  --name pagerduty-routing-key \
  --secret-string "YOUR_PAGERDUTY_ROUTING_KEY"

# Store integration URL in Parameter Store (not secret)
aws ssm put-parameter \
  --name /ds-app-skeleton/pagerduty-integration-url \
  --value "https://events.pagerduty.com/integration/YOUR_INTEGRATION_KEY/enqueue" \
  --type String
```

---

## CDK Implementation

### Basic Usage

```typescript
import { Monitoring, PerformanceBaselines } from './constructs';

// In your stack
const monitoring = new Monitoring(this, 'Monitoring', {
  appName: 'ds-app-skeleton',
  environment: 'prod',
  lambdaFunction: apiHandler,
  apiId: httpApi.apiId,
  region: this.region,
  tableName: table.tableName,
});

// Add email subscription
monitoring.alertTopic?.addSubscription(
  new subscriptions.EmailSubscription('ops@digistratum.com')
);
```

### Custom Thresholds

```typescript
const monitoring = new Monitoring(this, 'Monitoring', {
  appName: 'ds-app-skeleton',
  environment: 'prod',
  lambdaFunction: apiHandler,
  apiId: httpApi.apiId,
  region: this.region,
  
  // Custom thresholds
  errorRateThreshold: 2,      // 2% instead of default 5%
  latencyThresholdMs: 300,    // 300ms instead of default 500ms
  serverErrorThreshold: 5,    // 5 per minute instead of default 10
});
```

### Adding Custom Alarms

```typescript
// Add a custom alarm for a specific use case
const customAlarm = monitoring.createAlarm('HighTrafficAlarm', {
  alarmName: `${appName}-${environment}-high-traffic`,
  alarmDescription: 'Traffic spike detected',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ApiGateway',
    metricName: 'Count',
    dimensionsMap: { ApiId: httpApi.apiId },
    statistic: 'Sum',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 10000, // 10k requests per 5 minutes
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
});
```

### Adding Custom Dashboard Widgets

```typescript
// Add a custom widget to the dashboard
monitoring.addCustomMetric(
  new cloudwatch.GraphWidget({
    title: 'Custom Business Metric',
    left: [
      new cloudwatch.Metric({
        namespace: 'DS/AppSkeleton',
        metricName: 'OrdersCreated',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
    ],
    width: 12,
    height: 6,
  })
);
```

### Full Stack Example

```typescript
// skeleton-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Monitoring } from './constructs';

// ... after creating Lambda, API Gateway, DynamoDB ...

// Add monitoring
const monitoring = new Monitoring(this, 'Monitoring', {
  appName: 'ds-app-skeleton',
  environment: props.environment,
  lambdaFunction: apiHandler,
  apiId: httpApi.apiId,
  region: this.region,
  tableName: table.tableName,
  enableAlarms: props.environment !== 'dev',
});

// Add alert subscribers based on environment
if (props.environment === 'prod') {
  // PagerDuty for prod
  monitoring.alertTopic?.addSubscription(
    new subscriptions.UrlSubscription(
      ssm.StringParameter.valueForStringParameter(
        this, '/ds-app-skeleton/pagerduty-integration-url'
      ),
      { protocol: sns.SubscriptionProtocol.HTTPS }
    )
  );
}

if (props.environment === 'staging' || props.environment === 'prod') {
  // Email for staging and prod
  monitoring.alertTopic?.addSubscription(
    new subscriptions.EmailSubscription('team@digistratum.com')
  );
}
```

---

## CloudWatch Logs Insights

### Standard Queries

**Error Rate by Endpoint (5-minute windows):**
```sql
fields @timestamp, path, @message
| filter msg = "request completed"
| stats count(*) as total,
        sum(case when status >= 500 then 1 else 0 end) as errors,
        (sum(case when status >= 500 then 1 else 0 end) * 100.0 / count(*)) as error_rate
  by bin(5m) as time_window, path
| sort time_window desc
```

**Latency Percentiles:**
```sql
fields @timestamp, duration_ms
| filter msg = "request completed"
| stats percentile(duration_ms, 50) as p50,
        percentile(duration_ms, 95) as p95,
        percentile(duration_ms, 99) as p99,
        max(duration_ms) as max
  by bin(5m)
| sort @timestamp desc
```

**Slow Requests (> 500ms):**
```sql
fields @timestamp, method, path, duration_ms, correlation_id
| filter msg = "request completed" and duration_ms > 500
| sort duration_ms desc
| limit 100
```

**Trace a Request:**
```sql
fields @timestamp, level, msg, @message
| filter correlation_id = "YOUR-CORRELATION-ID"
| sort @timestamp asc
```

**Errors by Type:**
```sql
fields @timestamp, level, msg, error
| filter level = "ERROR"
| stats count(*) as count by msg
| sort count desc
| limit 20
```

**Cold Starts (Init Duration):**
```sql
filter @type = "REPORT"
| stats count(*) as invocations,
        count(@initDuration) as cold_starts,
        avg(@initDuration) as avg_cold_start_ms,
        max(@initDuration) as max_cold_start_ms
  by bin(1h)
```

**User Activity:**
```sql
fields @timestamp, user_id, method, path
| filter user_id != ""
| stats count(*) as requests by user_id
| sort requests desc
| limit 50
```

### Creating Saved Queries

Save frequently used queries in CloudWatch Logs Insights for quick access:

1. Run the query
2. Click "Save"
3. Name it descriptively (e.g., "DS-Skeleton: Error Rate by Endpoint")

---

## Runbooks

### High Error Rate

**Symptoms:**
- `high-error-rate` alarm triggers
- Error rate > 5%

**Investigation:**
1. Check CloudWatch Logs for recent errors:
   ```sql
   fields @timestamp, msg, error, correlation_id, path
   | filter level = "ERROR"
   | sort @timestamp desc
   | limit 50
   ```

2. Identify error patterns:
   ```sql
   fields msg, error
   | filter level = "ERROR"
   | stats count(*) by msg, error
   | sort @count desc
   ```

3. Check for deployment correlation:
   - When did errors start?
   - Was there a recent deployment?

4. Check dependencies:
   - DSAccount SSO reachable?
   - DynamoDB throttling?

**Remediation:**
- If deployment-related: rollback
- If dependency failure: check dependency health
- If capacity: increase Lambda memory or concurrency

---

### High Latency

**Symptoms:**
- `high-latency` alarm triggers
- P95 latency > 500ms

**Investigation:**
1. Check which endpoints are slow:
   ```sql
   fields path, duration_ms
   | filter msg = "request completed"
   | stats percentile(duration_ms, 95) as p95 by path
   | sort p95 desc
   ```

2. Check for cold starts:
   ```sql
   filter @type = "REPORT"
   | fields @initDuration, @duration
   | filter @initDuration > 0
   | stats count(*) as cold_starts, avg(@initDuration) as avg_init
   ```

3. Check DynamoDB latency:
   - Look at DynamoDB dashboard widgets
   - Check for throttling

**Remediation:**
- If cold starts: enable provisioned concurrency
- If DynamoDB slow: check table design, add indexes
- If Lambda slow: increase memory (also increases CPU)

---

### 5XX Errors Spike

**Symptoms:**
- `5xx-errors` alarm triggers
- Multiple 5XX responses

**Investigation:**
1. Check for panics:
   ```sql
   fields @timestamp, correlation_id, error, path
   | filter msg = "panic recovered"
   | sort @timestamp desc
   ```

2. Check Lambda errors:
   ```sql
   fields @timestamp, @message
   | filter @message like /ERROR/
   | sort @timestamp desc
   | limit 50
   ```

3. Check for resource exhaustion:
   - Lambda memory usage
   - Concurrent execution limits

**Remediation:**
- If panic: deploy fix for root cause
- If resource exhaustion: increase limits
- If dependency: implement circuit breaker

---

### Lambda Throttling

**Symptoms:**
- `lambda-throttles` alarm triggers
- 429 errors from API Gateway

**Investigation:**
1. Check concurrent executions in dashboard
2. Check for burst traffic:
   ```sql
   fields @timestamp
   | filter @type = "REPORT"
   | stats count(*) as invocations by bin(1m)
   | sort @timestamp desc
   ```

**Remediation:**
- Request concurrency limit increase (AWS support)
- Enable reserved concurrency
- Implement request throttling at API Gateway level

---

### DynamoDB Throttling

**Symptoms:**
- `dynamodb-throttles` alarm triggers
- Increased latency

**Investigation:**
1. Check capacity consumption in dashboard
2. Identify hot keys:
   - Look for specific partition keys in logs
   - Check access patterns

**Remediation:**
- DynamoDB PAY_PER_REQUEST mode auto-scales
- If hot key: redesign partition key strategy
- Consider DAX for read-heavy workloads

---

## Cost Optimization

### Monitoring Costs

| Component | Cost Driver | Optimization |
|-----------|-------------|--------------|
| CloudWatch Metrics | Number of metrics | Use standard metrics (free) |
| CloudWatch Alarms | Number of alarms | Only alarm on critical metrics |
| CloudWatch Logs | Data ingested | Log at INFO, not DEBUG in prod |
| CloudWatch Dashboard | Number of metrics queried | Limit dashboard refresh rate |
| SNS | Number of notifications | Use appropriate alarm thresholds |

### Cost-Effective Practices

1. **Use standard metrics** — Lambda, API Gateway, DynamoDB all emit free metrics
2. **Avoid custom metrics** unless necessary — Each custom metric costs ~$0.30/month
3. **Set appropriate log retention** — 30 days for dev, 90 days for prod
4. **Use Logs Insights sparingly** — Charged per GB scanned
5. **Batch alarm evaluations** — Longer periods = fewer evaluations

### Log Retention Configuration

```typescript
import * as logs from 'aws-cdk-lib/aws-logs';

// Set log retention in Lambda
new lambda.Function(this, 'ApiHandler', {
  // ... other props
  logRetention: isProd 
    ? logs.RetentionDays.THREE_MONTHS 
    : logs.RetentionDays.ONE_WEEK,
});
```

---

## Appendix: Alarm ARN Patterns

For external integrations, alarm ARNs follow this pattern:

```
arn:aws:cloudwatch:{region}:{account}:alarm:{alarm-name}

# Example
arn:aws:cloudwatch:us-west-2:123456789012:alarm:ds-app-skeleton-prod-high-error-rate
```

---

*Document version: 1.0.0*
*Last updated: 2026-02-19*
