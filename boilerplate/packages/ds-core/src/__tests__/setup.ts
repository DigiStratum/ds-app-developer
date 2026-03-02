/**
 * Vitest test setup
 */
import '@testing-library/jest-dom/vitest';

// Mock import.meta.env for tests
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {},
    },
  },
  writable: true,
});
