import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';

/**
 * Properties for the Monitoring construct
 */
export interface MonitoringProps {
  /**
   * Application name used in resource naming
   */
  appName: string;

  /**
   * Environment name (dev, staging, prod)
   */
  environment: string;

  /**
   * Lambda function to monitor
   */
  lambdaFunction: lambda.IFunction;

  /**
   * API Gateway HTTP API ID for metrics
   */
  apiId: string;

  /**
   * AWS region for the API Gateway
   */
  region: string;

  /**
   * DynamoDB table name for metrics
   */
  tableName?: string;

  /**
   * Whether to enable alarms (typically false for dev)
   * @default true for prod/staging, false for dev
   */
  enableAlarms?: boolean;

  /**
   * Error rate threshold percentage to trigger alarm
   * @default 5 (5% error rate)
   */
  errorRateThreshold?: number;

  /**
   * Latency threshold in milliseconds for p95
   * @default 500
   */
  latencyThresholdMs?: number;

  /**
   * Threshold for 5xx errors per minute
   * @default 10
   */
  serverErrorThreshold?: number;

  /**
   * Whether to create SNS topic for alerts
   * @default true
   */
  createSnsTopic?: boolean;

  /**
   * Existing SNS topic ARN (if not creating new one)
   */
  alertTopicArn?: string;
}

/**
 * Performance baselines for the DS App Developer
 * These values are derived from requirements and testing
 */
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

/**
 * Monitoring - Reusable construct for CloudWatch dashboards and alarms
 * 
 * Creates a comprehensive monitoring setup including:
 * - CloudWatch Dashboard with key metrics
 * - Error rate alarms
 * - Latency alarms (p95, p99)
 * - 5xx response alarms
 * - Lambda error alarms
 * - SNS topic for alert notifications
 * 
 * @example
 * ```typescript
 * const monitoring = new Monitoring(this, 'Monitoring', {
 *   appName: 'myapp',
 *   environment: 'prod',
 *   lambdaFunction: api.function,
 *   apiId: api.api.apiId,
 *   region: this.region,
 *   tableName: table.tableName,
 * });
 * 
 * // Subscribe to alerts
 * monitoring.alertTopic.addSubscription(
 *   new subscriptions.EmailSubscription('ops@example.com')
 * );
 * ```
 */
export class Monitoring extends Construct {
  /**
   * The CloudWatch dashboard
   */
  public readonly dashboard: cloudwatch.Dashboard;

  /**
   * SNS topic for alert notifications
   */
  public readonly alertTopic?: sns.ITopic;

  /**
   * All alarms created by this construct
   */
  public readonly alarms: cloudwatch.Alarm[] = [];

