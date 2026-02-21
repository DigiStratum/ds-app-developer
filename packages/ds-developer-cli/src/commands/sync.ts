import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { simpleGit } from 'simple-git';
import { glob } from 'glob';
import { loadConfig, saveConfig, SkeletonConfig } from '../config.js';

interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  yes?: boolean;
}

/**
 * Files that are safe to auto-update (scaffolding, not app logic)
 */
const SAFE_UPDATE_PATTERNS = [
  'packages/ds-*/**',              // Shared packages
  'docs/**',                       // Documentation
  '.github/workflows/**',          // CI/CD
  'Makefile',                      // Build scripts
  'docker-compose*.yml',           // Docker config
  '.gitignore',                    // Git ignore
  '.eslintrc*',                    // Lint config
  '.prettierrc*',                  // Format config
  'tsconfig*.json',                // TS config in root
  'vitest.config.*',               // Test config
];

/**
 * Files that should never be synced
 */
const NEVER_SYNC_PATTERNS = [
  '.ds-skeleton.json',             // Config file
  'README.md',                     // App-specific readme
  '.env*',                         // Environment files
  'backend/internal/**',           // App-specific backend
  'frontend/src/pages/**',         // App-specific pages
  'frontend/src/components/**',    // App-specific components (mostly)
  'cdk/bin/app.ts',                // App-specific CDK entry
];

/**
 * Sync scaffolding updates from the skeleton to a derived app
 */
export async function syncApp(
  dir: string = process.cwd(),
  options: SyncOptions = {}
): Promise<void> {
  console.log(chalk.blue('\n🔄 DS Skeleton - Sync Updates\n'));
  
  // Load config
  const config = loadConfig(dir);
  if (!config) {
    console.log(chalk.red('❌ Not a ds-skeleton derived app (missing .ds-skeleton.json)'));
    console.log(chalk.gray('   Run this command from the root of a derived app.'));
    process.exit(1);
  }
  
  console.log(chalk.gray(`  App: ${chalk.white(config.appName)}`));
  console.log(chalk.gray(`  Created from: ${chalk.white(config.skeletonVersion)}`));
  console.log(chalk.gray(`  Last sync: ${chalk.white(config.lastSyncAt || 'Never')}`));
  
  // Clone skeleton to temp directory
  const spinner = ora('Fetching latest skeleton...').start();
  const tempDir = path.join(dir, '.skeleton-sync-temp');
  
  try {
    // Clean up any existing temp dir
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    
    const git = simpleGit();
    await git.clone(config.skeletonRepo, tempDir, ['--depth', '1']);
    spinner.succeed('Fetched latest skeleton');
  } catch (error) {
    spinner.fail('Failed to fetch skeleton');
    console.error(chalk.red(error));
    process.exit(1);
  }
  
  // Find files that can be updated
  spinner.start('Analyzing differences...');
  
  const safeFiles = await findSafeUpdates(dir, tempDir, config);
  const skippedFiles = await findSkippedFiles(dir, tempDir, config);
  
  spinner.succeed(`Found ${safeFiles.length} files to update`);
  
  if (safeFiles.length === 0) {
    console.log(chalk.green('\n✅ Already up to date!'));
    cleanup(tempDir);
    return;
  }
  
  // Show what will be updated
  console.log(chalk.blue('\n📋 Files to update:\n'));
  
  for (const file of safeFiles) {
    const status = file.status === 'new' ? chalk.green('+ new') : 
                   file.status === 'modified' ? chalk.yellow('~ modified') :
                   chalk.red('- removed');
    console.log(`  ${status} ${file.path}`);
  }
  
  if (skippedFiles.length > 0) {
    console.log(chalk.gray('\n📋 Skipped files (customized or excluded):\n'));
    for (const file of skippedFiles.slice(0, 10)) {
      console.log(chalk.gray(`  ○ ${file}`));
    }
    if (skippedFiles.length > 10) {
      console.log(chalk.gray(`  ... and ${skippedFiles.length - 10} more`));
    }
  }
  
  // Dry run mode
  if (options.dryRun) {
    console.log(chalk.yellow('\n🔍 Dry run - no changes made'));
    cleanup(tempDir);
    return;
  }
  
  // Confirm
  if (!options.yes) {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: `Apply ${safeFiles.length} updates?`,
        default: false,
      },
    ]);
    
    if (!answers.proceed) {
      console.log(chalk.yellow('\n⏹️  Sync cancelled'));
      cleanup(tempDir);
      return;
    }
  }
  
  // Apply updates
  spinner.start('Applying updates...');
  
  let applied = 0;
  let failed = 0;
  
  for (const file of safeFiles) {
    try {
      if (file.status === 'removed') {
        // Remove file that was deleted from skeleton
        const targetPath = path.join(dir, file.path);
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
      } else {
        // Copy file from skeleton
        const sourcePath = path.join(tempDir, file.path);
        const targetPath = path.join(dir, transformPath(file.path, config));
        
        // Create directory if needed
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Copy and transform content
        let content = fs.readFileSync(sourcePath, 'utf-8');
        content = transformContent(content, config);
        fs.writeFileSync(targetPath, content);
      }
      applied++;
    } catch (error) {
      console.error(chalk.red(`  Failed to update ${file.path}: ${error}`));
      failed++;
    }
  }
  
  spinner.succeed(`Applied ${applied} updates${failed > 0 ? ` (${failed} failed)` : ''}`);
  
  // Update config
  config.lastSyncAt = new Date().toISOString();
  saveConfig(dir, config);
  
  // Cleanup
  cleanup(tempDir);
  
  // Summary
  console.log(chalk.green('\n✅ Sync complete!'));
  if (applied > 0) {
    console.log(chalk.gray('\nReview the changes and commit when ready:'));
    console.log(chalk.gray('  git diff'));
    console.log(chalk.gray('  git add -A && git commit -m "Sync scaffolding from ds-app-developer"'));
  }
}

