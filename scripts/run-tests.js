#!/usr/bin/env node
/**
 * Test runner with Windows Chinese path compatibility
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const args = process.argv.slice(2);
const useDocker = args.includes('--docker') || args.includes('-d');

async function runTests() {
  console.log('🧪 Running tests...\n');

  let command, args;

  if (useDocker) {
    console.log('🐳 Using Docker container');
    command = 'docker-compose';
    args = ['-f', 'docker-compose.test.yml', 'up', '--build', '--abort-on-container-exit'];
  } else {
    // Check if vitest.config.fixed.ts exists
    const fixedConfig = join(rootDir, 'vitest.config.fixed.ts');

    if (require('node:fs').existsSync(fixedConfig)) {
      console.log('📋 Using fixed configuration');
      command = 'npx';
      args = ['vitest', 'run', '--config', 'vitest.config.fixed.ts'];
    } else {
      console.log('📋 Using default configuration');
      command = 'npm';
      args = ['test'];
    }
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(0);
      } else {
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

runTests()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);
  });
