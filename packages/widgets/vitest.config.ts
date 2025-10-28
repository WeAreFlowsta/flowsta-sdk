import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts', // Index files are just re-exports
      ],
    },
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
    },
  },
});

