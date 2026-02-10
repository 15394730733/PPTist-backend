#!/usr/bin/env node
/**
 * Performance Benchmark Script for PPTist Backend
 *
 * This script runs performance benchmarks on the PPTX conversion service
 * and generates detailed performance reports.
 *
 * Usage:
 *   node scripts/benchmark.js [options]
 *
 * Options:
 *   --iterations <n>    Number of iterations (default: 10)
 *   --concurrency <n>   Concurrent requests (default: 1)
 *   --file <path>       PPTX file to test (default: tests/fixtures/simple.pptx)
 *   --output <path>     Output directory for results (default: benchmark-results)
 *   --format <fmt>      Output format: json | csv | html (default: json)
 *   --warmup            Run warmup iterations
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_DIR = path.dirname(__dirname);

// Benchmark results storage
const results = {
  timestamp: new Date().toISOString(),
  systemInfo: {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cpus: require('os').cpus().length,
    totalMemory: Math.round(require('os').totalmem() / 1024 / 1024 / 1024) + ' GB',
  },
  config: {},
  runs: [],
  summary: {},
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    iterations: 10,
    concurrency: 1,
    file: path.join(PROJECT_DIR, 'tests/fixtures/simple.pptx'),
    output: path.join(PROJECT_DIR, 'benchmark-results'),
    format: 'json',
    warmup: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--iterations':
        config.iterations = parseInt(args[++i]);
        break;
      case '--concurrency':
        config.concurrency = parseInt(args[++i]);
        break;
      case '--file':
        config.file = args[++i];
        break;
      case '--output':
        config.output = args[++i];
        break;
      case '--format':
        config.format = args[++i];
        break;
      case '--warmup':
        config.warmup = true;
        break;
    }
  }

  return config;
}

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Calculate statistics
function calculateStats(values) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: mean.toFixed(2),
    median: sorted[Math.floor(sorted.length / 2)].toFixed(2),
    p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
    p99: sorted[Math.floor(sorted.length * 0.99)].toFixed(2),
    stdDev: stdDev.toFixed(2),
    variance: variance.toFixed(2),
  };
}

// Calculate file hash
async function calculateFileHash(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

// Get file size
async function getFileSize(filePath) {
  const stats = await fs.stat(filePath);
  return stats.size;
}

// Format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Format duration
function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 60000).toFixed(2)} min`;
}

// Simulate conversion (replace with actual API call)
async function convertFile(filePath, options = {}) {
  const startTime = performance.now();

  // Simulate conversion work based on file size
  const stats = await fs.stat(filePath);
  const fileSize = stats.size;

  // Simulate processing time (0.5-2ms per KB)
  const processingTime = (fileSize / 1024) * (0.5 + Math.random() * 1.5);
  await new Promise(resolve => setTimeout(resolve, processingTime));

  const endTime = performance.now();
  const duration = endTime - startTime;

  return {
    success: true,
    duration,
    fileSize,
    timestamp: new Date().toISOString(),
  };
}

// Run single benchmark
async function runBenchmark(config) {
  log('\n📊 Running Benchmark...', 'blue');

  const fileHash = await calculateFileHash(config.file);
  const fileSize = await getFileSize(config.file);

  log(`   File: ${path.basename(config.file)}`, 'blue');
  log(`   Size: ${formatBytes(fileSize)}`, 'blue');
  log(`   Hash: ${fileHash}`, 'blue');
  log(`   Iterations: ${config.iterations}`, 'blue');
  log(`   Concurrency: ${config.concurrency}`, 'blue');

  // Warmup
  if (config.warmup) {
    log('\n🔥 Warming up...', 'yellow');
    const warmupIterations = Math.min(3, Math.floor(config.iterations / 2));
    for (let i = 0; i < warmupIterations; i++) {
      await convertFile(config.file);
    }
    log(`   Completed ${warmupIterations} warmup iterations`, 'yellow');
  }

  // Benchmark
  log('\n⏱️  Starting benchmark iterations...', 'blue');
  const durations = [];
  const throughputs = [];

  for (let i = 0; i < config.iterations; i++) {
    const result = await convertFile(config.file);
    durations.push(result.duration);
    throughputs.push(result.fileSize / result.duration); // bytes/ms

    process.stdout.write(`\r   Progress: ${i + 1}/${config.iterations} (${((i + 1) / config.iterations * 100).toFixed(1)}%)`);
  }

  console.log(); // New line

  return {
    durations,
    throughputs,
    fileHash,
    fileSize,
  };
}

// Run concurrent benchmark
async function runConcurrentBenchmark(config) {
  if (config.concurrency <= 1) {
    return await runBenchmark(config);
  }

  log('\n📊 Running Concurrent Benchmark...', 'blue');
  log(`   Concurrency Level: ${config.concurrency}`, 'blue');

  const fileHash = await calculateFileHash(config.file);
  const fileSize = await getFileSize(config.file);

  const durations = [];
  const throughputs = [];

  for (let i = 0; i < config.iterations; i++) {
    const startTime = performance.now();

    // Run concurrent conversions
    const promises = Array(config.concurrency).fill(null).map(() =>
      convertFile(config.file)
    );

    const results = await Promise.all(promises);
    const endTime = performance.now();

    const totalDuration = endTime - startTime;
    durations.push(totalDuration);

    // Calculate throughput (total bytes processed / total time)
    const totalBytes = results.reduce((sum, r) => sum + r.fileSize, 0);
    throughputs.push(totalBytes / totalDuration);

    process.stdout.write(`\r   Progress: ${i + 1}/${config.iterations} (${((i + 1) / config.iterations * 100).toFixed(1)}%)`);
  }

  console.log(); // New line

  return {
    durations,
    throughputs,
    fileHash,
    fileSize,
  };
}

// Generate summary
function generateSummary(runData) {
  const durationStats = calculateStats(runData.durations);
  const throughputStats = calculateStats(runData.throughputs);

  return {
    duration: durationStats,
    throughput: throughputStats,
    fileSize: formatBytes(runData.fileSize),
    fileHash: runData.fileHash,
  };
}

// Print results
function printResults(summary) {
  log('\n✅ Benchmark Complete!\n', 'green');

  log('📈 Performance Summary:', 'blue');
  log('─────────────────────────────────────', 'blue');

  log('\n⏱️  Duration Statistics:', 'yellow');
  log(`   Mean:    ${summary.duration.mean} ms`, 'reset');
  log(`   Median:  ${summary.duration.median} ms`, 'reset');
  log(`   Min:     ${summary.duration.min} ms`, 'reset');
  log(`   Max:     ${summary.duration.max} ms`, 'reset');
  log(`   Std Dev: ${summary.duration.stdDev} ms`, 'reset');
  log(`   P95:     ${summary.duration.p95} ms`, 'reset');
  log(`   P99:     ${summary.duration.p99} ms`, 'reset');

  log('\n🚀 Throughput Statistics:', 'yellow');
  log(`   Mean:    ${formatBytes(summary.throughput.mean * 1000)} /s`, 'reset');
  log(`   Median:  ${formatBytes(summary.throughput.median * 1000)} /s`, 'reset');
  log(`   Min:     ${formatBytes(summary.throughput.min * 1000)} /s`, 'reset');
  log(`   Max:     ${formatBytes(summary.throughput.max * 1000)} /s`, 'reset');
  log(`   P95:     ${formatBytes(summary.throughput.p95 * 1000)} /s`, 'reset');

  log('\n📁 File Information:', 'yellow');
  log(`   Size: ${summary.fileSize}`, 'reset');
  log(`   Hash: ${summary.fileHash}`, 'reset');
}

// Save results
async function saveResults(config, summary) {
  results.config = config;
  results.summary = summary;

  // Ensure output directory exists
  await fs.mkdir(config.output, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `benchmark-${timestamp}.json`;
  const filepath = path.join(config.output, filename);

  await fs.writeFile(filepath, JSON.stringify(results, null, 2));

  log(`\n💾 Results saved to: ${filepath}`, 'blue');

  // Save CSV if requested
  if (config.format === 'csv') {
    const csvFile = filepath.replace('.json', '.csv');
    const csv = generateCSV(results);
    await fs.writeFile(csvFile, csv);
    log(`📊 CSV saved to: ${csvFile}`, 'blue');
  }

  // Generate HTML report if requested
  if (config.format === 'html') {
    const htmlFile = filepath.replace('.json', '.html');
    const html = generateHTML(results);
    await fs.writeFile(htmlFile, html);
    log(`📄 HTML report saved to: ${htmlFile}`, 'blue');
  }
}

// Generate CSV format
function generateCSV(data) {
  const lines = [
    'Metric,Value',
    `Timestamp,${data.timestamp}`,
    `Platform,${data.systemInfo.platform}`,
    `Node Version,${data.systemInfo.nodeVersion}`,
    `Iterations,${data.config.iterations}`,
    `Concurrency,${data.config.concurrency}`,
    `Mean Duration (ms),${data.summary.duration.mean}`,
    `Median Duration (ms),${data.summary.duration.median}`,
    `Min Duration (ms),${data.summary.duration.min}`,
    `Max Duration (ms),${data.summary.duration.max}`,
    `Std Dev (ms),${data.summary.duration.stdDev}`,
    `P95 (ms),${data.summary.duration.p95}`,
    `P99 (ms),${data.summary.duration.p99}`,
    `Mean Throughput (bytes/ms),${data.summary.throughput.mean}`,
    `Median Throughput (bytes/ms),${data.summary.throughput.median}`,
    `File Size,${data.summary.fileSize}`,
    `File Hash,${data.summary.fileHash}`,
  ];

  return lines.join('\n');
}

// Generate HTML report
function generateHTML(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PPTist Benchmark Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
    }
    .info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .info-item {
      background: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      border-left: 4px solid #3498db;
    }
    .info-label {
      font-weight: bold;
      color: #7f8c8d;
      font-size: 0.9em;
    }
    .info-value {
      color: #2c3e50;
      font-size: 1.2em;
      margin-top: 5px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-label {
      font-size: 0.9em;
      opacity: 0.9;
    }
    .stat-value {
      font-size: 1.8em;
      font-weight: bold;
      margin-top: 10px;
    }
    .timestamp {
      color: #95a5a6;
      font-size: 0.9em;
      margin-top: 30px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 PPTist Performance Benchmark Report</h1>

    <h2>System Information</h2>
    <div class="info">
      <div class="info-item">
        <div class="info-label">Platform</div>
        <div class="info-value">${data.systemInfo.platform}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Node Version</div>
        <div class="info-value">${data.systemInfo.nodeVersion}</div>
      </div>
      <div class="info-item">
        <div class="info-label">CPUs</div>
        <div class="info-value">${data.systemInfo.cpus}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Total Memory</div>
        <div class="info-value">${data.systemInfo.totalMemory}</div>
      </div>
    </div>

    <h2>Benchmark Configuration</h2>
    <div class="info">
      <div class="info-item">
        <div class="info-label">Iterations</div>
        <div class="info-value">${data.config.iterations}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Concurrency</div>
        <div class="info-value">${data.config.concurrency}</div>
      </div>
      <div class="info-item">
        <div class="info-label">File Size</div>
        <div class="info-value">${data.summary.fileSize}</div>
      </div>
    </div>

    <h2>Performance Metrics</h2>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Mean Duration</div>
        <div class="stat-value">${data.summary.duration.mean} ms</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Median Duration</div>
        <div class="stat-value">${data.summary.duration.median} ms</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">P95 Duration</div>
        <div class="stat-value">${data.summary.duration.p95} ms</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Std Deviation</div>
        <div class="stat-value">${data.summary.duration.stdDev} ms</div>
      </div>
    </div>

    <h2>Throughput Metrics</h2>
    <div class="stats">
      <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
        <div class="stat-label">Mean Throughput</div>
        <div class="stat-value">${formatBytes(data.summary.throughput.mean * 1000)} /s</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
        <div class="stat-label">Median Throughput</div>
        <div class="stat-value">${formatBytes(data.summary.throughput.median * 1000)} /s</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
        <div class="stat-label">P95 Throughput</div>
        <div class="stat-value">${formatBytes(data.summary.throughput.p95 * 1000)} /s</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
        <div class="stat-label">Max Throughput</div>
        <div class="stat-value">${formatBytes(data.summary.throughput.max * 1000)} /s</div>
      </div>
    </div>

    <div class="timestamp">
      Generated: ${data.timestamp}
    </div>
  </div>
</body>
</html>`;
}

// Main function
async function main() {
  try {
    log('\n🚀 PPTist Backend Benchmark Tool', 'green');
    log('═'.repeat(50), 'green');

    const config = parseArgs();

    // Validate file exists
    try {
      await fs.access(config.file);
    } catch {
      log(`\n❌ Error: File not found: ${config.file}`, 'red');
      process.exit(1);
    }

    // Run benchmark
    const runData = await runConcurrentBenchmark(config);

    // Generate summary
    const summary = generateSummary(runData);

    // Print results
    printResults(summary);

    // Save results
    await saveResults(config, summary);

    log('\n✅ Benchmark complete!', 'green');
    process.exit(0);
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runBenchmark, generateSummary, printResults };
