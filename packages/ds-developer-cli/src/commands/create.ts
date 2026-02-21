import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { simpleGit } from 'simple-git';
import { glob } from 'glob';
import {
  SkeletonConfig,
  defaultConfig,
  saveConfig,
  toPascalCase,
  toKebabCase,
} from '../config.js';

interface CreateOptions {
  repo?: string;
  domain?: string;
  force?: boolean;
  skipInstall?: boolean;
}

/**
 * Files and directories to exclude when cloning
 */
const EXCLUDE_PATTERNS = [
  '.git',
  'node_modules',
  'dist',
  '*.log',
  '.env.local',
  '.env.*.local',
];

/**
 * Replacement mappings for the skeleton
 */
const REPLACEMENTS = {
  name: {
    'ds-app-developer': '', // Will be replaced with app name
    'DSAppSkeleton': '',   // Will be replaced with PascalCase name
  },
  domain: {
    'skeleton.digistratum.com': '', // Will be replaced with domain
  },
  module: {
    'github.com/digistratum/ds-app-developer': '', // Go module path
  },
};

/**
 * Create a new app from the skeleton
 */
export async function createApp(
  appName: string,
  options: CreateOptions = {}
): Promise<void> {
  const kebabName = toKebabCase(appName);
  const pascalName = toPascalCase(appName);
  const targetDir = path.resolve(process.cwd(), kebabName);
  
  console.log(chalk.blue('\n🦴 DS Skeleton - Create New App\n'));
  console.log(chalk.gray(`  App name: ${chalk.white(kebabName)}`));
  console.log(chalk.gray(`  PascalCase: ${chalk.white(pascalName)}`));
  console.log(chalk.gray(`  Directory: ${chalk.white(targetDir)}`));
  
  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    if (!options.force) {
      console.log(chalk.red(`\n❌ Directory already exists: ${targetDir}`));
      console.log(chalk.gray('   Use --force to overwrite'));
      process.exit(1);
    }
    console.log(chalk.yellow(`\n⚠️  Removing existing directory...`));
    fs.rmSync(targetDir, { recursive: true });
  }
  
  // Get domain if not provided
  let domain = options.domain;
  if (!domain) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'domain',
        message: 'Domain for the app:',
        default: `${kebabName}.digistratum.com`,
      },
    ]);
    domain = answers.domain;
  }
  
  const repoUrl = options.repo || defaultConfig.skeletonRepo!;
  
  // Clone the skeleton repository
  const spinner = ora('Cloning skeleton repository...').start();
  
  try {
    const git = simpleGit();
    await git.clone(repoUrl, targetDir, ['--depth', '1']);
    spinner.succeed('Cloned skeleton repository');
  } catch (error) {
    spinner.fail('Failed to clone repository');
    console.error(chalk.red(error));
    process.exit(1);
  }
  
  // Remove git history
  spinner.start('Removing git history...');
  fs.rmSync(path.join(targetDir, '.git'), { recursive: true });
  spinner.succeed('Removed git history');
  
  // Remove skeleton-specific files/directories
  spinner.start('Cleaning up skeleton-specific files...');
  const cleanupPatterns = [
    'packages/ds-developer-cli', // Don't include the CLI in derived apps
  ];
  for (const pattern of cleanupPatterns) {
    const cleanupPath = path.join(targetDir, pattern);
    if (fs.existsSync(cleanupPath)) {
      fs.rmSync(cleanupPath, { recursive: true });
    }
  }
  spinner.succeed('Cleaned up skeleton-specific files');
  
  // Perform replacements
  spinner.start('Performing name replacements...');
  await performReplacements(targetDir, {
    'ds-app-developer': kebabName,
    'DSAppSkeleton': pascalName,
    'skeleton.digistratum.com': domain!,
    'github.com/digistratum/ds-app-developer/backend': `github.com/digistratum/${kebabName}/backend`,
  });
  spinner.succeed('Performed name replacements');
  
  // Create config file
  spinner.start('Creating skeleton config...');
  const config: SkeletonConfig = {
    skeletonVersion: '0.1.0', // TODO: Get from skeleton repo
    skeletonRepo: repoUrl,
    appName: kebabName,
    appNamePascal: pascalName,
    domain: domain!,
    createdAt: new Date().toISOString(),
    customizedFiles: [],
    skipPatterns: defaultConfig.skipPatterns!,
  };
  saveConfig(targetDir, config);
  spinner.succeed('Created skeleton config');
  
  // Initialize new git repo
  spinner.start('Initializing new git repository...');
  const git = simpleGit(targetDir);
  await git.init();
  await git.add('.');
  await git.commit('Initial commit from ds-app-developer');
  spinner.succeed('Initialized new git repository');
  
  // Install dependencies (optional)
  if (!options.skipInstall) {
    console.log(chalk.blue('\n📦 Installing dependencies...\n'));
    
    // Install frontend deps
    const frontendDir = path.join(targetDir, 'frontend');
    if (fs.existsSync(path.join(frontendDir, 'package.json'))) {
      spinner.start('Installing frontend dependencies...');
      const { execSync } = await import('node:child_process');
      try {
        execSync('npm install', { cwd: frontendDir, stdio: 'pipe' });
        spinner.succeed('Installed frontend dependencies');
      } catch (error) {
        spinner.warn('Failed to install frontend dependencies (run npm install manually)');
      }
    }
    
    // Install CDK deps
    const cdkDir = path.join(targetDir, 'cdk');
    if (fs.existsSync(path.join(cdkDir, 'package.json'))) {
      spinner.start('Installing CDK dependencies...');
      const { execSync } = await import('node:child_process');
      try {
        execSync('npm install', { cwd: cdkDir, stdio: 'pipe' });
        spinner.succeed('Installed CDK dependencies');
      } catch (error) {
        spinner.warn('Failed to install CDK dependencies (run npm install manually)');
      }
    }
    
    // Backend deps (Go)
    const backendDir = path.join(targetDir, 'backend');
    if (fs.existsSync(path.join(backendDir, 'go.mod'))) {
      spinner.start('Downloading backend dependencies...');
      const { execSync } = await import('node:child_process');
      try {
        execSync('go mod download', { cwd: backendDir, stdio: 'pipe' });
        spinner.succeed('Downloaded backend dependencies');
      } catch (error) {
        spinner.warn('Failed to download backend dependencies (run go mod download manually)');
      }
    }
  }
  
  // Print success message
  console.log(chalk.green('\n✅ App created successfully!\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray(`  1. cd ${kebabName}`));
  console.log(chalk.gray('  2. Review and update configuration:'));
  console.log(chalk.gray('     - cdk/bin/app.ts (AWS config)'));
  console.log(chalk.gray('     - backend/go.mod (module path)'));
  console.log(chalk.gray('  3. Start development:'));
  console.log(chalk.gray('     - make deps-up'));
  console.log(chalk.gray('     - cd frontend && npm run dev'));
  console.log(chalk.gray('     - cd backend && go run ./cmd/api'));
  console.log('');
}

/**
 * Perform text replacements in all files
 */
async function performReplacements(
  dir: string,
  replacements: Record<string, string>
): Promise<void> {
  const files = await glob('**/*', {
    cwd: dir,
    nodir: true,
    ignore: ['node_modules/**', 'dist/**', '.git/**', '*.png', '*.jpg', '*.ico', '*.woff*'],
  });
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    
    // Skip binary files
    if (isBinaryFile(filePath)) {
      continue;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;
      
      for (const [search, replace] of Object.entries(replacements)) {
        if (content.includes(search)) {
          content = content.split(search).join(replace);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content);
      }
    } catch (error) {
      // Skip files that can't be read as text
    }
  }
  
  // Also rename directories/files that contain the old name
  // This handles cases like "ds-app-developer" in file paths
  for (const [search, replace] of Object.entries(replacements)) {
    const matchingPaths = await glob(`**/*${search}*`, {
      cwd: dir,
      ignore: ['node_modules/**', 'dist/**', '.git/**'],
    });
    
    // Sort by length descending to rename deepest paths first
    matchingPaths.sort((a, b) => b.length - a.length);
    
    for (const matchPath of matchingPaths) {
      const oldPath = path.join(dir, matchPath);
      const newPath = path.join(dir, matchPath.split(search).join(replace));
      
      if (fs.existsSync(oldPath) && oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
      }
    }
  }
}

/**
 * Check if a file is binary
 */
function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
    '.woff', '.woff2', '.ttf', '.eot',
    '.zip', '.tar', '.gz',
    '.exe', '.dll', '.so', '.dylib',
    '.pdf', '.doc', '.docx',
  ];
  return binaryExtensions.includes(ext);
}

/**
 * Register the create command with commander
 */
export function createCommand(program: Command): void {
  program
    .command('create <app-name>')
    .description('Create a new app from the DS App Skeleton')
    .option('-r, --repo <url>', 'Skeleton repository URL', defaultConfig.skeletonRepo)
    .option('-d, --domain <domain>', 'Domain for the app')
    .option('-f, --force', 'Overwrite existing directory')
    .option('--skip-install', 'Skip dependency installation')
    .action(async (appName: string, options: CreateOptions) => {
      await createApp(appName, options);
    });
}
