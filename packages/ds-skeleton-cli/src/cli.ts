import { Command } from 'commander';
import { createCommand } from './commands/create.js';
import { syncCommand } from './commands/sync.js';
import { diffCommand } from './commands/diff.js';

const program = new Command();

program
  .name('ds-skeleton')
  .description('CLI tool for creating and syncing DS App Skeleton derived applications')
  .version('0.1.0');

// Register commands
createCommand(program);
syncCommand(program);
diffCommand(program);

program.parse();
