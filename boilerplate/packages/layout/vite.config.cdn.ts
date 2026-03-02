import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite configuration for CDN bundle output.
 * 
 * Builds @digistratum/layout as an IIFE bundle suitable for CDN distribution.
 * React and peer dependencies are externalized - consumers must provide them.
 * 
 * Usage:
 *   npx vite build --config vite.config.cdn.ts
 * 
 * Output:
 *   dist/cdn/ds-layout.iife.js      - Minified bundle
 *   dist/cdn/ds-layout.iife.js.map  - Source map
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
      fileName: 'ds-layout',
      formats: ['iife'],
    },
    rollupOptions: {
      // Externalize peer dependencies - consumers provide these
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-i18next', 'i18next'],
      output: {
        // Global variable names for externalized dependencies
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime',
          'react-i18next': 'ReactI18next',
          i18next: 'i18next',
        },
        // Add banner comment for CDN usage
        banner: '/* @digistratum/layout - CDN Bundle - Requires React as global */',
      },
    },
  },
});
