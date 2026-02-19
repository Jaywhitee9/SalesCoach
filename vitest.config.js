import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global test setup
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'client/**',
        'tests/**',
        'scripts/**',
        '*.config.js',
        'dist/**',
        'coverage/**',
      ],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },

    // Test matching patterns
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    exclude: ['node_modules', 'dist', 'client'],

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
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
