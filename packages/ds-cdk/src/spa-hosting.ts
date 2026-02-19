import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import {
  BaseConstructProps,
  resourceName,
  applyStandardTags,
  isProdEnvironment,
} from './utils';

/**
 * Properties for the SpaHosting construct
 */
export interface SpaHostingProps extends BaseConstructProps {
  /**
   * Custom domain name for the distribution
   * @default undefined (use CloudFront domain)
   */
  domainName?: string;

  /**
   * ACM certificate for the custom domain
   * Required if domainName is specified
   */
  certificate?: acm.ICertificate;

  /**
   * Origin for API requests (typically API Gateway)
   */
  apiOrigin?: cloudfront.IOrigin;

  /**
   * Path patterns to route to API origin
   * @default ['/api/*']
   */
  apiPaths?: string[];

  /**
   * Additional CloudFront cache behaviors
   */
  additionalBehaviors?: Record<string, cloudfront.BehaviorOptions>;

  /**
   * Price class for CloudFront distribution
   * @default PriceClass.PRICE_CLASS_100 (North America, Europe)
   */
  priceClass?: cloudfront.PriceClass;

  /**
   * Enable versioning on the S3 bucket
   * @default true in prod, false otherwise
   */
  enableVersioning?: boolean;

  /**
   * Custom SPA rewrite function code
   * @default Built-in SPA rewrite function
   */
  customRewriteCode?: string;
}

/**
 * SpaHosting - Reusable construct for S3 + CloudFront SPA hosting
 *
 * Creates an S3 bucket for static assets, CloudFront distribution with
 * Origin Access Control, and SPA URL rewriting via CloudFront Function.
 *
 * @example
 * ```typescript
 * import { SpaHosting } from '@digistratum/ds-cdk';
 *
 * const hosting = new SpaHosting(this, 'Frontend', {
 *   appName: 'myapp',
 *   environment: 'prod',
 *   domainName: 'myapp.example.com',
 *   certificate: myCertificate,
 *   apiOrigin: new origins.HttpOrigin('api.example.com'),
 *   apiPaths: ['/api/*', '/auth/*'],
 * });
 * ```
 */
export class SpaHosting extends Construct {
  /**
   * The S3 bucket for frontend assets
   */
  public readonly bucket: s3.Bucket;

  /**
   * The CloudFront distribution
   */
  public readonly distribution: cloudfront.Distribution;

  /**
   * The SPA rewrite CloudFront Function
   */
  public readonly spaRewriteFunction: cloudfront.Function;

  constructor(scope: Construct, id: string, props: SpaHostingProps) {
    super(scope, id);

    const isProd = isProdEnvironment(props.environment);
    const account = cdk.Stack.of(this).account;

    // S3 bucket for frontend assets
    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: resourceName(
        {
          appName: props.appName,
          environment: props.environment,
          resourceType: 'frontend',
          includeAccount: true,
        },
        this
      ),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
      versioned: props.enableVersioning ?? isProd,
    });

    // CloudFront Function for SPA URL rewriting
    const defaultRewriteCode = `
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  // Don't rewrite API or auth requests
  if (uri.startsWith('/api/') || uri.startsWith('/auth/')) {
    return request;
  }
  
  // Don't rewrite requests for files (have extensions)
  if (uri.includes('.')) {
    return request;
  }
  
  // Rewrite to index.html for SPA routing
  request.uri = '/index.html';
  return request;
}
    `.trim();

    this.spaRewriteFunction = new cloudfront.Function(this, 'SpaRewrite', {
      functionName: resourceName({
        appName: props.appName,
        environment: props.environment,
        resourceType: 'spa-rewrite',
      }),
      comment: 'Rewrite SPA routes to /index.html',
      code: cloudfront.FunctionCode.fromInline(
        props.customRewriteCode ?? defaultRewriteCode
      ),
    });

    // Build API behaviors if apiOrigin is provided
    const additionalBehaviors: Record<string, cloudfront.BehaviorOptions> = {};

    if (props.apiOrigin) {
      const apiPaths = props.apiPaths ?? ['/api/*'];
      for (const path of apiPaths) {
        additionalBehaviors[path] = {
          origin: props.apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        };
      }
    }

    // Merge additional behaviors from props
    if (props.additionalBehaviors) {
      Object.assign(additionalBehaviors, props.additionalBehaviors);
    }

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${props.appName} ${props.environment}`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: this.spaRewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors,
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
      domainNames: props.domainName ? [props.domainName] : undefined,
      certificate: props.certificate,
      priceClass: props.priceClass ?? cloudfront.PriceClass.PRICE_CLASS_100,
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
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'Frontend S3 bucket name',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
    });

    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    if (props.domainName) {
      new cdk.CfnOutput(this, 'CustomDomain', {
        value: `https://${props.domainName}`,
        description: 'Custom domain URL',
      });
    }
  }

  /**
   * Get the URL for the distribution
   */
  get url(): string {
    return `https://${this.distribution.distributionDomainName}`;
  }

  /**
   * Get the CloudFront distribution ID
   */
  get distributionId(): string {
    return this.distribution.distributionId;
  }
}
