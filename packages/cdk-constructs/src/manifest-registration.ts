/**
 * ManifestRegistration - Post-deploy manifest registration with DSAccount
 *
 * This construct provides a CustomResource that POSTs the app's manifest
 * to DSAccount after successful CDK deployment.
 *
 * @example
 * ```typescript
 * import { ManifestRegistration, AppManifestConfig } from '@digistratum/cdk-constructs';
 *
 * const manifest: AppManifestConfig = {
 *   dsAccountUrl: 'https://account.digistratum.com',
 *   appId: 'myapp',
 *   appSecretArn: 'arn:aws:secretsmanager:...',
 *   version: '1.0.0',
 *   healthCheckUrl: 'https://myapp.digistratum.com/health',
 *   cdkStack: 'MyAppStack',
 *   frontendRoutes: [
 *     { path: '/dashboard', name: 'Dashboard', authRequired: true },
 *   ],
 *   backendResources: [
 *     { name: 'items.list', path: '/api/items', methods: ['GET'], authType: 'jwt' },
 *   ],
 *   dependencies: [
 *     { appId: 'dsaccount', resourceName: 'auth.validate', required: true },
 *   ],
 * };
 *
 * new ManifestRegistration(this, 'Manifest', manifest);
 * ```
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

/**
 * Frontend route exposed by the application
 */
export interface FrontendRoute {
  /** Route path (e.g., "/dashboard") */
  path: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** Requires authentication? */
  authRequired: boolean;
}

/**
 * Backend API resource exposed by the application
 */
export interface BackendResource {
  /** Canonical name (e.g., "issues.list") */
  name: string;
  /** API path (e.g., "/api/issues") */
  path: string;
  /** HTTP methods (GET, POST, etc.) */
  methods: string[];
  /** Description */
  description?: string;
  /** Auth type: "none", "api_key", "jwt", "sso" */
  authType?: 'none' | 'api_key' | 'jwt' | 'sso';
}

/**
 * Dependency on another DS app
 */
export interface AppDependency {
  /** Target app ID */
  appId: string;
  /** Canonical resource name */
  resourceName: string;
  /** Is this required for operation? */
  required: boolean;
}

/**
 * Configuration for manifest registration
 */
export interface AppManifestConfig {
  /** DSAccount API URL (e.g., "https://account.digistratum.com") */
  dsAccountUrl: string;
  /** App ID registered with DSAccount */
  appId: string;
  /** ARN of the Secrets Manager secret containing the app secret */
  appSecretArn: string;
  /** Application version (typically from package.json) */
  version: string;
  /** Health check URL for the app */
  healthCheckUrl?: string;
  /** CDK stack name (auto-populated if not provided) */
  cdkStack?: string;
  /** CDK data stack name (if separate) */
  cdkDataStack?: string;
  /** Frontend routes exposed by the app */
  frontendRoutes?: FrontendRoute[];
  /** Backend API resources exposed by the app */
  backendResources?: BackendResource[];
  /** Dependencies on other DS apps */
  dependencies?: AppDependency[];
  /** Skip registration in certain environments */
  skipRegistration?: boolean;
}

export interface ManifestRegistrationProps extends AppManifestConfig {}

/**
 * Custom resource that registers the app manifest with DSAccount post-deploy
 */
export class ManifestRegistration extends Construct {
  /**
   * The Lambda function that performs the registration (undefined if skipRegistration=true)
   */
  public readonly registrationFunction?: lambda.Function;

  constructor(scope: Construct, id: string, props: ManifestRegistrationProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    if (props.skipRegistration) {
      // Skip registration entirely - useful for local development
      return;
    }

    // Lambda function code inline (small enough)
    const registrationCode = `
const https = require('https');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const requestType = event.RequestType;
  const props = event.ResourceProperties;
  
  // Only register on Create and Update
  if (requestType === 'Delete') {
    return { PhysicalResourceId: props.appId };
  }
  
  try {
    // Get app secret from Secrets Manager
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    const secretResponse = await client.send(new GetSecretValueCommand({
      SecretId: props.appSecretArn,
    }));
    const appSecret = secretResponse.SecretString;
    
    // Build manifest payload
    const manifest = {
      cdk_stack: props.cdkStack,
      cdk_data_stack: props.cdkDataStack || '',
      health_check_url: props.healthCheckUrl || '',
      version: props.version,
      dependencies: JSON.parse(props.dependencies || '[]'),
      frontend_routes: JSON.parse(props.frontendRoutes || '[]'),
      backend_resources: JSON.parse(props.backendResources || '[]'),
    };
    
    console.log('Registering manifest:', JSON.stringify(manifest, null, 2));
    
    // POST to DSAccount
    const url = new URL(props.dsAccountUrl + '/api/apps/' + props.appId + '/manifest');
    const data = JSON.stringify(manifest);
    
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'X-API-Key': appSecret,
        },
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log('Response status:', res.statusCode);
          console.log('Response body:', body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body));
          } else {
            reject(new Error('Registration failed: ' + res.statusCode + ' - ' + body));
          }
        });
      });
      
      req.on('error', reject);
      req.write(data);
      req.end();
    });
    
    console.log('Registration successful:', result);
    
    return {
      PhysicalResourceId: props.appId,
      Data: {
        success: true,
        version: props.version,
        registeredAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};
`;

    // Create Lambda function for registration
    this.registrationFunction = new lambda.Function(this, 'RegistrationHandler', {
      functionName: `${props.appId}-manifest-registration`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(registrationCode),
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant access to read the app secret
    this.registrationFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [props.appSecretArn],
      })
    );

    // Create custom resource provider
    const provider = new cr.Provider(this, 'Provider', {
      onEventHandler: this.registrationFunction,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Create the custom resource that triggers on deploy
    new cdk.CustomResource(this, 'Registration', {
      serviceToken: provider.serviceToken,
      properties: {
        // Pass properties to the Lambda
        dsAccountUrl: props.dsAccountUrl,
        appId: props.appId,
        appSecretArn: props.appSecretArn,
        version: props.version,
        healthCheckUrl: props.healthCheckUrl ?? '',
        cdkStack: props.cdkStack ?? stack.stackName,
        cdkDataStack: props.cdkDataStack ?? '',
        frontendRoutes: JSON.stringify(props.frontendRoutes ?? []),
        backendResources: JSON.stringify(props.backendResources ?? []),
        dependencies: JSON.stringify(props.dependencies ?? []),
        // Include timestamp to force update on every deploy
        deployTimestamp: new Date().toISOString(),
      },
    });
  }
}
