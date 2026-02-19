import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Standard tag keys used across all DigiStratum resources
 */
export const TagKeys = {
  APP_NAME: 'ds:app-name',
  ENVIRONMENT: 'ds:environment',
  MANAGED_BY: 'ds:managed-by',
  COST_CENTER: 'ds:cost-center',
  OWNER: 'ds:owner',
} as const;

/**
 * Options for standard naming conventions
 */
export interface NamingOptions {
  /**
   * Application name (e.g., 'myapp')
   */
  appName: string;

  /**
   * Environment name (e.g., 'dev', 'staging', 'prod')
   */
  environment: string;

  /**
   * Resource type suffix (e.g., 'api', 'table', 'bucket')
   */
  resourceType?: string;

  /**
   * Optional additional suffix
   */
  suffix?: string;

  /**
   * Include AWS account ID in name (useful for globally unique names)
   * @default false
   */
  includeAccount?: boolean;
}

/**
 * Standard tagging options
 */
export interface StandardTagsOptions {
  /**
   * Application name
   */
  appName: string;

  /**
   * Environment name
   */
  environment: string;

  /**
   * Cost center for billing allocation
   */
  costCenter?: string;

  /**
   * Owner/team responsible for the resource
   */
  owner?: string;

  /**
   * Additional custom tags
   */
  additionalTags?: Record<string, string>;
}

/**
 * Generate a standard resource name following DigiStratum conventions
 * 
 * Format: {appName}-{resourceType}-{environment}[-{suffix}][-{accountId}]
 * 
 * @example
 * ```typescript
 * resourceName({ appName: 'myapp', environment: 'prod', resourceType: 'api' })
 * // => 'myapp-api-prod'
 * 
 * resourceName({ appName: 'myapp', environment: 'prod', resourceType: 'bucket', includeAccount: true })
 * // => 'myapp-bucket-prod-123456789012'
 * ```
 */
export function resourceName(
  options: NamingOptions,
  scope?: Construct
): string {
  const parts = [options.appName];

  if (options.resourceType) {
    parts.push(options.resourceType);
  }

  parts.push(options.environment);

  if (options.suffix) {
    parts.push(options.suffix);
  }

  if (options.includeAccount && scope) {
    parts.push(cdk.Stack.of(scope).account);
  }

  return parts.join('-');
}

/**
 * Apply standard DigiStratum tags to a construct and all its children
 * 
 * @example
 * ```typescript
 * applyStandardTags(myConstruct, {
 *   appName: 'myapp',
 *   environment: 'prod',
 *   costCenter: 'engineering',
 *   owner: 'platform-team',
 * });
 * ```
 */
export function applyStandardTags(
  scope: Construct,
  options: StandardTagsOptions
): void {
  cdk.Tags.of(scope).add(TagKeys.APP_NAME, options.appName);
  cdk.Tags.of(scope).add(TagKeys.ENVIRONMENT, options.environment);
  cdk.Tags.of(scope).add(TagKeys.MANAGED_BY, 'cdk');

  if (options.costCenter) {
    cdk.Tags.of(scope).add(TagKeys.COST_CENTER, options.costCenter);
  }

  if (options.owner) {
    cdk.Tags.of(scope).add(TagKeys.OWNER, options.owner);
  }

  if (options.additionalTags) {
    for (const [key, value] of Object.entries(options.additionalTags)) {
      cdk.Tags.of(scope).add(key, value);
    }
  }
}

/**
 * Base properties shared across all DigiStratum constructs
 */
export interface BaseConstructProps {
  /**
   * Application name used in resource naming and tagging
   */
  appName: string;

  /**
   * Environment name (dev, staging, prod)
   */
  environment: string;

  /**
   * Cost center for billing allocation
   */
  costCenter?: string;

  /**
   * Owner/team responsible for the resource
   */
  owner?: string;

  /**
   * Additional custom tags to apply
   */
  additionalTags?: Record<string, string>;

  /**
   * Whether to apply standard tags automatically
   * @default true
   */
  applyTags?: boolean;
}

/**
 * Check if the environment is production
 */
export function isProdEnvironment(environment: string): boolean {
  return environment === 'prod' || environment === 'production';
}

/**
 * Check if the environment is staging
 */
export function isStagingEnvironment(environment: string): boolean {
  return environment === 'staging' || environment === 'stage';
}

/**
 * Get appropriate removal policy based on environment
 */
export function getRemovalPolicy(environment: string): cdk.RemovalPolicy {
  return isProdEnvironment(environment)
    ? cdk.RemovalPolicy.RETAIN
    : cdk.RemovalPolicy.DESTROY;
}
