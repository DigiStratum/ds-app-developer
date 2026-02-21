import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';

export interface AppStackProps extends cdk.StackProps {
  environment: string;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const isProd = environment === 'prod';
    
    // TODO: Update these values for your app
    const appName = 'ds-app-developer';
    const appId = 'myapp'; // Your app's ID in DSAccount

    // ============================================================
    // DynamoDB Table (single-table design)
    // ============================================================
    const table = new dynamodb.Table(this, 'Table', {
      tableName: `${appName}-${environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: isProd,
      timeToLiveAttribute: 'TTL',
    });

    // GSI for additional access patterns
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ============================================================
    // SSO Configuration
    // ============================================================
    const ssoConfig = {
      dsAccountUrl: isProd 
        ? 'https://account.digistratum.com'
        : 'https://account.digistratum.com', // Use prod DSAccount for dev too, or change
      appId: appId,
      // TODO: Set redirect URI for your domain
      redirectUri: isProd
        ? `https://${appName}.digistratum.com/api/auth/sso/callback`
        : `https://${appName}-dev.digistratum.com/api/auth/sso/callback`,
    };

    // ============================================================
    // Secrets (create in AWS Secrets Manager before deploying)
    // ============================================================
    // Create secret with: aws secretsmanager create-secret --name myapp/secrets --secret-string '{"JWT_SECRET":"xxx","SSO_APP_SECRET":"yyy"}'
    const secrets = isProd
      ? secretsmanager.Secret.fromSecretNameV2(this, 'Secrets', `${appId}/secrets`)
      : undefined;

    // ============================================================
    // Lambda Function (API)
    // ============================================================
    const apiFunction = new lambda.Function(this, 'ApiFunction', {
      functionName: `${appName}-api-${environment}`,
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: 'bootstrap',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        ENVIRONMENT: environment,
        DYNAMODB_TABLE: table.tableName,
        JWT_SECRET: isProd && secrets
          ? secrets.secretValueFromJson('JWT_SECRET').unsafeUnwrap()
          : 'dev-jwt-secret-change-me',
        SSO_DSACCOUNT_URL: ssoConfig.dsAccountUrl,
        SSO_APP_ID: ssoConfig.appId,
        SSO_APP_SECRET: isProd && secrets
          ? secrets.secretValueFromJson('SSO_APP_SECRET').unsafeUnwrap()
          : 'dev-sso-secret-change-me',
        SSO_REDIRECT_URI: ssoConfig.redirectUri,
      },
      architecture: lambda.Architecture.ARM_64,
    });

    // Grant Lambda access to DynamoDB
    table.grantReadWriteData(apiFunction);

    // Grant Lambda access to secrets (if prod)
    if (isProd && secrets) {
      secrets.grantRead(apiFunction);
    }

    // ============================================================
    // API Gateway
    // ============================================================
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${appName}-api-${environment}`,
      description: `${appName} API`,
      deployOptions: {
        stageName: environment,
        throttlingBurstLimit: isProd ? 200 : 50,
        throttlingRateLimit: isProd ? 100 : 20,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        allowCredentials: true,
      },
    });

    // Proxy all requests to Lambda
    const lambdaIntegration = new apigateway.LambdaIntegration(apiFunction);
    api.root.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
    });

    // ============================================================
    // S3 Bucket for Frontend
    // ============================================================
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${appName}-frontend-${environment}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    // ============================================================
    // CloudFront Function for SPA routing
    // ============================================================
    const spaRewriteFunction = new cloudfront.Function(this, 'SpaRewriteFunction', {
      functionName: `${appName}-spa-rewrite-${environment}`,
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(__dirname, 'edge-functions/spa-rewrite.js'),
      }),
      comment: 'Rewrite SPA routes to /index.html',
    });

    // ============================================================
    // CloudFront Distribution
    // ============================================================
    // TODO: Add custom domain and certificate for production
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${appName} ${environment}`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: spaRewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.RestApiOrigin(api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    // ============================================================
    // Deploy frontend to S3
    // ============================================================
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist'))],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront URL (use this for accessing the app)',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: table.tableName,
      description: 'DynamoDB Table Name',
    });
  }
}
