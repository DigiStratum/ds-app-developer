import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ComponentArtifactsProps {
  /**
   * Optional bucket name. Defaults to 'ds-component-artifacts'.
   */
  bucketName?: string;

  /**
   * Environment (dev, staging, prod). Affects lifecycle/removal policies.
   * @default 'prod'
   */
  environment?: string;
}

/**
 * S3 bucket for component artifact storage.
 * 
 * Structure: {component-name}/{version}.tar.gz
 * 
 * Access is via presigned URLs - no CloudFront distribution.
 * Versioning is enabled to maintain artifact history.
 * 
 * @example
 * ```typescript
 * const artifacts = new ComponentArtifacts(this, 'Artifacts', {
 *   environment: 'prod',
 * });
 * 
 * // Grant a Lambda function permission to upload/download
 * artifacts.bucket.grantReadWrite(myLambda);
 * 
 * // Grant presigned URL generation
 * artifacts.grantPresignedUrlAccess(myRole);
 * ```
 */
export class ComponentArtifacts extends Construct {
  /**
   * The S3 bucket storing component artifacts.
   */
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: ComponentArtifactsProps = {}) {
    super(scope, id);

    const environment = props.environment ?? 'prod';
    const isProd = environment === 'prod';
    const bucketName = props.bucketName ?? 'ds-component-artifacts';

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName,
      
      // Security: block all public access, use presigned URLs
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      
      // Enable versioning for artifact history
      versioned: true,
      
      // Environment-specific retention
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
      
      // Encryption at rest
      encryption: s3.BucketEncryption.S3_MANAGED,
      
      // Enable server access logging for audit (optional, can be added later)
      // serverAccessLogsBucket: logBucket,
      // serverAccessLogsPrefix: 'component-artifacts-logs/',
    });

    // Add lifecycle rule to move old versions to cheaper storage
    // Keep current version accessible, transition non-current to IA after 30 days
    this.bucket.addLifecycleRule({
      id: 'TransitionOldVersions',
      enabled: true,
      noncurrentVersionExpiration: cdk.Duration.days(365),
      noncurrentVersionTransitions: [
        {
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(30),
        },
      ],
    });

    // Tag for cost allocation
    cdk.Tags.of(this.bucket).add('Purpose', 'component-artifacts');
    cdk.Tags.of(this.bucket).add('Environment', environment);
  }

  /**
   * Grant read access to the bucket.
   */
  grantRead(grantee: iam.IGrantable): iam.Grant {
    return this.bucket.grantRead(grantee);
  }

  /**
   * Grant read/write access to the bucket.
   */
  grantReadWrite(grantee: iam.IGrantable): iam.Grant {
    return this.bucket.grantReadWrite(grantee);
  }

  /**
   * Grant permissions needed for presigned URL generation.
   * This grants GetObject for downloads and PutObject for uploads.
   */
  grantPresignedUrlAccess(grantee: iam.IGrantable): iam.Grant {
    return this.bucket.grantReadWrite(grantee);
  }
}
