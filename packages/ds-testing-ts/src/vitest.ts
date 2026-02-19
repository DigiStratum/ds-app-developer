/**
 * Vitest Utilities
 *
 * Helper functions for Vitest tests
 */

import { vi, type Mock } from 'vitest';

/**
 * Create a typed mock function
 */
export function createMock<T extends (...args: any[]) => any>(): Mock<Parameters<T>, ReturnType<T>> {
  return vi.fn();
}

/**
 * Wait for all pending promises to resolve
 */
export async function flushPromises(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Setup mock timers that auto-advance
 */
export function setupMockTimers(): {
  advanceBy: (ms: number) => Promise<void>;
  advanceTo: (date: Date) => Promise<void>;
  cleanup: () => void;
} {
  vi.useFakeTimers();

  return {
    advanceBy: async (ms: number) => {
      await vi.advanceTimersByTimeAsync(ms);
    },
    advanceTo: async (date: Date) => {
      await vi.setSystemTime(date);
    },
    cleanup: () => {
      vi.useRealTimers();
    },
  };
}

/**
 * Mock environment variables for a test
 */
export function mockEnv(vars: Record<string, string>): () => void {
  const original = { ...process.env };
  Object.assign(process.env, vars);

  return () => {
    for (const key of Object.keys(vars)) {
      if (key in original) {
        process.env[key] = original[key];
      } else {
        delete process.env[key];
      }
    }
  };
}

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Re-export vitest utilities
 */
export { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
