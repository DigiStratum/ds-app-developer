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
import { Construct } from 'constructs';
import * as path from 'path';
import { Monitoring } from './constructs';

interface AppStackProps extends cdk.StackProps {
  domainName: string;
  hostedZoneId: string;
  dsAccountUrl: string;
  dsAccountAppId: string;
  appName: string;  // e.g., "ds-app-developer"
  environment?: string;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const environment = props.environment ?? 'dev';
    const isProd = environment === 'prod';
    const isStaging = environment === 'staging';
    const appName = props.appName;

    // DynamoDB table (single-table design) [FR-TENANT-003]
    const table = new dynamodb.Table(this, 'Table', {
      tableName: appName,
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

    // Lambda function for API
    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      functionName: `${appName}-api`,
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: 'bootstrap',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        DYNAMODB_TABLE: table.tableName,
        DSACCOUNT_SSO_URL: props.dsAccountUrl,
        DSACCOUNT_APP_ID: props.dsAccountAppId,
        APP_URL: `https://${props.domainName}`,
        // DSACCOUNT_APP_SECRET is injected post-deploy by GitHub Actions
        // This keeps secrets out of CloudFormation templates
      },
    });

    table.grantReadWriteData(apiHandler);

    // HTTP API Gateway
    const httpApi = new apigateway.HttpApi(this, 'HttpApi', {
      apiName: `${appName}-api`,
      corsPreflight: {
        allowOrigins: [`https://${props.domainName}`],
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

    // S3 bucket for frontend
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${appName}-frontend-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Hosted zone lookup
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: 'digistratum.com',
    });

    // ACM certificate - MUST be in us-east-1 for CloudFront
    // Using DnsValidatedCertificate for cross-region support
    const certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
      domainName: props.domainName,
      hostedZone,
      region: 'us-east-1', // CloudFront requires us-east-1
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
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
      domainNames: [props.domainName],
      certificate,
    });

    // Route53 record
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(distribution)),
    });

    // Monitoring [NFR-MON-001, NFR-MON-002, NFR-MON-003]
    new Monitoring(this, 'Monitoring', {
      appName,
      environment,
      lambdaFunction: apiHandler,
      apiId: httpApi.apiId,
      region: this.region,
      tableName: table.tableName,
      enableAlarms: isProd || isStaging,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: apiHandler.functionName,
    });
  }
}