interface FileUpdate {
  path: string;
  status: 'new' | 'modified' | 'removed';
}

/**
 * Find files that are safe to update
 */
async function findSafeUpdates(
  appDir: string,
  skeletonDir: string,
  config: SkeletonConfig
): Promise<FileUpdate[]> {
  const updates: FileUpdate[] = [];
  
  // Find all safe files in skeleton
  for (const pattern of SAFE_UPDATE_PATTERNS) {
    const files = await glob(pattern, {
      cwd: skeletonDir,
      nodir: true,
      ignore: ['node_modules/**', 'dist/**', '.git/**', 'packages/ds-developer-cli/**'],
    });
    
    for (const file of files) {
      // Skip if in never-sync list
      if (shouldNeverSync(file, config)) {
        continue;
      }
      
      // Skip if customized by user
      if (config.customizedFiles.includes(file)) {
        continue;
      }
      
      const skeletonPath = path.join(skeletonDir, file);
      const appPath = path.join(appDir, transformPath(file, config));
      
      if (!fs.existsSync(appPath)) {
        // New file
        updates.push({ path: file, status: 'new' });
      } else {
        // Check if modified
        const skeletonContent = transformContent(
          fs.readFileSync(skeletonPath, 'utf-8'),
          config
        );
        const appContent = fs.readFileSync(appPath, 'utf-8');
        
        if (skeletonContent !== appContent) {
          updates.push({ path: file, status: 'modified' });
        }
      }
    }
  }
  
  return updates;
}

/**
 * Find files that were skipped
 */
async function findSkippedFiles(
  appDir: string,
  skeletonDir: string,
  config: SkeletonConfig
): Promise<string[]> {
  const skipped: string[] = [];
  
  const allFiles = await glob('**/*', {
    cwd: skeletonDir,
    nodir: true,
    ignore: ['node_modules/**', 'dist/**', '.git/**', 'packages/ds-developer-cli/**'],
  });
  
  for (const file of allFiles) {
    // Check if it's in safe patterns
    let isSafe = false;
    for (const pattern of SAFE_UPDATE_PATTERNS) {
      const { minimatch } = await import('minimatch');
      if (minimatch(file, pattern)) {
        isSafe = true;
        break;
      }
    }
    
    if (!isSafe) {
      skipped.push(file);
    } else if (shouldNeverSync(file, config) || config.customizedFiles.includes(file)) {
      skipped.push(file);
    }
  }
  
  return skipped;
}

/**
 * Check if a file should never be synced
 */
function shouldNeverSync(file: string, config: SkeletonConfig): boolean {
  for (const pattern of [...NEVER_SYNC_PATTERNS, ...config.skipPatterns]) {
    // Simple glob matching
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
      );
      if (regex.test(file)) {
        return true;
      }
    } else if (file === pattern || file.startsWith(pattern + '/')) {
      return true;
    }
  }
  return false;
}

/**
 * Transform a file path from skeleton to app
 */
function transformPath(file: string, config: SkeletonConfig): string {
  return file.replace(/ds-app-developer/g, config.appName);
}

/**
 * Transform file content from skeleton to app
 */
function transformContent(content: string, config: SkeletonConfig): string {
  return content
    .replace(/ds-app-developer/g, config.appName)
    .replace(/DSAppSkeleton/g, config.appNamePascal)
    .replace(/skeleton\.digistratum\.com/g, config.domain);
}

/**
 * Cleanup temp directory
 */
function cleanup(tempDir: string): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
}

/**
 * Register the sync command with commander
 */
export function syncCommand(program: Command): void {
  program
    .command('sync')
    .description('Sync scaffolding updates from the skeleton to this app')
    .option('-n, --dry-run', 'Show what would be updated without making changes')
    .option('-f, --force', 'Force update even if files are customized')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (options: SyncOptions) => {
      await syncApp(process.cwd(), options);
    });
}
