import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import {
  BaseConstructProps,
  resourceName,
  applyStandardTags,
  isProdEnvironment,
} from './utils';

/**
 * Properties for the ApiLambda construct
 */
export interface ApiLambdaProps extends BaseConstructProps {
  /**
   * Path to the Lambda code asset (compiled binary)
   */
  codePath: string;

  /**
   * Lambda runtime
   * @default PROVIDED_AL2023 (for Go/Rust/custom runtimes)
   */
  runtime?: lambda.Runtime;

  /**
   * Lambda handler name
   * @default 'bootstrap' (for custom runtimes)
   */
  handler?: string;

  /**
   * Lambda architecture
   * @default ARM_64
   */
  architecture?: lambda.Architecture;

  /**
   * Lambda memory size in MB
   * @default 512 for prod, 256 otherwise
   */
  memorySize?: number;

  /**
   * Lambda timeout
   * @default 30 seconds
   */
  timeout?: cdk.Duration;

  /**
   * Environment variables for the Lambda function
   */
  environmentVariables?: Record<string, string>;

  /**
   * Allowed CORS origins
   * @default ['*']
   */
  corsAllowOrigins?: string[];

  /**
   * Additional CORS allowed headers
   * @default ['Content-Type', 'Authorization', 'X-Tenant-ID']
   */
  corsAllowHeaders?: string[];

  /**
   * Reserved concurrent executions
   * @default undefined (no limit)
   */
  reservedConcurrentExecutions?: number;

  /**
   * Enable AWS X-Ray tracing
   * @default true in prod, false otherwise
   */
  enableTracing?: boolean;

  /**
   * Log retention in days
   * @default 30 for prod, 7 otherwise
   */
  logRetentionDays?: number;
}

/**
 * ApiLambda - Reusable construct for Lambda + HTTP API Gateway pattern
 *
 * Creates a Lambda function (optimized for Go on ARM64 by default) fronted
 * by an HTTP API v2 with CORS configuration.
 *
 * @example
 * ```typescript
 * import { ApiLambda } from '@digistratum/ds-cdk';
 *
 * const api = new ApiLambda(this, 'Api', {
 *   appName: 'myapp',
 *   environment: 'prod',
 *   codePath: path.join(__dirname, '../../backend/dist'),
 *   corsAllowOrigins: ['https://myapp.example.com'],
 * });
 *
 * table.grantReadWriteData(api.function);
 * ```
 */
export class ApiLambda extends Construct {
  /**
   * The Lambda function
   */
  public readonly function: lambda.Function;

  /**
   * The HTTP API Gateway
   */
  public readonly api: apigateway.HttpApi;

  constructor(scope: Construct, id: string, props: ApiLambdaProps) {
    super(scope, id);

    const isProd = isProdEnvironment(props.environment);

    // Lambda function
    this.function = new lambda.Function(this, 'Function', {
      functionName: resourceName({
        appName: props.appName,
        environment: props.environment,
        resourceType: 'api',
      }),
      runtime: props.runtime ?? lambda.Runtime.PROVIDED_AL2023,
      handler: props.handler ?? 'bootstrap',
      architecture: props.architecture ?? lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset(props.codePath),
      memorySize: props.memorySize ?? (isProd ? 512 : 256),
      timeout: props.timeout ?? cdk.Duration.seconds(30),
      reservedConcurrentExecutions: props.reservedConcurrentExecutions,
      tracing:
        props.enableTracing ?? isProd
          ? lambda.Tracing.ACTIVE
          : lambda.Tracing.DISABLED,
      environment: {
        ENVIRONMENT: props.environment,
        APP_NAME: props.appName,
        ...props.environmentVariables,
      },
    });

    // HTTP API v2 with CORS
    this.api = new apigateway.HttpApi(this, 'Api', {
      apiName: resourceName({
        appName: props.appName,
        environment: props.environment,
        resourceType: 'api',
      }),
      corsPreflight: {
        allowOrigins: props.corsAllowOrigins ?? ['*'],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowHeaders: props.corsAllowHeaders ?? [
          'Content-Type',
          'Authorization',
          'X-Tenant-ID',
        ],
        allowCredentials: true,
      },
    });

    // Proxy all requests to Lambda
    this.api.addRoutes({
      path: '/{proxy+}',
      methods: [apigateway.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration(
        'LambdaIntegration',
        this.function
      ),
    });

    // Apply standard tags
    if (props.applyTags !== false) {
      applyStandardTags(this, {
        appName: props.appName,
        environment: props.environment,
        costCenter: props.costCenter,
        owner: props.owner,
        additionalTags: props.additionalTags,
      });
    }

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.apiEndpoint,
      description: 'HTTP API endpoint URL',
    });

    new cdk.CfnOutput(this, 'FunctionName', {
      value: this.function.functionName,
      description: 'Lambda function name',
    });
  }

  /**
   * Get the API Gateway endpoint URL for use as CloudFront origin
   */
  get apiEndpoint(): string {
    return this.api.apiEndpoint;
  }

  /**
   * Get the API ID for constructing origin domain
   */
  get apiId(): string {
    return this.api.apiId;
  }

  /**
   * Get the API endpoint domain (without https://)
   */
  get apiDomain(): string {
    const region = cdk.Stack.of(this).region;
    return `${this.api.apiId}.execute-api.${region}.amazonaws.com`;
  }
}
