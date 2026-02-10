import promClient from 'prom-client';
import config from 'config';
import logger from './logger.js';

// Check if metrics are enabled
const metricsEnabled = config.get<boolean>('metrics.enabled');

// Create Prometheus Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
if (metricsEnabled) {
  promClient.collectDefaultMetrics({
    register,
    prefix: 'pptx_conversion_',
  });
}

// Custom metrics for the PPTX conversion service

// Counter: Total conversion tasks
export const conversionTasksTotal = new promClient.Counter({
  name: 'pptx_conversion_tasks_total',
  help: 'Total number of conversion tasks received',
  labelNames: ['status'] as const, // 'queued', 'processing', 'completed', 'failed'
  registers: [register],
});

// Counter: Total files processed
export const filesProcessedTotal = new promClient.Counter({
  name: 'pptx_files_processed_total',
  help: 'Total number of PPTX files processed',
  labelNames: ['result'] as const, // 'success', 'failure'
  registers: [register],
});

// Histogram: Conversion duration
export const conversionDuration = new promClient.Histogram({
  name: 'pptx_conversion_duration_seconds',
  help: 'Duration of conversion tasks in seconds',
  labelNames: ['status'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // seconds
  registers: [register],
});

// Gauge: Current queue size
export const queueSize = new promClient.Gauge({
  name: 'pptx_queue_size',
  help: 'Current number of tasks in the queue',
  registers: [register],
});

// Gauge: Active conversions
export const activeConversions = new promClient.Gauge({
  name: 'pptx_active_conversions',
  help: 'Number of currently active conversions',
  registers: [register],
});

// Gauge: File size
export const fileSizeBytes = new promClient.Histogram({
  name: 'pptx_file_size_bytes',
  help: 'Size of uploaded PPTX files in bytes',
  buckets: [1024, 10240, 102400, 1048576, 10485760, 52428800, 104857600], // bytes
  registers: [register],
});

// Counter: Errors by type
export const errorsTotal = new promClient.Counter({
  name: 'pptx_errors_total',
  help: 'Total number of errors encountered',
  labelNames: ['error_type'] as const, // 'validation', 'parsing', 'conversion', 'storage'
  registers: [register],
});

/**
 * Get metrics endpoint handler
 */
export const getMetrics = async (): Promise<string> => {
  if (!metricsEnabled) {
    return 'Metrics are disabled';
  }
  return register.metrics();
};

/**
 * Increment error counter
 */
export const recordError = (errorType: string): void => {
  if (!metricsEnabled) return;

  errorsTotal.inc({ error_type: errorType });
  logger.debug({ errorType }, 'Recorded error metric');
};

/**
 * Start conversion duration timer
 */
export const startConversionTimer = (status: string): () => void => {
  if (!metricsEnabled) {
    return () => {};
  }

  const end = conversionDuration.startTimer({ status });
  return end;
};

/**
 * Update queue size gauge
 */
export const updateQueueSize = (size: number): void => {
  if (!metricsEnabled) return;

  queueSize.set(size);
};

/**
 * Update active conversions gauge
 */
export const updateActiveConversions = (count: number): void => {
  if (!metricsEnabled) return;

  activeConversions.set(count);
};

/**
 * Record file size
 */
export const recordFileSize = (sizeBytes: number): void => {
  if (!metricsEnabled) return;

  fileSizeBytes.observe(sizeBytes);
};

export { register };
export default {
  register,
  getMetrics,
  conversionTasksTotal,
  filesProcessedTotal,
  conversionDuration,
  queueSize,
  activeConversions,
  fileSizeBytes,
  errorsTotal,
  recordError,
  startConversionTimer,
  updateQueueSize,
  updateActiveConversions,
  recordFileSize,
};
