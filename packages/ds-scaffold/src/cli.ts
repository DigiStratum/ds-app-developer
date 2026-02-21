#!/usr/bin/env node
/**
 * DS Scaffold CLI
 * 
 * Creates new DigiStratum applications from the standard template.
 * 
 * Usage:
 *   npx @digistratum/ds-scaffold create my-new-app
 *   npx @digistratum/ds-scaffold create my-new-app --skip-install
 */

import { Command } from 'commander';
import { createApp, CreateOptions } from './index.js';

const program = new Command();

program
  .name('ds-scaffold')
  .description('Scaffold new DigiStratum applications')
  .version('0.1.0');

program
  .command('create <app-name>')
  .description('Create a new DigiStratum app from the template')
  .option('-d, --directory <dir>', 'Target directory (defaults to app-name)')
  .option('--skip-install', 'Skip npm install')
  .option('--skip-git', 'Skip git initialization')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (appName: string, options: CreateOptions) => {
    try {
      await createApp(appName, options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
