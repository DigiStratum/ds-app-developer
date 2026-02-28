import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Configuration for a derived developer app
 */
export interface DeveloperConfig {
  /** Version of the developer this app was created from */
  developerVersion: string;
  /** Developer repository URL */
  developerRepo: string;
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

const CONFIG_FILE = '.ds-developer.json';

/**
 * Default configuration values
 */
export const defaultConfig: Partial<DeveloperConfig> = {
  developerRepo: 'https://github.com/DigiStratum/ds-app-developer.git',
  customizedFiles: [],
  skipPatterns: [
    'node_modules',
    'dist',
    '.git',
    '*.log',
    '.env*',
    '.ds-developer.json',
  ],
};

/**
 * Load developer config from a directory
 */
export function loadConfig(dir: string): DeveloperConfig | null {
  const configPath = path.join(dir, CONFIG_FILE);
  
  if (!fs.existsSync(configPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as DeveloperConfig;
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error);
    return null;
  }
}

/**
 * Save developer config to a directory
 */
export function saveConfig(dir: string, config: DeveloperConfig): void {
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
