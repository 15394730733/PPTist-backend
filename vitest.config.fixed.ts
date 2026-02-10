/**
 * Vitest Configuration - Windows 中文路径兼容版本
 * @see https://vitest.dev/config/
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 获取当前目录的绝对路径
const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // 强制使用工作目录相对路径
  root: process.cwd(),

  test: {
    // Test environment
    environment: 'node',

    // Global setup files
    setupFiles: [],

    // Test file patterns
    include: ['tests/**/*.{test,spec}.{ts,js}'],
    exclude: ['node_modules', 'dist'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/types/',
      ],
    },

    // Timeout for tests (default: 10 seconds)
    testTimeout: 30000,
    hookTimeout: 30000,

    // Threads (parallel execution)
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    // Watch mode
    watch: false,

    // Reporter
    reporter: ['verbose', 'json'],

    // Globals
    globals: false,

    // Suppress console output during tests (set to true to see logs)
    silent: false,
    diff: true,

    // Include sample stack traces
    includeTaskLocation: true,

    // Shuffle tests
    shuffle: false,

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,
  },

  // Path aliases - 使用相对路径
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@src': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
      '@types': resolve(__dirname, './src/types'),
    },
  },

  // 禁用某些优化以避免路径问题
  optimizeDeps: {
    disabled: true,
  },
});
