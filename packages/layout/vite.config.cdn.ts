import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite configuration for CDN bundle output.
 * 
 * Builds @digistratum/layout as an ES module bundle for CDN distribution.
 * Uses ESM format for compatibility with dynamic import() in apps.
 * 
 * Usage:
 *   npx vite build --config vite.config.cdn.ts
 * 
 * Output:
 *   dist/cdn/shell.js      - ESM bundle
 *   dist/cdn/shell.js.map  - Source map
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/cdn',
    emptyDirOnBuild: true,
    sourcemap: true,
    minify: 'esbuild',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DSLayout',
      fileName: () => 'shell.js',
      formats: ['es'],
    },
    rollupOptions: {
      // Externalize React - apps provide it
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-i18next', 'i18next'],
      output: {
        // For ESM, globals aren't used but we still need to specify format
        format: 'es',
        // Add banner comment
        banner: '/* @digistratum/layout - CDN Shell (ESM) */',
      },
    },
  },
});
