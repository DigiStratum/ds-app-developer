import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { writeFileSync } from 'fs';

// Generate buildinfo.json at build time
const buildInfoPlugin = () => ({
  name: 'build-info',
  buildStart() {
    const buildInfo = {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      commit: process.env.GIT_COMMIT || 'unknown',
      branch: process.env.GIT_BRANCH || 'unknown',
    };
    writeFileSync('public/buildinfo.json', JSON.stringify(buildInfo, null, 2));
  },
});

export default defineConfig({
  plugins: [react(), buildInfoPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/__tests__/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
      thresholds: {
        statements: 8,
        branches: 50,
        functions: 20,
        lines: 8,
      },
    },
  },
  define: {
    __SHELL_DEV_MODE__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
