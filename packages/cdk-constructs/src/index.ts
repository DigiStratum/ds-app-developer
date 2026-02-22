/**
 * @digistratum/cdk-constructs - Reusable AWS CDK Constructs
 *
 * This package provides high-level CDK constructs for common DigiStratum
 * infrastructure patterns, including:
 *
 * - **ApiLambda**: Lambda + HTTP API Gateway with CORS
 * - **DataTable**: DynamoDB single-table design with GSIs
 * - **SpaHosting**: S3 + CloudFront for SPA hosting
 *
 * Plus utilities for standard naming and tagging across all resources.
 *
 * @example
 * ```typescript
 * import {
 *   ApiLambda,
 *   DataTable,
 *   SpaHosting,
 *   applyStandardTags,
 * } from '@digistratum/ds-cdk';
 *
 * // Create a table
 * const table = new DataTable(this, 'Data', {
 *   appName: 'myapp',
 *   environment: 'prod',
 *   gsiCount: 2,
 * });
 *
 * // Create an API
 * const api = new ApiLambda(this, 'Api', {
 *   appName: 'myapp',
 *   environment: 'prod',
 *   codePath: './backend/dist',
 * });
 *
 * // Grant permissions
 * table.grantReadWriteData(api.function);
 *
 * // Create frontend hosting
 * const frontend = new SpaHosting(this, 'Frontend', {
 *   appName: 'myapp',
 *   environment: 'prod',
 *   apiOrigin: new origins.HttpOrigin(api.apiDomain),
 * });
 * ```
 *
 * @packageDocumentation
 */

// Constructs
export { ApiLambda, ApiLambdaProps } from './api-lambda';
export { DataTable, DataTableProps } from './data-table';
export { SpaHosting, SpaHostingProps } from './spa-hosting';

// Utilities
export {
  // Naming
  resourceName,
  NamingOptions,
  // Tagging
  applyStandardTags,
  StandardTagsOptions,
  TagKeys,
  // Base types
  BaseConstructProps,
  // Environment helpers
  isProdEnvironment,
  isStagingEnvironment,
  getRemovalPolicy,
} from './utils';
