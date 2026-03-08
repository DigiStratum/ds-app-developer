import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * CDN Shell build configuration.
 * 
 * Outputs IIFE format that:
 * 1. Expects React, ReactDOM, i18next, react-i18next as globals
 * 2. Assigns exports to window.DSLayout
 * 3. App loads via script tag, then accesses window.DSLayout
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
      fileName: () => 'shell',
      formats: ['iife'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-i18next', 'i18next'],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'react-i18next': 'ReactI18next',
          'i18next': 'i18next',
        },
        banner: '/* @digistratum/layout - CDN Shell */',
      },
    },
  },
});
