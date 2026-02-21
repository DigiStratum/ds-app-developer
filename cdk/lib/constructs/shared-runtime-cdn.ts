import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

export interface SharedRuntimeCdnProps {
  /**
   * Domain name for the CDN (e.g., "apps.ds.com")
   */
  domainName: string;

  /**
   * Route53 hosted zone ID for ds.com
   */
  hostedZoneId: string;

  /**
   * Zone name (e.g., "ds.com")
   */
  zoneName: string;

  /**
   * List of allowed origins for CORS (e.g., ["*.ds.com"])
   */
  allowedOrigins?: string[];
}

/**
 * SharedRuntimeCdn construct creates an S3 bucket and CloudFront distribution
 * for serving shared runtime assets (like @ds/core UMD bundle) with proper
 * CORS headers for cross-origin dynamic imports.
 */
export class SharedRuntimeCdn extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly domainName: string;

  constructor(scope: Construct, id: string, props: SharedRuntimeCdnProps) {
    super(scope, id);

    this.domainName = props.domainName;

    // S3 bucket for shared runtime assets
    this.bucket = new s3.Bucket(this, 'SharedRuntimeBucket', {
      bucketName: `ds-shared-runtime-${cdk.Stack.of(this).account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true,
      // CORS configuration for dynamic imports
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: props.allowedOrigins ?? ['https://*.ds.com'],
          allowedHeaders: ['*'],
          exposedHeaders: ['Content-Length', 'Content-Type', 'ETag'],
          maxAge: 3600,
        },
      ],
    });

    // Hosted zone lookup
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.zoneName,
    });

    // ACM certificate - MUST be in us-east-1 for CloudFront
    const certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
      domainName: props.domainName,
      hostedZone,
      region: 'us-east-1', // CloudFront requires us-east-1
    });

    // Response headers policy for CORS
    const corsResponseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'CorsPolicy', {
      responseHeadersPolicyName: 'SharedRuntimeCorsPolicy',
      comment: 'CORS policy for shared runtime assets (dynamic imports)',
      corsBehavior: {
        accessControlAllowOrigins: props.allowedOrigins ?? ['https://*.ds.com'],
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: ['GET', 'HEAD', 'OPTIONS'],
        accessControlExposeHeaders: ['Content-Length', 'Content-Type', 'ETag'],
        accessControlAllowCredentials: false,
        accessControlMaxAge: cdk.Duration.hours(1),
        originOverride: true,
      },
    });

    // Cache policy for versioned assets (long cache) and latest (short cache)
    const versionedCachePolicy = new cloudfront.CachePolicy(this, 'VersionedCachePolicy', {
      cachePolicyName: 'SharedRuntimeVersionedCachePolicy',
      comment: 'Cache policy for versioned runtime assets (1 year)',
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    const latestCachePolicy = new cloudfront.CachePolicy(this, 'LatestCachePolicy', {
      cachePolicyName: 'SharedRuntimeLatestCachePolicy',
      comment: 'Cache policy for latest runtime assets (5 minutes)',
      defaultTtl: cdk.Duration.minutes(5),
      maxTtl: cdk.Duration.minutes(15),
      minTtl: cdk.Duration.minutes(1),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // CloudFront function for routing /core/latest/* to actual files
    const routingFunction = new cloudfront.Function(this, 'RoutingFunction', {
      functionName: 'SharedRuntimeRouting',
      comment: 'Route latest and versioned paths to S3 objects',
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  // Normalize URI - remove leading slash for S3 key matching
  // S3 structure: core/latest/ds-core.umd.js, core/v1.0.0/ds-core.umd.js
  // URIs come in as: /core/latest/ds-core.umd.js
  
  // Remove leading slash if present
  if (uri.startsWith('/')) {
    request.uri = uri;
  }
  
  return request;
}
      `),
    });

    // CloudFront distribution
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(this.bucket);

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'Shared Runtime CDN (apps.ds.com)',
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: versionedCachePolicy,
        responseHeadersPolicy: corsResponseHeadersPolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        functionAssociations: [
          {
            function: routingFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        '/*/latest/*': {
          origin: s3Origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: latestCachePolicy,
          responseHeadersPolicy: corsResponseHeadersPolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          functionAssociations: [
            {
              function: routingFunction,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
      },
      domainNames: [props.domainName],
      certificate,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Route53 record
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(this.distribution)),
    });

    // Outputs
    new cdk.CfnOutput(this, 'SharedRuntimeBucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket for shared runtime assets',
    });

    new cdk.CfnOutput(this, 'SharedRuntimeDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID for shared runtime',
    });

    new cdk.CfnOutput(this, 'SharedRuntimeUrl', {
      value: `https://${props.domainName}`,
      description: 'Shared runtime CDN URL',
    });

    new cdk.CfnOutput(this, 'DsCoreLatestUrl', {
      value: `https://${props.domainName}/core/latest/ds-core.umd.js`,
      description: 'URL for latest @ds/core UMD bundle',
    });
  }
}
