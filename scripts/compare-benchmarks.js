#!/usr/bin/env node
/**
 * Performance Comparison Script
 *
 * Compares performance between two benchmark results
 * and generates a detailed comparison report.
 *
 * Usage:
 *   node scripts/compare-benchmarks.js <before.json> <after.json>
 */

import { promises as fs } from 'fs';
import path from 'path';

// Color output
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

function formatPercent(before, after) {
  const change = ((after - before) / before) * 100;
  const sign = change > 0 ? '+' : '';
  const color = change < 0 ? 'green' : change > 0 ? 'red' : 'reset';
  return `${colors[color]}${sign}${change.toFixed(2)}%${colors.reset}`;
}

function formatValue(before, after, unit = '') {
  const change = ((after - before) / before) * 100;
  const arrow = change < 0 ? '↓' : change > 0 ? '↑' : '→';
  const color = change < 0 ? 'green' : change > 0 ? 'red' : 'reset';
  return `${colors[color]}${after.toFixed(2)} ${unit} ${arrow}${colors.reset}`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    log('Usage: node scripts/compare-benchmarks.js <before.json> <after.json>', 'yellow');
    process.exit(1);
  }

  const [beforePath, afterPath] = args;

  log('\n📊 Performance Comparison Report', 'cyan');
  log('═'.repeat(60), 'cyan');

  // Load benchmark results
  log('\n📂 Loading benchmark results...', 'blue');

  let before, after;

  try {
    const beforeContent = await fs.readFile(beforePath, 'utf-8');
    before = JSON.parse(beforeContent);
    log(`   Before: ${beforePath}`, 'blue');
  } catch (error) {
    log(`   ❌ Failed to load before file: ${error.message}`, 'red');
    process.exit(1);
  }

  try {
    const afterContent = await fs.readFile(afterPath, 'utf-8');
    after = JSON.parse(afterContent);
    log(`   After:  ${afterPath}`, 'blue');
  } catch (error) {
    log(`   ❌ Failed to load after file: ${error.message}`, 'red');
    process.exit(1);
  }

  // Compare system info
  log('\n🖥️  System Information', 'blue');
  log('──────────────────────────────────────────────────────────', 'blue');
  log(`   Platform:     ${before.systemInfo.platform} → ${after.systemInfo.platform}`, 'reset');
  log(`   Node Version: ${before.systemInfo.nodeVersion} → ${after.systemInfo.nodeVersion}`, 'reset');
  log(`   CPUs:         ${before.systemInfo.cpus} → ${after.systemInfo.cpus}`, 'reset');

  // Compare configuration
  log('\n⚙️  Benchmark Configuration', 'blue');
  log('──────────────────────────────────────────────────────────', 'blue');
  log(`   Iterations:  ${before.config.iterations} → ${after.config.iterations}`, 'reset');
  log(`   Concurrency: ${before.config.concurrency} → ${after.config.concurrency}`, 'reset');
  log(`   File Size:   ${before.summary.fileSize} → ${after.summary.fileSize}`, 'reset');

  // Check if files are the same
  if (before.summary.fileHash !== after.summary.fileHash) {
    log('\n⚠️  Warning: Different files were tested!', 'yellow');
    log(`   Before Hash: ${before.summary.fileHash}`, 'yellow');
    log(`   After Hash:  ${after.summary.fileHash}`, 'yellow');
  }

  // Compare duration metrics
  log('\n⏱️  Duration Comparison', 'blue');
  log('──────────────────────────────────────────────────────────', 'blue');

  const durationMetrics = [
    { label: 'Mean', key: 'mean' },
    { label: 'Median', key: 'median' },
    { label: 'Min', key: 'min' },
    { label: 'Max', key: 'max' },
    { label: 'Std Dev', key: 'stdDev' },
    { label: 'P95', key: 'p95' },
    { label: 'P99', key: 'p99' },
  ];

  durationMetrics.forEach(({ label, key }) => {
    const beforeValue = parseFloat(before.summary.duration[key]);
    const afterValue = parseFloat(after.summary.duration[key]);

    log(`   ${label.padEnd(10)}: ${beforeValue.toFixed(2).padStart(10)} ms → ${afterValue.toFixed(2).padStart(10)} ms (${formatPercent(beforeValue, afterValue)})`, 'reset');
  });

  // Compare throughput metrics
  log('\n🚀 Throughput Comparison', 'blue');
  log('──────────────────────────────────────────────────────────', 'blue');

  function formatThroughput(value) {
    const bytesPerSec = parseFloat(value) * 1000;
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(2)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(2)} KB/s`;
    return `${(bytesPerSec / 1024 / 1024).toFixed(2)} MB/s`;
  }

  const throughputMetrics = [
    { label: 'Mean', key: 'mean' },
    { label: 'Median', key: 'median' },
    { label: 'Min', key: 'min' },
    { label: 'Max', key: 'max' },
    { label: 'P95', key: 'p95' },
  ];

  throughputMetrics.forEach(({ label, key }) => {
    const beforeValue = parseFloat(before.summary.throughput[key]);
    const afterValue = parseFloat(after.summary.throughput[key]);

    const beforeFormatted = formatThroughput(beforeValue);
    const afterFormatted = formatThroughput(afterValue);

    log(`   ${label.padEnd(10)}: ${beforeFormatted.padStart(15)} → ${afterFormatted.padStart(15)} (${formatPercent(beforeValue, afterValue)})`, 'reset');
  });

  // Calculate overall improvement
  log('\n📈 Overall Performance Summary', 'blue');
  log('──────────────────────────────────────────────────────────', 'blue');

  const meanDurationBefore = parseFloat(before.summary.duration.mean);
  const meanDurationAfter = parseFloat(after.summary.duration.mean);
  const durationImprovement = ((meanDurationBefore - meanDurationAfter) / meanDurationBefore) * 100;

  const meanThroughputBefore = parseFloat(before.summary.throughput.mean);
  const meanThroughputAfter = parseFloat(after.summary.throughput.mean);
  const throughputImprovement = ((meanThroughputAfter - meanThroughputBefore) / meanThroughputBefore) * 100;

  if (durationImprovement > 0) {
    log(`   ✅ Duration improved by ${durationImprovement.toFixed(2)}%`, 'green');
  } else if (durationImprovement < 0) {
    log(`   ❌ Duration degraded by ${Math.abs(durationImprovement).toFixed(2)}%`, 'red');
  } else {
    log(`   ⚪ No change in duration`, 'yellow');
  }

  if (throughputImprovement > 0) {
    log(`   ✅ Throughput improved by ${throughputImprovement.toFixed(2)}%`, 'green');
  } else if (throughputImprovement < 0) {
    log(`   ❌ Throughput degraded by ${Math.abs(throughputImprovement).toFixed(2)}%`, 'red');
  } else {
    log(`   ⚪ No change in throughput`, 'yellow');
  }

  // Verdict
  log('\n🎯 Verdict', 'blue');
  log('──────────────────────────────────────────────────────────', 'blue');

  if (durationImprovement > 5 && throughputImprovement > 5) {
    log('   ✅ SIGNIFICANT IMPROVEMENT - Performance greatly enhanced!', 'green');
  } else if (durationImprovement > 0 && throughputImprovement > 0) {
    log('   ✅ IMPROVEMENT - Performance enhanced', 'green');
  } else if (durationImprovement < -5 || throughputImprovement < -5) {
    log('   ❌ SIGNIFICANT REGRESSION - Performance degraded!', 'red');
  } else if (durationImprovement < 0 || throughputImprovement < 0) {
    log('   ⚠️  REGRESSION - Some performance degradation', 'yellow');
  } else {
    log('   ⚪ NO SIGNIFICANT CHANGE - Performance stable', 'yellow');
  }

  log('\n' + '═'.repeat(60), 'cyan');
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
