import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SharedRuntimeCdn } from './constructs';

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
}

/**
 * Standalone stack for the Shared Runtime CDN.
 * 
 * This serves the @ds/core UMD bundle and other shared libraries
 * via CloudFront for cross-origin dynamic imports across *.digistratum.com.
 * 
 * Usage:
 *   npx cdk deploy DSSharedRuntimeStack
 *   ./scripts/deploy-shared-runtime.sh  # Upload UMD bundles
 */
export class SharedRuntimeStack extends cdk.Stack {
  public readonly sharedRuntime: SharedRuntimeCdn;

  constructor(scope: Construct, id: string, props: SharedRuntimeStackProps) {
    super(scope, id, props);

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
  }
}
