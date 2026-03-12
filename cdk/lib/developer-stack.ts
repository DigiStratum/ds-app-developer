import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';
import { Monitoring } from './constructs';

interface DeveloperStackProps extends cdk.StackProps {
  domainName: string;
  hostedZoneId: string;
  zoneName: string;
  dsAccountUrl: string;
  dsAccountAppId: string;
  environment?: string;
}

export class DeveloperStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DeveloperStackProps) {
    super(scope, id, props);

    const environment = props.environment ?? 'dev';
    const isProd = environment === 'prod';
    const isStaging = environment === 'staging';

    // Domain-based naming for AWS resources
    // domainName: use where dots are allowed (tags, logs, DynamoDB, S3)
    // resourcePrefix: use where dots are NOT allowed (Lambda, API Gateway, SNS, Dashboard)
    const domainName = props.domainName;
    const resourcePrefix = props.domainName.replace(/\./g, '-');

    // Apply standard tags to all resources in this stack for easy identification
    cdk.Tags.of(this).add('Application', domainName);
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    // CloudWatch Log Group for Lambda (dots allowed in log group names)
    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/lambda/${domainName}-api`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // DynamoDB table (dots allowed in table names)
    const table = new dynamodb.Table(this, 'Table', {
      tableName: domainName,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for queries by entity type within tenant
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // Lambda function for API (NO dots allowed in function names)
    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      functionName: `${resourcePrefix}-api`,
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: 'bootstrap',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      architecture: lambda.Architecture.ARM_64,
      logGroup: apiLogGroup,
      environment: {
        DYNAMODB_TABLE: table.tableName,
        DSACCOUNT_SSO_URL: props.dsAccountUrl,
        DSACCOUNT_APP_ID: props.dsAccountAppId,
        APP_URL: `https://${domainName}`,
        // DSACCOUNT_APP_SECRET is injected post-deploy by GitHub Actions
        // This keeps secrets out of CloudFormation templates
      },
    });

    table.grantReadWriteData(apiHandler);

    // HTTP API Gateway (NO dots allowed in API names)
    const httpApi = new apigateway.HttpApi(this, 'HttpApi', {
      apiName: `${resourcePrefix}-api`,
      corsPreflight: {
        allowOrigins: [`https://${domainName}`],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
        allowCredentials: true,
      },
    });

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigateway.HttpMethod.ANY],
      integration: new apigatewayIntegrations.HttpLambdaIntegration('LambdaIntegration', apiHandler),
    });

    // S3 bucket for frontend (dots allowed in bucket names)
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${domainName}-frontend-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Hosted zone lookup
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.zoneName,
    });

    // ACM certificate - MUST be in us-east-1 for CloudFront
    // Using DnsValidatedCertificate for cross-region support
    const certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
      domainName: domainName,
      hostedZone,
      region: 'us-east-1', // CloudFront requires us-east-1
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: domainName, // Visible in CloudFront console list view
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(`${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        '/auth/*': {
          origin: new origins.HttpOrigin(`${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        '/health': {
          origin: new origins.HttpOrigin(`${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
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
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      domainNames: [domainName],
      certificate,
    });

    // Route53 record
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(distribution)),
    });

    // Monitoring (uses resourcePrefix for SNS topic and dashboard names - no dots allowed)
    const monitoring = new Monitoring(this, 'Monitoring', {
      appName: resourcePrefix,
      environment,
      lambdaFunction: apiHandler,
      apiId: httpApi.apiId,
      region: this.region,
      tableName: table.tableName,
      enableAlarms: isProd || isStaging,
    });

    // Note: Shared Runtime CDN (apps.digistratum.com) is deployed via DSSharedRuntimeStack
    // See: npx cdk deploy DSSharedRuntimeStack
    // Asset deployment: ./scripts/deploy-shared-runtime.sh

    // ============================================================
    // OUTPUTS - Used by post-deploy manifest registration
    // ============================================================

    // Core identifiers
    new cdk.CfnOutput(this, 'AppDomain', {
      value: domainName,
      exportName: `${resourcePrefix}-domain`,
    });

    new cdk.CfnOutput(this, 'AwsAccount', {
      value: this.account,
      exportName: `${resourcePrefix}-account`,
    });

    new cdk.CfnOutput(this, 'AwsRegion', {
      value: this.region,
      exportName: `${resourcePrefix}-region`,
    });

    // DynamoDB
    new cdk.CfnOutput(this, 'DynamoTableName', {
      value: table.tableName,
    });

    new cdk.CfnOutput(this, 'DynamoTableArn', {
      value: table.tableArn,
    });

    // Lambda
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: apiHandler.functionName,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: apiHandler.functionArn,
    });

    // API Gateway
    new cdk.CfnOutput(this, 'ApiGatewayId', {
      value: httpApi.apiId,
    });

    new cdk.CfnOutput(this, 'ApiGatewayArn', {
      value: `arn:aws:apigateway:${this.region}::/apis/${httpApi.apiId}`,
    });

    new cdk.CfnOutput(this, 'ApiGatewayEndpoint', {
      value: httpApi.apiEndpoint,
    });

    // S3
    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'FrontendBucketArn', {
      value: frontendBucket.bucketArn,
    });

    // CloudFront
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, 'DistributionArn', {
      value: `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
    });

    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
    });

    // ACM Certificate
    new cdk.CfnOutput(this, 'CertificateArn', {
      value: certificate.certificateArn,
    });

    // CloudWatch Logs
    new cdk.CfnOutput(this, 'LogGroupName', {
      value: apiLogGroup.logGroupName,
    });

    new cdk.CfnOutput(this, 'LogGroupArn', {
      value: apiLogGroup.logGroupArn,
    });
  }
}
