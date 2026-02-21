/**
 * DS Scaffold - Main Library
 * 
 * Provides programmatic access to scaffold functionality.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CreateOptions {
  directory?: string;
  skipInstall?: boolean;
  skipGit?: boolean;
  yes?: boolean;
}

interface Replacements {
  appName: string;
  appNameLower: string;
  appNameKebab: string;
  appNamePascal: string;
}

/**
 * Convert a string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert a string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Replace template placeholders in content
 */
function replaceInContent(content: string, replacements: Replacements): string {
  return content
    .replace(/\{\{APP_NAME\}\}/g, replacements.appName)
    .replace(/\{\{APP_NAME_LOWER\}\}/g, replacements.appNameLower)
    .replace(/\{\{APP_NAME_KEBAB\}\}/g, replacements.appNameKebab)
    .replace(/\{\{APP_NAME_PASCAL\}\}/g, replacements.appNamePascal)
    .replace(/ds-scaffold-template/g, replacements.appNameKebab)
    .replace(/DS Scaffold Template/g, replacements.appName)
    .replace(/DsScaffoldTemplate/g, replacements.appNamePascal);
}

/**
 * Copy and process template files
 */
async function copyTemplate(
  templateDir: string, 
  targetDir: string, 
  replacements: Replacements
): Promise<void> {
  const entries = await fs.readdir(templateDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(templateDir, entry.name);
    const destPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await fs.ensureDir(destPath);
      await copyTemplate(srcPath, destPath, replacements);
    } else {
      // Process text files, copy binary files as-is
      const ext = path.extname(entry.name).toLowerCase();
      const textExts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css', '.yaml', '.yml', '.env', '.gitignore'];
      
      if (textExts.includes(ext) || entry.name.startsWith('.')) {
        const content = await fs.readFile(srcPath, 'utf8');
        const processed = replaceInContent(content, replacements);
        await fs.writeFile(destPath, processed);
      } else {
        await fs.copy(srcPath, destPath);
      }
    }
  }
}

/**
 * Create a new DigiStratum app from the template
 */
export async function createApp(appName: string, options: CreateOptions = {}): Promise<void> {
  const targetDir = path.resolve(options.directory || toKebabCase(appName));
  
  console.log(chalk.blue('🚀 Creating new DigiStratum app:'), chalk.bold(appName));
  console.log(chalk.gray(`   Target directory: ${targetDir}`));
  console.log();

  // Check if directory exists
  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      throw new Error(`Directory ${targetDir} already exists and is not empty`);
    }
  }

  // Prepare replacements
  const replacements: Replacements = {
    appName: appName,
    appNameLower: appName.toLowerCase(),
    appNameKebab: toKebabCase(appName),
    appNamePascal: toPascalCase(appName),
  };

  // Find template directory
  const templateDir = path.join(__dirname, '..', 'template');
  if (!await fs.pathExists(templateDir)) {
    throw new Error('Template directory not found. Package may be corrupted.');
  }

  // Create target directory
  await fs.ensureDir(targetDir);

  // Copy and process template
  console.log(chalk.blue('📁 Copying template files...'));
  await copyTemplate(templateDir, targetDir, replacements);
  console.log(chalk.green('   ✓ Template copied'));

  // Initialize git
  if (!options.skipGit) {
    console.log(chalk.blue('🔧 Initializing git repository...'));
    try {
      execSync('git init', { cwd: targetDir, stdio: 'pipe' });
      console.log(chalk.green('   ✓ Git initialized'));
    } catch {
      console.log(chalk.yellow('   ⚠ Git init failed (git may not be installed)'));
    }
  }

  // Install dependencies
  if (!options.skipInstall) {
    console.log(chalk.blue('📦 Installing dependencies...'));
    try {
      execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
      console.log(chalk.green('   ✓ Dependencies installed'));
    } catch {
      console.log(chalk.yellow('   ⚠ npm install failed'));
    }
  }

  // Print success message
  console.log();
  console.log(chalk.green('✨ Success!'), `Created ${chalk.bold(appName)} at ${targetDir}`);
  console.log();
  console.log('Next steps:');
  console.log(chalk.cyan(`  cd ${path.basename(targetDir)}`));
  if (options.skipInstall) {
    console.log(chalk.cyan('  npm install'));
  }
  console.log(chalk.cyan('  npm run dev'));
  console.log();
  console.log('Documentation:');
  console.log(chalk.gray('  README.md          - Getting started guide'));
  console.log(chalk.gray('  docs/CUSTOMIZE.md  - How to customize your app'));
  console.log(chalk.gray('  docs/DEPLOY.md     - Deployment instructions'));
  console.log();
}

export default createApp;
