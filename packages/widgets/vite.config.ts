import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      copyDtsFiles: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FlowstaAuthWidgets',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'esm.' : ''}js`,
    },
    rollupOptions: {
      external: ['@flowsta/auth-sdk', 'dompurify'],
      output: {
        globals: {
          '@flowsta/auth-sdk': 'FlowstaAuth',
          'dompurify': 'DOMPurify',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'styles.css';
          return assetInfo.name as string;
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
});

