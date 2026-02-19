import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for faster DOM testing
    environment: 'happy-dom',

    // Global test setup
    globals: true,
    setupFiles: ['./tests/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '*.config.{js,ts}',
        'dist/**',
        'coverage/**',
        'src/main.tsx',
        'src/index.tsx',
      ],
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },

    // Test matching patterns
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],

    // Timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,

    // Reporter
    reporter: ['verbose'],

    // Mock reset between tests
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './components'),
      '@hooks': path.resolve(__dirname, './hooks'),
      '@types': path.resolve(__dirname, './types'),
    },
  },
});
