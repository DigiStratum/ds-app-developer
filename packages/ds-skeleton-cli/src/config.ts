import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Configuration for a derived skeleton app
 */
export interface SkeletonConfig {
  /** Version of the skeleton this app was created from */
  skeletonVersion: string;
  /** Skeleton repository URL */
  skeletonRepo: string;
  /** App name (used for replacements) */
  appName: string;
  /** App name in PascalCase (for class names) */
  appNamePascal: string;
  /** Domain for the app */
  domain: string;
  /** Date the app was created */
  createdAt: string;
  /** Last sync date */
  lastSyncAt?: string;
  /** Files that have been customized (skip during sync) */
  customizedFiles: string[];
  /** Patterns to always skip during sync */
  skipPatterns: string[];
}

const CONFIG_FILE = '.ds-skeleton.json';

/**
 * Default configuration values
 */
export const defaultConfig: Partial<SkeletonConfig> = {
  skeletonRepo: 'https://github.com/DigiStratum/ds-app-skeleton.git',
  customizedFiles: [],
  skipPatterns: [
    'node_modules',
    'dist',
    '.git',
    '*.log',
    '.env*',
    '.ds-skeleton.json',
  ],
};

/**
 * Load skeleton config from a directory
 */
export function loadConfig(dir: string): SkeletonConfig | null {
  const configPath = path.join(dir, CONFIG_FILE);
  
  if (!fs.existsSync(configPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as SkeletonConfig;
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error);
    return null;
  }
}

/**
 * Save skeleton config to a directory
 */
export function saveConfig(dir: string, config: SkeletonConfig): void {
  const configPath = path.join(dir, CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Convert a string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert a string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}
