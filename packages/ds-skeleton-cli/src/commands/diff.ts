import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { simpleGit } from 'simple-git';
import { glob } from 'glob';
import { loadConfig, SkeletonConfig } from '../config.js';

interface DiffOptions {
  detailed?: boolean;
  pattern?: string;
}

interface DiffResult {
  path: string;
  status: 'added' | 'modified' | 'removed' | 'unchanged';
  skeletonOnly?: boolean;
  appOnly?: boolean;
  details?: string;
}

/**
 * Compare a derived app against the current skeleton
 */
export async function diffApp(
  dir: string = process.cwd(),
  options: DiffOptions = {}
): Promise<DiffResult[]> {
  console.log(chalk.blue('\n📊 DS Skeleton - Diff\n'));
  
  // Load config
  const config = loadConfig(dir);
  if (!config) {
    console.log(chalk.red('❌ Not a ds-skeleton derived app (missing .ds-skeleton.json)'));
    console.log(chalk.gray('   Run this command from the root of a derived app.'));
    process.exit(1);
  }
  
  console.log(chalk.gray(`  App: ${chalk.white(config.appName)}`));
  console.log(chalk.gray(`  Created from: ${chalk.white(config.skeletonVersion)}`));
  
  // Clone skeleton to temp directory
  const spinner = ora('Fetching latest skeleton...').start();
  const tempDir = path.join(dir, '.skeleton-diff-temp');
  
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
  
  // Compare files
  spinner.start('Comparing files...');
  
  const results: DiffResult[] = [];
  const pattern = options.pattern || '**/*';
  
  // Get all files from both directories
  const skeletonFiles = new Set(await glob(pattern, {
    cwd: tempDir,
    nodir: true,
    ignore: ['node_modules/**', 'dist/**', '.git/**', 'packages/ds-skeleton-cli/**'],
  }));
  
  const appFiles = new Set(await glob(pattern, {
    cwd: dir,
    nodir: true,
    ignore: ['node_modules/**', 'dist/**', '.git/**', '.skeleton-*-temp/**'],
  }));
  
  // Files only in skeleton (potentially missing from app)
  for (const file of skeletonFiles) {
    const appPath = transformPath(file, config);
    
    if (!appFiles.has(appPath) && !appFiles.has(file)) {
      results.push({
        path: file,
        status: 'removed',
        skeletonOnly: true,
        details: 'File exists in skeleton but not in app',
      });
    }
  }
  
  // Files in app - compare with skeleton
  for (const file of appFiles) {
    // Skip config file
    if (file === '.ds-skeleton.json') continue;
    
    // Find corresponding skeleton file
    const skeletonFile = findSkeletonFile(file, skeletonFiles, config);
    
    if (!skeletonFile) {
      results.push({
        path: file,
        status: 'added',
        appOnly: true,
        details: 'File exists only in app (custom file)',
      });
      continue;
    }
    
    // Compare contents
    const appContent = fs.readFileSync(path.join(dir, file), 'utf-8');
    const skeletonContent = transformContent(
      fs.readFileSync(path.join(tempDir, skeletonFile), 'utf-8'),
      config
    );
    
    if (appContent === skeletonContent) {
      results.push({
        path: file,
        status: 'unchanged',
      });
    } else {
      let details: string | undefined;
      if (options.detailed) {
        details = generateDiffSummary(skeletonContent, appContent);
      }
      results.push({
        path: file,
        status: 'modified',
        details,
      });
    }
  }
  
  spinner.succeed('Comparison complete');
  
  // Cleanup
  cleanup(tempDir);
  
  // Display results
  displayResults(results, options);
  
  return results;
}

/**
 * Find the corresponding skeleton file for an app file
 */
function findSkeletonFile(
  appFile: string,
  skeletonFiles: Set<string>,
  config: SkeletonConfig
): string | null {
  // Direct match
  if (skeletonFiles.has(appFile)) {
    return appFile;
  }
  
  // Try with skeleton name
  const skeletonFile = appFile.replace(
    new RegExp(config.appName, 'g'),
    'ds-app-skeleton'
  );
  if (skeletonFiles.has(skeletonFile)) {
    return skeletonFile;
  }
  
  return null;
}

