import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

/**
 * Properties for the ApiLambda construct
 */
export interface ApiLambdaProps {
  /**
   * Application name used in resource naming
   */
  appName: string;

  /**
   * Environment name (dev, staging, prod)
   */
  environment: string;

  /**
   * Path to the Lambda code asset (compiled binary)
   */
  codePath: string;

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
}

/**
 * ApiLambda - Reusable construct for Lambda + HTTP API Gateway pattern
 * 
 * Creates a Go Lambda function running on ARM64 with provided.al2023 runtime,
 * fronted by an HTTP API v2 with CORS configuration.
 * 
 * @example
 * ```typescript
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

    const isProd = props.environment === 'prod';

    // Lambda function - Go on ARM64
    this.function = new lambda.Function(this, 'Function', {
      functionName: `${props.appName}-api-${props.environment}`,
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: 'bootstrap',
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset(props.codePath),
      memorySize: props.memorySize ?? (isProd ? 512 : 256),
      timeout: props.timeout ?? cdk.Duration.seconds(30),
      reservedConcurrentExecutions: props.reservedConcurrentExecutions,
      environment: {
        ENVIRONMENT: props.environment,
        ...props.environmentVariables,
      },
    });

    // HTTP API v2 with CORS
    this.api = new apigateway.HttpApi(this, 'Api', {
      apiName: `${props.appName}-api-${props.environment}`,
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
}
