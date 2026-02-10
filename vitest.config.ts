/**
 * Vitest Configuration
 * @see https://vitest.dev/config/
 */

import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// TypeScript 解析插件：将 .js 扩展名映射到 .ts 文件
function tsResolutionPlugin() {
  return {
    name: 'ts-resolution',

    resolveId(source, importer) {
      // 如果导入路径以 .js 结尾且是相对路径
      if (source.endsWith('.js') && (source.startsWith('./') || source.startsWith('../'))) {
        const tsSource = source.replace(/\.js$/, '.ts');
        return {
          id: tsSource,
          external: false,
        };
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [tsResolutionPlugin()],

  test: {
    // Test environment
    environment: 'node',

    // Global setup files
    setupFiles: [],

    // Test file patterns
    include: ['tests/**/*.{test,spec}.{ts,js}'],
    exclude: ['node_modules', 'dist', 'tests/integration'],

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

    // Pool - 使用 vmThreads 以更好地支持 TypeScript
    pool: 'vmThreads',
    poolOptions: {
      vmThreads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },

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

  // Path aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@src': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
      '@types': resolve(__dirname, './src/types'),
    },
    // 确保 .js 扩展名能正确解析到 .ts 文件
    extensions: ['.ts', '.js', '.json'],
  },

  // SSR 配置
  ssr: {
    noExternal: true,
  },
});
