/**
 * Prometheus Conversion Metrics
 *
 * Tracks metrics for PPTX conversion operations.
 * Records conversion duration, queue length, error rates, etc.
 *
 * @module utils/metrics
 */

import * as promClient from 'prom-client';
import { logger } from './logger.js';

/**
 * Create Prometheus registry
 */
const registry = new promClient.Registry();

/**
 * Conversion duration histogram
 */
export const conversionDurationHistogram = new promClient.Histogram({
  name: 'pptx_conversion_duration_seconds',
  help: 'Duration of PPTX conversion in seconds',
  labelNames: ['status', 'file_size_range'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
  registers: [registry],
});

/**
 * Queue length gauge
 */
export const queueLengthGauge = new promClient.Gauge({
  name: 'pptx_conversion_queue_length',
  help: 'Number of tasks in conversion queue',
  labelNames: ['state'], // queued, processing, completed, failed
  registers: [registry],
});

/**
 * Conversion counter
 */
export const conversionCounter = new promClient.Counter({
  name: 'pptx_conversion_total',
  help: 'Total number of PPTX conversions',
  labelNames: ['status'], // success, error
  registers: [registry],
});

/**
 * File size histogram
 */
export const fileSizeHistogram = new promClient.Histogram({
  name: 'pptx_conversion_file_size_bytes',
  help: 'Size of uploaded PPTX files in bytes',
  buckets: [
    1024, // 1KB
    10240, // 10KB
    102400, // 100KB
    1048576, // 1MB
    10485760, // 10MB
    52428800, // 50MB
    104857600, // 100MB
    209715200, // 200MB
  ],
  registers: [registry],
});

/**
 * Element processing counter
 */
export const elementProcessingCounter = new promClient.Counter({
  name: 'pptx_element_processing_total',
  help: 'Total number of elements processed',
  labelNames: ['element_type'], // text, image, shape, etc.
  registers: [registry],
});

/**
 * Record conversion start
 */
export function recordConversionStart(taskId: string): void {
  const startTime = Date.now();
  // Store start time in request context or map
  (global as any).__conversionStartTimes = (global as any).__conversionStartTimes || {};
  (global as any).__conversionStartTimes[taskId] = startTime;

  logger.debug('Conversion started', { taskId });
}

/**
 * Record conversion completion
 */
export function recordConversionComplete(
  taskId: string,
  status: 'success' | 'error',
  fileSize?: number
): void {
  const startTime = (global as any).__conversionStartTimes?.[taskId];

  if (startTime) {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds

    // Get file size range
    let sizeRange = 'unknown';
    if (fileSize) {
      if (fileSize < 1024) sizeRange = '<1KB';
      else if (fileSize < 102400) sizeRange = '1KB-100KB';
      else if (fileSize < 1048576) sizeRange = '100KB-1MB';
      else if (fileSize < 10485760) sizeRange = '1MB-10MB';
      else if (fileSize < 104857600) sizeRange = '10MB-100MB';
      else sizeRange = '>100MB';
    }

    conversionDurationHistogram
      .labels(status, sizeRange)
      .observe(duration);

    // Clean up
    delete (global as any).__conversionStartTimes[taskId];
  }

  // Increment counter
  conversionCounter.labels(status).inc();

  logger.debug('Conversion completed', {
    taskId,
    status,
    duration: startTime ? (Date.now() - startTime) / 1000 : undefined,
  });
}

/**
 * Update queue length metrics
 */
export function updateQueueMetrics(queue: {
  getStats: () => Promise<{ queued: number; processing: number; completed: number; failed: number }>;
}): void {
  queue.getStats().then((stats) => {
    queueLengthGauge.labels('queued').set(stats.queued);
    queueLengthGauge.labels('processing').set(stats.processing);
    queueLengthGauge.labels('completed').set(stats.completed);
    queueLengthGauge.labels('failed').set(stats.failed);
  }).catch((error) => {
    logger.error('Failed to update queue metrics', { error: error instanceof Error ? error.message : String(error) });
  });
}

/**
 * Record file upload
 */
export function recordFileUpload(fileSize: number): void {
  fileSizeHistogram.observe(fileSize);
  logger.debug('File uploaded', { size: fileSize });
}

/**
 * Record element processing
 */
export function recordElementProcessing(elementType: string): void {
  elementProcessingCounter.labels(elementType).inc();
}

/**
 * Record error
 */
export function recordError(errorCode: string): void {
  conversionCounter.labels('error').inc();
  logger.warn('Conversion error recorded', { errorCode });
}

/**
 * Get metrics for Prometheus endpoint
 */
export async function getMetrics(): Promise<string> {
  return registry.metrics();
}

/**
 * Start metrics server (optional, for production)
 *
 * @param port - Port number for metrics server (default: 9090)
 */
export function startMetricsServer(port: number = 9090): void {
  logger.info('Starting Prometheus metrics server', { port });
  // Note: In production, you might want to use a separate metrics server
  // This is handled by the /metrics endpoint in the main app
}

export default {
  conversionDurationHistogram,
  queueLengthGauge,
  conversionCounter,
  fileSizeHistogram,
  elementProcessingCounter,
  recordConversionStart,
  recordConversionComplete,
  updateQueueMetrics,
  recordFileUpload,
  recordElementProcessing,
  recordError,
  getMetrics,
  startMetricsServer,
};
