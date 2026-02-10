/**
 * Conversion Logger
 *
 * Detailed logging system for PPTX conversion operations.
 * Tracks conversion steps, progress, errors, and performance metrics.
 *
 * @module utils/conversion-logger
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from './logger.js';
import { sanitizeFilePath } from './log-sanitizer.js';

/**
 * Conversion step types
 */
export enum ConversionStep {
  VALIDATION = 'validation',
  EXTRACTION = 'extraction',
  PARSING = 'parsing',
  CONVERSION = 'conversion',
  MEDIA_EXTRACTION = 'media_extraction',
  SERIALIZATION = 'serialization',
  COMPLETION = 'completion',
}

/**
 * Conversion log entry
 */
export interface ConversionLogEntry {
  /**
   * Task ID
   */
  taskId: string;

  /**
   * Timestamp
   */
  timestamp: string;

  /**
   * Step
   */
  step: ConversionStep;

  /**
   * Message
   */
  message: string;

  /**
   * Progress percentage
   */
  progress?: number;

  /**
   * Duration in milliseconds
   */
  duration?: number;

  /**
   * Error (if any)
   */
  error?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;

  /**
   * Request ID for distributed tracing
   */
  requestId?: string;
}

/**
 * Conversion log summary
 */
export interface ConversionLogSummary {
  /**
   * Task ID
   */
  taskId: string;

  /**
   * Start time
   */
  startTime: string;

  /**
   * End time
   */
  endTime?: string;

  /**
   * Total duration in milliseconds
   */
  totalDuration?: number;

  /**
   * Status
   */
  status: 'running' | 'completed' | 'failed';

  /**
   * File information
   */
  fileInfo?: {
    filename: string;
    size: number;
    slideCount?: number;
  };

  /**
   * Conversion entries
   */
  entries: ConversionLogEntry[];

  /**
   * Warnings
   */
  warnings: string[];

  /**
   * Errors
   */
  errors: string[];

  /**
   * Performance metrics
   */
  metrics?: Record<string, number>;
}

/**
 * Conversion logger options
 */
export interface ConversionLoggerOptions {
  /**
   * Logs directory
   */
  logsDir?: string;

  /**
   * Whether to write logs to file
   */
  writeToFile?: boolean;

  /**
   * Whether to keep logs in memory
   */
  keepInMemory?: boolean;

  /**
   * Maximum log entries to keep in memory per task
   */
  maxInMemoryEntries?: number;
}

/**
 * Conversion logger class
 */
export class ConversionLogger {
  private logsDir: string;
  private writeToFile: boolean;
  private keepInMemory: boolean;
  private maxInMemoryEntries: number;

  // In-memory log storage (task ID -> summary)
  private logSummaries: Map<string, ConversionLogSummary> = new Map();

  // Step timers (task ID -> step -> start time)
  private stepTimers: Map<string, Map<ConversionStep, number>> = new Map();

  constructor(options: ConversionLoggerOptions = {}) {
    this.logsDir = options.logsDir || '/tmp/pptx-conversion-logs/';
    this.writeToFile = options.writeToFile !== false; // Default true
    this.keepInMemory = options.keepInMemory !== false; // Default true
    this.maxInMemoryEntries = options.maxInMemoryEntries || 1000;

    // Initialize logs directory
    this.initializeDirectory();
  }

  /**
   * Initialize logs directory
   */
  private async initializeDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to initialize conversion logs directory', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Start conversion logging for a task
   */
  async startConversion(
    taskId: string,
    fileInfo: {
      filename: string;
      size: number;
      requestId?: string;
    }
  ): Promise<void> {
    const summary: ConversionLogSummary = {
      taskId,
      startTime: new Date().toISOString(),
      status: 'running',
      fileInfo: {
        filename: sanitizeFilePath(fileInfo.filename),
        size: fileInfo.size,
      },
      entries: [],
      warnings: [],
      errors: [],
      metrics: {},
    };

    this.logSummaries.set(taskId, summary);
    this.stepTimers.set(taskId, new Map());

    await this.log({
      taskId,
      step: ConversionStep.VALIDATION,
      message: 'Conversion started',
      metadata: {
        filename: summary.fileInfo?.filename,
        fileSize: fileInfo.size,
      },
      requestId: fileInfo.requestId,
    });

    logger.info('Conversion logging started', { taskId });
  }

