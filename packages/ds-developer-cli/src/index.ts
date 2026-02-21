/**
 * DS Skeleton CLI
 * 
 * CLI tool for creating and managing DS App Skeleton derived applications.
 * 
 * Commands:
 *   create <app-name>  - Create a new app from the skeleton
 *   sync              - Sync scaffolding updates to a derived app
 *   diff              - Compare app against current skeleton
 */

export { createApp } from './commands/create.js';
export { syncApp } from './commands/sync.js';
export { diffApp } from './commands/diff.js';
export type { SkeletonConfig } from './config.js';
export { loadConfig, saveConfig } from './config.js';
