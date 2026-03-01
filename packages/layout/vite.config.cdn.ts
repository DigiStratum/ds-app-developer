import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite configuration for building the shell as a CDN-hosted IIFE bundle.
 * 
 * This builds the @digistratum/layout package as a browser-compatible IIFE bundle
 * that derived apps can load at runtime via a standard script tag.
 * 
 * Usage:
 *   npm run build:cdn
 * 
 * Output:
 *   dist/shell.js      - Main IIFE bundle
 *   dist/shell.js.map  - Source maps
 * 
 * Consumer usage:
 *   <!-- Load React and ReactDOM first -->
 *   <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
 *   <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
 *   
 *   <!-- Load the shell -->
 *   <script src="https://apps.digistratum.com/shell/v1/shell.js"></script>
 *   
 *   <!-- Use the components -->
 *   <script>
 *     const { DSAppShell, DSHeader, DSFooter } = window.DSLayout;
 *   </script>
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DSLayout',  // Global variable name: window.DSLayout
      formats: ['iife'],
      fileName: () => 'shell.js',
    },
    rollupOptions: {
      // Externalize React and other peer dependencies
      // Consumers must provide their own React via script tags
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
      ],
      output: {
        // Global variable names for external deps (required for IIFE)
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'React',  // JSX runtime uses React global
        },
        // Don't chunk - single file for CDN simplicity
        inlineDynamicImports: true,
        // Preserve export names
        preserveModules: false,
        // Add banner comment
        banner: '/* @digistratum/layout v0.2.0 - CDN Build (IIFE) */\n',
        // Extend window.DSLayout instead of replacing
        extend: true,
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
    // Don't empty output dir - tsup also outputs here
    emptyOutDir: false,
  },
  // Ensure we resolve TypeScript and React properly
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Define for React JSX
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