/**
 * Transform a file path from skeleton to app
 */
function transformPath(file: string, config: SkeletonConfig): string {
  return file.replace(/ds-app-skeleton/g, config.appName);
}

/**
 * Transform file content from skeleton to app
 */
function transformContent(content: string, config: SkeletonConfig): string {
  return content
    .replace(/ds-app-skeleton/g, config.appName)
    .replace(/DSAppSkeleton/g, config.appNamePascal)
    .replace(/skeleton\.digistratum\.com/g, config.domain);
}

/**
 * Generate a summary of differences
 */
function generateDiffSummary(skeleton: string, app: string): string {
  const skeletonLines = skeleton.split('\n');
  const appLines = app.split('\n');
  
  let added = 0;
  let removed = 0;
  
  // Simple line count diff
  const skeletonSet = new Set(skeletonLines);
  const appSet = new Set(appLines);
  
  for (const line of appLines) {
    if (!skeletonSet.has(line) && line.trim()) {
      added++;
    }
  }
  
  for (const line of skeletonLines) {
    if (!appSet.has(line) && line.trim()) {
      removed++;
    }
  }
  
  return `+${added}/-${removed} lines`;
}

/**
 * Display diff results
 */
function displayResults(results: DiffResult[], options: DiffOptions): void {
  const modified = results.filter(r => r.status === 'modified');
  const added = results.filter(r => r.status === 'added');
  const removed = results.filter(r => r.status === 'removed');
  const unchanged = results.filter(r => r.status === 'unchanged');
  
  console.log(chalk.blue('\n📋 Summary:\n'));
  console.log(chalk.gray(`  ${chalk.green(added.length)} added (app-only files)`));
  console.log(chalk.gray(`  ${chalk.yellow(modified.length)} modified (diverged from skeleton)`));
  console.log(chalk.gray(`  ${chalk.red(removed.length)} removed (missing from app)`));
  console.log(chalk.gray(`  ${unchanged.length} unchanged`));
  
  if (modified.length > 0) {
    console.log(chalk.yellow('\n📝 Modified files:\n'));
    for (const file of modified) {
      const details = file.details ? chalk.gray(` (${file.details})`) : '';
      console.log(`  ~ ${file.path}${details}`);
    }
  }
  
  if (added.length > 0) {
    console.log(chalk.green('\n➕ App-only files:\n'));
    for (const file of added.slice(0, 20)) {
      console.log(`  + ${file.path}`);
    }
    if (added.length > 20) {
      console.log(chalk.gray(`  ... and ${added.length - 20} more`));
    }
  }
  
  if (removed.length > 0) {
    console.log(chalk.red('\n➖ Missing from app:\n'));
    for (const file of removed.slice(0, 20)) {
      console.log(`  - ${file.path}`);
    }
    if (removed.length > 20) {
      console.log(chalk.gray(`  ... and ${removed.length - 20} more`));
    }
  }
  
  // Recommendations
  if (modified.length > 0 || removed.length > 0) {
    console.log(chalk.blue('\n💡 Recommendations:\n'));
    if (modified.length > 0) {
      console.log(chalk.gray('  • Review modified files to see if updates from skeleton should be merged'));
    }
    if (removed.length > 0) {
      console.log(chalk.gray('  • Consider if removed files should be restored (run ds-skeleton sync)'));
    }
    console.log(chalk.gray('  • Run ds-skeleton sync --dry-run to preview safe updates'));
  }
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
 * Register the diff command with commander
 */
export function diffCommand(program: Command): void {
  program
    .command('diff')
    .description('Compare this app against the current skeleton')
    .option('-d, --detailed', 'Show detailed diff information')
    .option('-p, --pattern <glob>', 'Only compare files matching pattern')
    .action(async (options: DiffOptions) => {
      await diffApp(process.cwd(), options);
    });
}
