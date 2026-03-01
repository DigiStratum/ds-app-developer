import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**/*'],
  },
  // Environment variables for shell loading
  // VITE_SHELL_CDN_URL - CDN base URL (default: https://apps.digistratum.com/shell)
  // VITE_SHELL_VERSION - Shell version to load (default: v1)
  define: {
    // Expose env vars to the app
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
