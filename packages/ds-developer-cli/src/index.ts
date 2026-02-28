/**
 * DS Developer CLI
 * 
 * CLI tool for creating and managing DS App Developer derived applications.
 * 
 * Commands:
 *   create <app-name>  - Create a new app from the developer
 *   sync              - Sync scaffolding updates to a derived app
 *   diff              - Compare app against current developer
 */

export { createApp } from './commands/create.js';
export { syncApp } from './commands/sync.js';
export { diffApp } from './commands/diff.js';
export type { DeveloperConfig } from './config.js';
export { loadConfig, saveConfig } from './config.js';
