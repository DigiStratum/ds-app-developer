import { defineConfig } from 'tsup';

export default defineConfig([
  // ES Modules and CommonJS for npm/dynamic import
  {
    entry: {
      index: 'src/index.ts',
      'hooks/index': 'src/hooks/index.ts',
      'components/index': 'src/components/index.ts',
      'utils/index': 'src/utils/index.ts',
      'types/index': 'src/types/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['react'],
  },
  // UMD bundle for CDN distribution
  {
    entry: { 'ds-core.umd': 'src/index.ts' },
    format: ['iife'],
    globalName: 'DSCore',
    outDir: 'dist/umd',
    dts: false,
    splitting: false,
    sourcemap: true,
    minify: true,
    external: ['react'],
    esbuildOptions(options) {
      options.globalName = 'DSCore';
      // React should be loaded separately for UMD usage
      options.footer = {
        js: '// @digistratum/ds-core UMD bundle - requires React as global',
      };
    },
  },
]);
