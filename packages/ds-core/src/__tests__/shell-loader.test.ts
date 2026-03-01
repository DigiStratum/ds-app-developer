/**
 * @digistratum/ds-core - Shell Loader Tests
 * 
 * Tests FR-SHELL-001: Shell loader utility implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  configureShellLoader,
  getShellLoaderConfig,
  getResolvedShellUrl,
  resetShellLoader,
  isShellLoaded,
  getShellLoadError,
  getShellRetryCount,
} from '../utils/shell-loader';

// Mock dynamic imports
vi.mock('@digistratum/layout', () => ({
  DSAppShell: () => null,
  DSHeader: () => null,
  DSFooter: () => null,
}));

describe('Shell Loader Utilities', () => {
  beforeEach(() => {
    // Reset state before each test (includes config reset)
    resetShellLoader();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configureShellLoader', () => {
    it('should set custom shell URL', () => {
      configureShellLoader({
        shellUrl: 'https://custom.cdn.com/shell.mjs',
      });

      expect(getResolvedShellUrl()).toBe('https://custom.cdn.com/shell.mjs');
    });

    it('should set custom version', () => {
      configureShellLoader({
        version: 'v2',
      });

      expect(getResolvedShellUrl()).toBe('https://cdn.digistratum.com/shell/v2/index.mjs');
    });

    it('should merge configurations', () => {
      configureShellLoader({ timeout: 5000 });
      configureShellLoader({ retries: 5 });

      const config = getShellLoaderConfig();
      expect(config.timeout).toBe(5000);
      expect(config.retries).toBe(5);
    });
  });

  describe('getResolvedShellUrl', () => {
    it('should return default URL when no config', () => {
      const url = getResolvedShellUrl();
      expect(url).toBe('https://cdn.digistratum.com/shell/v1/index.mjs');
    });

    it('should prioritize explicit shellUrl over version', () => {
      configureShellLoader({
        shellUrl: 'https://explicit.com/shell.mjs',
        version: 'v3',
      });

      expect(getResolvedShellUrl()).toBe('https://explicit.com/shell.mjs');
    });
  });

  describe('resetShellLoader', () => {
    it('should reset loading state', () => {
      configureShellLoader({ timeout: 1000 });
      resetShellLoader();

      expect(isShellLoaded()).toBe(false);
      expect(getShellLoadError()).toBeNull();
      expect(getShellRetryCount()).toBe(0);
    });
  });

  describe('isShellLoaded', () => {
    it('should return false initially', () => {
      expect(isShellLoaded()).toBe(false);
    });
  });

  describe('getShellLoadError', () => {
    it('should return null when no error', () => {
      expect(getShellLoadError()).toBeNull();
    });
  });

  describe('getShellRetryCount', () => {
    it('should return 0 initially', () => {
      expect(getShellRetryCount()).toBe(0);
    });
  });
});

describe('Shell Loader Configuration', () => {
  beforeEach(() => {
    resetShellLoader();
  });

  it('should handle all configuration options', () => {
    configureShellLoader({
      shellUrl: 'https://test.com/shell.mjs',
      version: 'v1',
      timeout: 15000,
      retries: 3,
      enableLocalFallback: false,
      preloadStrategy: 'lazy',
    });

    const config = getShellLoaderConfig();
    expect(config.shellUrl).toBe('https://test.com/shell.mjs');
    expect(config.version).toBe('v1');
    expect(config.timeout).toBe(15000);
    expect(config.retries).toBe(3);
    expect(config.enableLocalFallback).toBe(false);
    expect(config.preloadStrategy).toBe('lazy');
  });
});
