/**
 * Minimal Vitest Configuration
 * Simplified to avoid path issues on Windows
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.{ts,js}'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
    hookTimeout: 10000,
    globals: false,
    coverage: {
      enabled: false, // Disable coverage to avoid path issues
    },
  },
});
