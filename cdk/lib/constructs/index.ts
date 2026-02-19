/**
 * DS App Skeleton - Reusable CDK Constructs
 * 
 * This module exports reusable L2/L3 constructs for common DigiStratum
 * infrastructure patterns.
 * 
 * @example
 * ```typescript
 * import { ApiLambda, SpaHosting, DataTable } from './constructs';
 * 
 * const table = new DataTable(this, 'Data', { appName: 'myapp', environment: 'prod' });
 * const api = new ApiLambda(this, 'Api', { appName: 'myapp', environment: 'prod', codePath: '...' });
 * const hosting = new SpaHosting(this, 'Frontend', { appName: 'myapp', environment: 'prod' });
 * ```
 */

export { ApiLambda, ApiLambdaProps } from './api-lambda';
export { SpaHosting, SpaHostingProps } from './spa-hosting';
export { DataTable, DataTableProps } from './data-table';
