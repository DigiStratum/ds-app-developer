import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite configuration for building the shell as a CDN-hosted ES Module.
 * 
 * This builds the @digistratum/layout package as a pure ESM bundle that
 * derived apps can load at runtime from the CDN using dynamic imports.
 * 
 * Usage:
 *   npm run build:cdn
 * 
 * Output:
 *   dist/cdn/shell.js      - Main ESM bundle
 *   dist/cdn/shell.js.map  - Source maps
 * 
 * Consumer usage:
 *   const Shell = await import('https://cdn.digistratum.com/shell/v1/shell.js');
 *   const { DSAppShell, DSHeader, DSFooter } = Shell;
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/cdn',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'shell.js',
    },
    rollupOptions: {
      // Externalize React and other peer dependencies
      // Consumers must provide their own React
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@digistratum/ds-core',
        'react-i18next',
        'i18next',
      ],
      output: {
        // Global variable names for external deps (for non-ESM contexts)
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime',
          '@digistratum/ds-core': 'DSCore',
          'react-i18next': 'reactI18next',
          i18next: 'i18next',
        },
        // Don't chunk - single file for CDN simplicity
        inlineDynamicImports: true,
        // Preserve export names
        preserveModules: false,
        // Add banner comment
        banner: '/* @digistratum/layout - CDN Build */\n',
      },
    },
    // Target modern browsers for CDN usage
    target: 'es2020',
    // Enable minification for production CDN
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    // Generate source maps for debugging
    sourcemap: true,
    // Clean output dir before build
    emptyOutDir: true,
  },
  // Ensure we resolve TypeScript and React properly
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
