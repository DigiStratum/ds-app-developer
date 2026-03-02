/**
 * @digistratum/ds-core - Shell Loader Utilities
 * 
 * Configuration and utilities for loading the App Shell from CDN.
 * Implements FR-SHELL-001: Load shell from CDN at runtime.
 * 
 * @see ~/.openclaw/workspace/spikes/912-app-shell-evaluation.md
 */

import type { ShellLoaderConfig, ShellModuleExports } from '../types/shell-loader';

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default CDN URL pattern for shell module.
 * Version is interpolated: https://apps.digistratum.com/shell/{version}/index.mjs
 */
const DEFAULT_CDN_BASE = 'https://apps.digistratum.com/shell';
const DEFAULT_VERSION = 'v1';
const DEFAULT_ENTRY = 'index.mjs';
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_RETRIES = 2;

/**
 * Environment variable name for shell URL override.
 * Set VITE_SHELL_URL to override the default CDN URL.
 */
const SHELL_URL_ENV_VAR = 'VITE_SHELL_URL';

/**
 * Get shell URL from environment or construct default.
 */
function getShellUrlFromEnv(): string | undefined {
  // Check for Node.js env (SSR/testing) - works in both CJS and ESM
  if (typeof process !== 'undefined' && process.env) {
    return process.env[SHELL_URL_ENV_VAR];
  }
  
  // Check for Vite-style env variable (client-side ESM only)
  // This check is safe in CJS - import.meta will be undefined/empty
  try {
    // Using indirect eval to avoid CJS bundler warnings
    const meta = import.meta;
    if (meta && typeof meta === 'object') {
      const env = (meta as unknown as { env?: Record<string, string> }).env;
      if (env && env[SHELL_URL_ENV_VAR]) {
        return env[SHELL_URL_ENV_VAR];
      }
    }
  } catch {
    // import.meta not available - that's fine, use default
  }
  
  return undefined;
}

/**
 * Build the full shell module URL.
 */
function buildShellUrl(config: ShellLoaderConfig): string {
  // Explicit URL takes precedence
  if (config.shellUrl) {
    return config.shellUrl;
  }

  // Check environment variable
  const envUrl = getShellUrlFromEnv();
  if (envUrl) {
    return envUrl;
  }

  // Construct from base + version
  const version = config.version || DEFAULT_VERSION;
  return `${DEFAULT_CDN_BASE}/${version}/${DEFAULT_ENTRY}`;
}

// =============================================================================
// Shell Loader State (Singleton)
// =============================================================================

interface ShellLoaderState {
  config: ShellLoaderConfig;
  modulePromise: Promise<ShellModuleExports> | null;
  module: ShellModuleExports | null;
  error: Error | null;
  retryCount: number;
}

const state: ShellLoaderState = {
  config: {},
  modulePromise: null,
  module: null,
  error: null,
  retryCount: 0,
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Configure the shell loader.
 * Call this early in your app (e.g., in main.tsx) to set custom options.
 * 
 * @example
 * ```tsx
 * // main.tsx
 * import { configureShellLoader } from '@digistratum/ds-core';
 * 
 * configureShellLoader({
 *   version: 'v2',
 *   timeout: 5000,
 *   enableLocalFallback: true,
 * });
 * ```
 */
export function configureShellLoader(config: ShellLoaderConfig): void {
  state.config = { ...state.config, ...config };
  
  // Add preload hint if strategy is eager
  if (config.preloadStrategy !== 'none') {
    addPreloadHint();
  }
}

/**
 * Get the current shell loader configuration.
 */
export function getShellLoaderConfig(): ShellLoaderConfig {
  return { ...state.config };
}

/**
 * Get the resolved shell URL (for debugging/logging).
 */
export function getResolvedShellUrl(): string {
  return buildShellUrl(state.config);
}

/**
 * Add a preload link hint for the shell module.
 * This helps browsers start loading the module early.
 */
export function addPreloadHint(): void {
  if (typeof document === 'undefined') return;

  const url = buildShellUrl(state.config);
  const existingLink = document.querySelector(`link[href="${url}"]`);
  
  if (!existingLink) {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
}

/**
 * Load the shell module from CDN.
 * Returns a promise that resolves to the shell module exports.
 * Results are cached - subsequent calls return the same promise.
 * 
 * @example
 * ```tsx
 * const { DSAppShell, DSHeader, DSFooter } = await loadShellModule();
 * ```
 */
export async function loadShellModule(
  config?: ShellLoaderConfig
): Promise<ShellModuleExports> {
  const mergedConfig = { ...state.config, ...config };
  
  // Return cached module if already loaded
  if (state.module) {
    return state.module;
  }

  // Return existing promise if loading in progress
  if (state.modulePromise) {
    return state.modulePromise;
  }

  const url = buildShellUrl(mergedConfig);
  const timeout = mergedConfig.timeout ?? DEFAULT_TIMEOUT;
  const maxRetries = mergedConfig.retries ?? DEFAULT_RETRIES;

  // Create loading promise with timeout
  state.modulePromise = (async () => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Dynamic import with timeout race
        const module = await Promise.race([
          import(/* @vite-ignore */ url) as Promise<ShellModuleExports>,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Shell load timeout after ${timeout}ms`)), timeout)
          ),
        ]);

        // Validate module has expected exports
        if (!module.DSAppShell || !module.DSHeader || !module.DSFooter) {
          throw new Error('Shell module missing required exports (DSAppShell, DSHeader, DSFooter)');
        }

        state.module = module;
        state.error = null;
        return module;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        state.retryCount = attempt;
        
        console.warn(
          `[ShellLoader] Load attempt ${attempt + 1}/${maxRetries + 1} failed:`,
          lastError.message
        );

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
        }
      }
    }

    // All retries exhausted - try local fallback
    if (mergedConfig.enableLocalFallback !== false) {
      try {
        console.info('[ShellLoader] Attempting local fallback import...');
        // Dynamic import of local package - marked as external by bundler config
        // The @vite-ignore comment prevents Vite from analyzing this import
        // Using a variable for the module path prevents TypeScript from trying to
        // resolve the types during declaration emit (avoids circular dependency)
        const layoutModulePath = '@digistratum/layout';
        const localModule = await import(
          /* @vite-ignore */
          layoutModulePath
        ) as ShellModuleExports;
        state.module = localModule;
        state.error = null;
        return localModule;
      } catch (fallbackError) {
        console.error('[ShellLoader] Local fallback also failed:', fallbackError);
      }
    }

    // Final failure
    state.error = lastError;
    state.modulePromise = null; // Allow retry
    throw lastError;
  })();

  return state.modulePromise;
}

/**
 * Reset the shell loader state.
 * Useful for testing or forcing a reload.
 */
export function resetShellLoader(): void {
  state.config = {};
  state.modulePromise = null;
  state.module = null;
  state.error = null;
  state.retryCount = 0;
}

/**
 * Check if shell module is already loaded.
 */
export function isShellLoaded(): boolean {
  return state.module !== null;
}

/**
 * Get the last error from shell loading (if any).
 */
export function getShellLoadError(): Error | null {
  return state.error;
}

/**
 * Get the number of retry attempts made.
 */
export function getShellRetryCount(): number {
  return state.retryCount;
}
