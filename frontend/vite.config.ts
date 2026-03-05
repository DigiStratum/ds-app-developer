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
      '@digistratum/ds-core': path.resolve(__dirname, '../packages/ds-core/src'),
      '@digistratum/appshell': path.resolve(__dirname, '../components/appshell'),
      '@digistratum/layout': path.resolve(__dirname, '../components/layout-compat.ts'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'),
      'i18next': path.resolve(__dirname, 'node_modules/i18next'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**/*'],
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
