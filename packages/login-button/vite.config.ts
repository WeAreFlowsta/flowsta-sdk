import { defineConfig } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        react: resolve(__dirname, 'src/react.ts'),
        vue: resolve(__dirname, 'src/vue.ts'),
        qwik: resolve(__dirname, 'src/qwik.ts'),
        vanilla: resolve(__dirname, 'src/vanilla.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'vue', /^@builder\.io\/qwik/],
      output: {
        preserveModules: false,
      },
    },
  },
});

