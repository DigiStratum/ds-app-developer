import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SharedRuntimeCdn, ComponentArtifacts } from './constructs';

export interface SharedRuntimeStackProps extends cdk.StackProps {
  /**
   * Domain name for the CDN (e.g., "apps.digistratum.com")
   */
  domainName: string;

  /**
   * Route53 hosted zone ID
   */
  hostedZoneId: string;

  /**
   * Zone name (e.g., "digistratum.com")
   */
  zoneName: string;

  /**
   * Environment (dev, staging, prod)
   * @default 'prod'
   */
  environment?: string;
}

/**
 * Standalone stack for shared runtime infrastructure.
 * 
 * Includes:
 * - Shared Runtime CDN (apps.digistratum.com) for @ds/core UMD bundle
 * - Component Artifacts bucket (ds-component-artifacts) for component tarballs
 * 
 * Usage:
 *   npx cdk deploy DSSharedRuntimeStack
 *   ./scripts/deploy-shared-runtime.sh  # Upload UMD bundles
 */
export class SharedRuntimeStack extends cdk.Stack {
  public readonly sharedRuntime: SharedRuntimeCdn;
  public readonly componentArtifacts: ComponentArtifacts;

  constructor(scope: Construct, id: string, props: SharedRuntimeStackProps) {
    super(scope, id, props);

    const environment = props.environment ?? 'prod';

    this.sharedRuntime = new SharedRuntimeCdn(this, 'SharedRuntime', {
      domainName: props.domainName,
      hostedZoneId: props.hostedZoneId,
      zoneName: props.zoneName,
      allowedOrigins: [
        'https://*.digistratum.com',
        'https://*.ds.com',
        'http://localhost:*',
        'http://127.0.0.1:*',
      ],
    });

    // Component artifacts bucket for storing component tarballs
    // Structure: {component-name}/{version}.tar.gz
    // Access: via presigned URLs
    this.componentArtifacts = new ComponentArtifacts(this, 'ComponentArtifacts', {
      bucketName: 'ds-component-artifacts',
      environment,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ComponentArtifactsBucketName', {
      value: this.componentArtifacts.bucket.bucketName,
      description: 'S3 bucket name for component artifacts',
    });

    new cdk.CfnOutput(this, 'ComponentArtifactsBucketArn', {
      value: this.componentArtifacts.bucket.bucketArn,
      description: 'S3 bucket ARN for component artifacts',
    });
  }
}
