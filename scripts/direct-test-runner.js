#!/usr/bin/env node
/**
 * Direct test runner - bypasses Vitest's path resolution issues
 * Uses Node.js native test runner or direct test imports
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Find all test files
function findTestFiles(dir) {
  const files = [];
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Run a single test file using tsx
async function runTestFile(testFile) {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['tsx', testFile], {
      cwd: rootDir,
      stdio: 'pipe',
      shell: true,
      env: {
        ...process.env,
        NODE_TEST: '1',
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ file: testFile, code, stdout, stderr });
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// Main test runner
async function main() {
  log('🧪 Direct Test Runner - Bypassing Vitest\n', 'cyan');

  const testDir = join(rootDir, 'tests', 'unit');
  const testFiles = findTestFiles(testDir);

  log(`Found ${testFiles.length} test files\n`, 'blue');

  const results = {
    passed: 0,
    failed: 0,
    total: testFiles.length,
    failures: [],
  };

  for (const testFile of testFiles) {
    const relativePath = testFile.replace(rootDir, '').replace(/\\/g, '/');
    log(`Running: ${relativePath}`, 'yellow');

    try {
      const result = await runTestFile(testFile);

      if (result.code === 0) {
        log(`✅ PASSED: ${relativePath}\n`, 'green');
        results.passed++;
      } else {
        log(`❌ FAILED: ${relativePath}`, 'red');
        if (result.stderr) {
          log(result.stderr, 'red');
        }
        log('');
        results.failed++;
        results.failures.push({ file: relativePath, error: result.stderr });
      }
    } catch (err) {
      log(`❌ ERROR: ${relativePath} - ${err.message}`, 'red');
      results.failed++;
      results.failures.push({ file: relativePath, error: err.message });
    }
  }

  // Print summary
  log('\n📊 Test Summary\n', 'cyan');
  log(`Total:  ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'blue');

  if (results.failures.length > 0) {
    log('\n❌ Failures:\n', 'red');
    for (const failure of results.failures) {
      log(`  - ${failure.file}`, 'red');
    }
  }

  log('');
  if (results.failed === 0) {
    log('✅ All tests passed!\n', 'green');
    process.exit(0);
  } else {
    log(`❌ ${results.failed} test(s) failed\n`, 'red');
    process.exit(1);
  }
}

main().catch((err) => {
  log(`\n❌ Fatal error: ${err.message}\n`, 'red');
  process.exit(1);
});