  constructor(scope: Construct, id: string, props: MonitoringProps) {
    super(scope, id);

    const isProd = props.environment === 'prod';
    const isStaging = props.environment === 'staging';
    const enableAlarms = props.enableAlarms ?? (isProd || isStaging);

    // Create or reference SNS topic for alerts
    if (props.createSnsTopic !== false && enableAlarms) {
      this.alertTopic = new sns.Topic(this, 'AlertTopic', {
        topicName: `${props.appName}-alerts-${props.environment}`,
        displayName: `${props.appName} ${props.environment} Alerts`,
      });
    } else if (props.alertTopicArn) {
      this.alertTopic = sns.Topic.fromTopicArn(this, 'AlertTopic', props.alertTopicArn);
    }

    // Create CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${props.appName}-${props.environment}`,
    });

    // =============================================
    // Lambda Metrics
    // =============================================
    const lambdaInvocations = props.lambdaFunction.metricInvocations({
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    const lambdaErrors = props.lambdaFunction.metricErrors({
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    const lambdaDuration = props.lambdaFunction.metricDuration({
      statistic: 'p95',
      period: cdk.Duration.minutes(1),
    });

    const lambdaDurationP99 = props.lambdaFunction.metricDuration({
      statistic: 'p99',
      period: cdk.Duration.minutes(1),
    });

    const lambdaThrottles = props.lambdaFunction.metricThrottles({
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    const lambdaConcurrentExecutions = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'ConcurrentExecutions',
      dimensionsMap: {
        FunctionName: props.lambdaFunction.functionName,
      },
      statistic: 'Maximum',
      period: cdk.Duration.minutes(1),
    });

    // Lambda error rate (calculated)
    const lambdaErrorRate = new cloudwatch.MathExpression({
      expression: '(errors / invocations) * 100',
      usingMetrics: {
        errors: lambdaErrors,
        invocations: lambdaInvocations,
      },
      period: cdk.Duration.minutes(5),
      label: 'Error Rate %',
    });

    // =============================================
    // API Gateway Metrics
    // =============================================
    const apiRequests = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Count',
      dimensionsMap: {
        ApiId: props.apiId,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    const api4xxErrors = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '4XXError',
      dimensionsMap: {
        ApiId: props.apiId,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    const api5xxErrors = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5XXError',
      dimensionsMap: {
        ApiId: props.apiId,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    const apiLatency = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: {
        ApiId: props.apiId,
      },
      statistic: 'p95',
      period: cdk.Duration.minutes(1),
    });

    const apiLatencyP99 = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: {
        ApiId: props.apiId,
      },
      statistic: 'p99',
      period: cdk.Duration.minutes(1),
    });

    // =============================================
    // DynamoDB Metrics (if table provided)
    // =============================================
    let dynamoReadLatency: cloudwatch.Metric | undefined;
    let dynamoWriteLatency: cloudwatch.Metric | undefined;
    let dynamoThrottledRequests: cloudwatch.Metric | undefined;
    let dynamoConsumedRCU: cloudwatch.Metric | undefined;
    let dynamoConsumedWCU: cloudwatch.Metric | undefined;

    if (props.tableName) {
      dynamoReadLatency = new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'SuccessfulRequestLatency',
        dimensionsMap: {
          TableName: props.tableName,
          Operation: 'GetItem',
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(1),
      });

      dynamoWriteLatency = new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'SuccessfulRequestLatency',
        dimensionsMap: {
          TableName: props.tableName,
          Operation: 'PutItem',
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(1),
      });

      dynamoThrottledRequests = new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ThrottledRequests',
        dimensionsMap: {
          TableName: props.tableName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(1),
      });

      dynamoConsumedRCU = new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ConsumedReadCapacityUnits',
        dimensionsMap: {
          TableName: props.tableName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(1),
      });

      dynamoConsumedWCU = new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ConsumedWriteCapacityUnits',
        dimensionsMap: {
          TableName: props.tableName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(1),
      });
    }

    // =============================================
    // Dashboard Layout
    // =============================================
    
    // Row 1: Overview metrics (single stat widgets)
    this.dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'Requests (5m)',
        metrics: [apiRequests],
        width: 4,
        height: 4,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Error Rate %',
        metrics: [lambdaErrorRate],
        width: 4,
        height: 4,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'P95 Latency (ms)',
        metrics: [apiLatency],
        width: 4,
        height: 4,
      }),
      new cloudwatch.SingleValueWidget({
        title: '5XX Errors',
        metrics: [api5xxErrors],
        width: 4,
        height: 4,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Lambda Throttles',
        metrics: [lambdaThrottles],
        width: 4,
        height: 4,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Concurrent Executions',
        metrics: [lambdaConcurrentExecutions],
        width: 4,
        height: 4,
      }),
    );

    // Row 2: Request volume and errors
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Requests',
        left: [apiRequests],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Errors (4XX / 5XX)',
        left: [api4xxErrors],
        right: [api5xxErrors],
        width: 12,
        height: 6,
      }),
    );

    // Row 3: Latency metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Latency',
        left: [apiLatency, apiLatencyP99],
        leftAnnotations: [
          {
            value: PerformanceBaselines.apiLatencyP95Ms,
            label: 'P95 Target',
            color: '#ff9900',
          },
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration',
        left: [lambdaDuration, lambdaDurationP99],
        width: 12,
        height: 6,
      }),
    );

    // Row 4: Lambda metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Invocations vs Errors',
        left: [lambdaInvocations],
        right: [lambdaErrors],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Error Rate & Throttles',
        left: [lambdaErrorRate],
        right: [lambdaThrottles],
        leftAnnotations: [
          {
            value: PerformanceBaselines.maxErrorRatePercent,
            label: 'Max Error Rate',
            color: '#d13212',
          },
        ],
        width: 12,
        height: 6,
      }),
    );

    // Row 5: DynamoDB metrics (if table provided)
    if (props.tableName && dynamoReadLatency && dynamoWriteLatency && dynamoThrottledRequests && dynamoConsumedRCU && dynamoConsumedWCU) {
      this.dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'DynamoDB Latency',
          left: [dynamoReadLatency, dynamoWriteLatency],
          leftAnnotations: [
            {
              value: PerformanceBaselines.dynamoReadLatencyMs,
              label: 'Read Target',
              color: '#2ca02c',
            },
            {
              value: PerformanceBaselines.dynamoWriteLatencyMs,
              label: 'Write Target',
              color: '#ff7f0e',
            },
          ],
          width: 12,
          height: 6,
        }),
        new cloudwatch.GraphWidget({
          title: 'DynamoDB Capacity',
          left: [dynamoConsumedRCU, dynamoConsumedWCU],
          right: [dynamoThrottledRequests],
          width: 12,
          height: 6,
        }),
      );
    }

    // =============================================
    // Alarms
    // =============================================
    if (enableAlarms) {
      const errorRateThreshold = props.errorRateThreshold ?? 5;
      const latencyThreshold = props.latencyThresholdMs ?? PerformanceBaselines.apiLatencyP95Ms;
      const serverErrorThreshold = props.serverErrorThreshold ?? 10;

      // Alarm: High Error Rate
      const errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
        alarmName: `${props.appName}-${props.environment}-high-error-rate`,
        alarmDescription: `Error rate exceeded ${errorRateThreshold}% for ${props.appName} in ${props.environment}`,
        metric: lambdaErrorRate,
        threshold: errorRateThreshold,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      this.alarms.push(errorRateAlarm);

      // Alarm: High Latency (P95)
      const latencyAlarm = new cloudwatch.Alarm(this, 'LatencyAlarm', {
        alarmName: `${props.appName}-${props.environment}-high-latency`,
        alarmDescription: `P95 latency exceeded ${latencyThreshold}ms for ${props.appName} in ${props.environment}`,
        metric: apiLatency,
        threshold: latencyThreshold,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      this.alarms.push(latencyAlarm);

      // Alarm: 5XX Errors
      const serverErrorAlarm = new cloudwatch.Alarm(this, 'ServerErrorAlarm', {
        alarmName: `${props.appName}-${props.environment}-5xx-errors`,
        alarmDescription: `5XX errors exceeded ${serverErrorThreshold} per minute for ${props.appName} in ${props.environment}`,
        metric: api5xxErrors,
        threshold: serverErrorThreshold,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      this.alarms.push(serverErrorAlarm);

      // Alarm: Lambda Errors (absolute count)
      const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
        alarmName: `${props.appName}-${props.environment}-lambda-errors`,
        alarmDescription: `Lambda errors detected for ${props.appName} in ${props.environment}`,
        metric: lambdaErrors,
        threshold: 5,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      this.alarms.push(lambdaErrorAlarm);

      // Alarm: Lambda Throttles
      const throttleAlarm = new cloudwatch.Alarm(this, 'ThrottleAlarm', {
        alarmName: `${props.appName}-${props.environment}-lambda-throttles`,
        alarmDescription: `Lambda throttles detected for ${props.appName} in ${props.environment}`,
        metric: lambdaThrottles,
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      this.alarms.push(throttleAlarm);

      // DynamoDB throttle alarm
      if (dynamoThrottledRequests) {
        const dynamoThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoThrottleAlarm', {
          alarmName: `${props.appName}-${props.environment}-dynamodb-throttles`,
          alarmDescription: `DynamoDB throttles detected for ${props.appName} in ${props.environment}`,
          metric: dynamoThrottledRequests,
          threshold: 1,
          evaluationPeriods: 1,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        this.alarms.push(dynamoThrottleAlarm);
      }

      // Connect alarms to SNS topic
      if (this.alertTopic) {
        const snsAction = new cloudwatchActions.SnsAction(this.alertTopic);
        for (const alarm of this.alarms) {
          alarm.addAlarmAction(snsAction);
          alarm.addOkAction(snsAction);
        }
      }
    }

    // =============================================
    // Outputs
    // =============================================
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${props.region}.console.aws.amazon.com/cloudwatch/home?region=${props.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    if (this.alertTopic) {
      new cdk.CfnOutput(this, 'AlertTopicArn', {
        value: this.alertTopic.topicArn,
        description: 'SNS Topic ARN for alerts',
      });
    }
  }

  /**
   * Add custom metric to the dashboard
   */
  addCustomMetric(widget: cloudwatch.IWidget): void {
    this.dashboard.addWidgets(widget);
  }

  /**
   * Create a custom alarm with SNS notification
   */
  createAlarm(
    id: string,
    props: cloudwatch.AlarmProps
  ): cloudwatch.Alarm {
    const alarm = new cloudwatch.Alarm(this, id, props);
    this.alarms.push(alarm);

    if (this.alertTopic) {
      const snsAction = new cloudwatchActions.SnsAction(this.alertTopic);
      alarm.addAlarmAction(snsAction);
      alarm.addOkAction(snsAction);
    }

    return alarm;
  }
}
