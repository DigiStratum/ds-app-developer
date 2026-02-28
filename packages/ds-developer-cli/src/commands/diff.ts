import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { simpleGit } from 'simple-git';
import { glob } from 'glob';
import { loadConfig, DeveloperConfig } from '../config.js';

interface DiffOptions {
  detailed?: boolean;
  pattern?: string;
}

interface DiffResult {
  path: string;
  status: 'added' | 'modified' | 'removed' | 'unchanged';
  developerOnly?: boolean;
  appOnly?: boolean;
  details?: string;
}

/**
 * Compare a derived app against the current developer
 */
export async function diffApp(
  dir: string = process.cwd(),
  options: DiffOptions = {}
): Promise<DiffResult[]> {
  console.log(chalk.blue('\n📊 DS Developer - Diff\n'));
  
  // Load config
  const config = loadConfig(dir);
  if (!config) {
    console.log(chalk.red('❌ Not a ds-developer derived app (missing .ds-developer.json)'));
    console.log(chalk.gray('   Run this command from the root of a derived app.'));
    process.exit(1);
  }
  
  console.log(chalk.gray(`  App: ${chalk.white(config.appName)}`));
  console.log(chalk.gray(`  Created from: ${chalk.white(config.developerVersion)}`));
  
  // Clone developer to temp directory
  const spinner = ora('Fetching latest developer...').start();
  const tempDir = path.join(dir, '.developer-diff-temp');
  
  try {
    // Clean up any existing temp dir
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    
    const git = simpleGit();
    await git.clone(config.developerRepo, tempDir, ['--depth', '1']);
    spinner.succeed('Fetched latest developer');
  } catch (error) {
    spinner.fail('Failed to fetch developer');
    console.error(chalk.red(error));
    process.exit(1);
  }
  
  // Compare files
  spinner.start('Comparing files...');
  
  const results: DiffResult[] = [];
  const pattern = options.pattern || '**/*';
  
  // Get all files from both directories
  const developerFiles = new Set(await glob(pattern, {
    cwd: tempDir,
    nodir: true,
    ignore: ['node_modules/**', 'dist/**', '.git/**', 'packages/ds-developer-cli/**'],
  }));
  
  const appFiles = new Set(await glob(pattern, {
    cwd: dir,
    nodir: true,
    ignore: ['node_modules/**', 'dist/**', '.git/**', '.developer-*-temp/**'],
  }));
  
  // Files only in developer (potentially missing from app)
  for (const file of developerFiles) {
    const appPath = transformPath(file, config);
    
    if (!appFiles.has(appPath) && !appFiles.has(file)) {
      results.push({
        path: file,
        status: 'removed',
        developerOnly: true,
        details: 'File exists in developer but not in app',
      });
    }
  }
  
  // Files in app - compare with developer
  for (const file of appFiles) {
    // Skip config file
    if (file === '.ds-developer.json') continue;
    
    // Find corresponding developer file
    const developerFile = findDeveloperFile(file, developerFiles, config);
    
    if (!developerFile) {
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
    const developerContent = transformContent(
      fs.readFileSync(path.join(tempDir, developerFile), 'utf-8'),
      config
    );
    
    if (appContent === developerContent) {
      results.push({
        path: file,
        status: 'unchanged',
      });
    } else {
      let details: string | undefined;
      if (options.detailed) {
        details = generateDiffSummary(developerContent, appContent);
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
 * Find the corresponding developer file for an app file
 */
function findDeveloperFile(
  appFile: string,
  developerFiles: Set<string>,
  config: DeveloperConfig
): string | null {
  // Direct match
  if (developerFiles.has(appFile)) {
    return appFile;
  }
  
  // Try with developer name
  const developerFile = appFile.replace(
    new RegExp(config.appName, 'g'),
    'ds-app-developer'
  );
  if (developerFiles.has(developerFile)) {
    return developerFile;
  }
  
  return null;
}

/**
 * Transform a file path from developer to app
 */
function transformPath(file: string, config: DeveloperConfig): string {
  return file.replace(/ds-app-developer/g, config.appName);
}

/**
 * Transform file content from developer to app
 */
function transformContent(content: string, config: DeveloperConfig): string {
  return content
    .replace(/ds-app-developer/g, config.appName)
    .replace(/DSAppDeveloper/g, config.appNamePascal)
    .replace(/developer\.digistratum\.com/g, config.domain);
}

/**
 * Generate a summary of differences
 */
function generateDiffSummary(developer: string, app: string): string {
  const developerLines = developer.split('\n');
  const appLines = app.split('\n');
  
  let added = 0;
  let removed = 0;
  
  // Simple line count diff
  const developerSet = new Set(developerLines);
  const appSet = new Set(appLines);
  
  for (const line of appLines) {
    if (!developerSet.has(line) && line.trim()) {
      added++;
    }
  }
  
  for (const line of developerLines) {
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
  console.log(chalk.gray(`  ${chalk.yellow(modified.length)} modified (diverged from developer)`));
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
      console.log(chalk.gray('  • Review modified files to see if updates from developer should be merged'));
    }
    if (removed.length > 0) {
      console.log(chalk.gray('  • Consider if removed files should be restored (run ds-developer sync)'));
    }
    console.log(chalk.gray('  • Run ds-developer sync --dry-run to preview safe updates'));
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
    .description('Compare this app against the current developer')
    .option('-d, --detailed', 'Show detailed diff information')
    .option('-p, --pattern <glob>', 'Only compare files matching pattern')
    .action(async (options: DiffOptions) => {
      await diffApp(process.cwd(), options);
    });
}