  /**
   * Log a conversion step
   */
  async log(entry: Partial<ConversionLogEntry>): Promise<void> {
    const fullEntry: ConversionLogEntry = {
      taskId: entry.taskId || 'unknown',
      timestamp: entry.timestamp || new Date().toISOString(),
      step: entry.step || ConversionStep.CONVERSION,
      message: entry.message || '',
      progress: entry.progress,
      duration: entry.duration,
      error: entry.error,
      metadata: entry.metadata,
      requestId: entry.requestId,
    };

    // Add to summary
    const summary = this.logSummaries.get(fullEntry.taskId);
    if (summary) {
      summary.entries.push(fullEntry);

      // Limit entries in memory
      if (summary.entries.length > this.maxInMemoryEntries) {
        summary.entries.shift();
      }

      // Track warnings and errors
      if (fullEntry.error) {
        summary.errors.push(fullEntry.error);
      }

      // Update metrics
      if (fullEntry.step && fullEntry.duration) {
        const metricKey = `${fullEntry.step}Duration` as keyof typeof summary.metrics;
        summary.metrics![metricKey] = (summary.metrics![metricKey] || 0) + fullEntry.duration;
      }
    }

    // Write to file
    if (this.writeToFile) {
      await this.writeToFileLog(fullEntry);
    }
  }

  /**
   * Start a conversion step
   */
  startStep(taskId: string, step: ConversionStep): void {
    const timers = this.stepTimers.get(taskId);
    if (timers) {
      timers.set(step, Date.now());
    }
  }

  /**
   * End a conversion step and log it
   */
  async endStep(
    taskId: string,
    step: ConversionStep,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const timers = this.stepTimers.get(taskId);
    if (!timers) return;

    const startTime = timers.get(step);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    timers.delete(step);

    await this.log({
      taskId,
      step,
      message,
      duration,
      metadata,
    });
  }

  /**
   * Add warning
   */
  async addWarning(taskId: string, warning: string): Promise<void> {
    const summary = this.logSummaries.get(taskId);
    if (summary) {
      summary.warnings.push(warning);
    }

    logger.warn('Conversion warning', { taskId, warning });
  }

  /**
   * Add error
   */
  async addError(taskId: string, error: string): Promise<void> {
    const summary = this.logSummaries.get(taskId);
    if (summary) {
      summary.errors.push(error);
      summary.status = 'failed';
    }

    logger.error('Conversion error', { taskId, error });
  }

  /**
   * Complete conversion
   */
  async completeConversion(taskId: string, success: boolean): Promise<void> {
    const summary = this.logSummaries.get(taskId);
    if (!summary) return;

    summary.endTime = new Date().toISOString();
    summary.totalDuration = new Date(summary.endTime).getTime() - new Date(summary.startTime).getTime();
    summary.status = success ? 'completed' : 'failed';

    await this.log({
      taskId,
      step: ConversionStep.COMPLETION,
      message: success ? 'Conversion completed successfully' : 'Conversion failed',
      progress: 100,
    });

    // Write summary to file
    if (this.writeToFile) {
      await this.writeSummaryToFile(taskId, summary);
    }

    logger.info('Conversion logging completed', {
      taskId,
      status: summary.status,
      duration: summary.totalDuration,
    });
  }

  /**
   * Get conversion summary
   */
  getSummary(taskId: string): ConversionLogSummary | undefined {
    return this.logSummaries.get(taskId);
  }

  /**
   * Get all summaries
   */
  getAllSummaries(): ConversionLogSummary[] {
    return Array.from(this.logSummaries.values());
  }

  /**
   * Clear summary from memory
   */
  clearSummary(taskId: string): void {
    this.logSummaries.delete(taskId);
    this.stepTimers.delete(taskId);
  }

  /**
   * Write log entry to file
   */
  private async writeToFileLog(entry: ConversionLogEntry): Promise<void> {
    try {
      const logFilePath = path.join(this.logsDir, `${entry.taskId}.log`);
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(logFilePath, logLine, 'utf-8');
    } catch (error) {
      logger.error('Failed to write conversion log to file', {
        taskId: entry.taskId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Write summary to file
   */
  private async writeSummaryToFile(taskId: string, summary: ConversionLogSummary): Promise<void> {
    try {
      const summaryFilePath = path.join(this.logsDir, `${taskId}-summary.json`);
      await fs.writeFile(summaryFilePath, JSON.stringify(summary, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Failed to write conversion summary to file', {
        taskId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Global conversion logger instance
 */
let globalConversionLogger: ConversionLogger | null = null;

/**
 * Get global conversion logger instance
 */
export function getConversionLogger(): ConversionLogger {
  if (!globalConversionLogger) {
    globalConversionLogger = new ConversionLogger();
  }
  return globalConversionLogger;
}

/**
 * Initialize conversion logger
 */
export function initConversionLogger(options?: ConversionLoggerOptions): ConversionLogger {
  globalConversionLogger = new ConversionLogger(options);
  return globalConversionLogger;
}

export default {
  ConversionLogger,
  getConversionLogger,
  initConversionLogger,
  ConversionStep,
};
