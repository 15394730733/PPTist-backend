/**
 * Memory Monitor and Graceful Degradation
 *
 * Monitors memory usage and implements graceful degradation strategies
 * when memory is low. Prevents out-of-memory crashes.
 *
 * @module utils/memory-monitor
 */

import { logger } from './logger.js';

/**
 * Memory pressure levels
 */
export enum MemoryPressureLevel {
  NORMAL = 'normal',
  LOW = 'low',
  CRITICAL = 'critical',
}

/**
 * Degradation strategy
 */
export interface DegradationStrategy {
  /**
   * Strategy name
   */
  name: string;

  /**
   * Strategy description
   */
  description: string;

  /**
   * Action to execute
   */
  action: () => void | Promise<void>;

  /**
   * Whether strategy has been applied
   */
  applied?: boolean;
}

/**
 * Memory monitor options
 */
export interface MemoryMonitorOptions {
  /**
   * Memory threshold for LOW level (percentage, 0-100)
   */
  lowThreshold?: number;

  /**
   * Memory threshold for CRITICAL level (percentage, 0-100)
   */
  criticalThreshold?: number;

  /**
   * Check interval in milliseconds
   */
  checkInterval?: number;

  /**
   * Whether to enable automatic degradation
   */
  enableAutoDegradation?: boolean;

  /**
   * Maximum concurrent conversions at normal memory
   */
  maxConcurrentNormal?: number;

  /**
   * Maximum concurrent conversions at low memory
   */
  maxConcurrentLow?: number;

  /**
   * Maximum concurrent conversions at critical memory
   */
  maxConcurrentCritical?: number;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  /**
   * Current memory pressure level
   */
  level: MemoryPressureLevel;

  /**
   * Heap used in bytes
   */
  heapUsed: number;

  /**
   * Heap total in bytes
   */
  heapTotal: number;

  /**
   * Heap usage percentage
   */
  heapUsagePercent: number;

  /**
   * RSS (resident set size) in bytes
   */
  rss: number;

  /**
   * External memory in bytes
   */
  external: number;

  /**
   * Array buffers in bytes
   */
  arrayBuffers: number;

  /**
   * Available heap size in bytes
   */
  heapAvailable: number;

  /**
   * Maximum concurrent conversions allowed
   */
  maxConcurrent: number;

  /**
   * Active degradation strategies
   */
  activeStrategies: string[];
}

/**
 * Memory monitor class
 */
export class MemoryMonitor {
  private lowThreshold: number;
  private criticalThreshold: number;
  private checkInterval: number;
  private enableAutoDegradation: boolean;
  private maxConcurrentNormal: number;
  private maxConcurrentLow: number;
  private maxConcurrentCritical: number;

  // Current memory pressure level
  private currentLevel: MemoryPressureLevel = MemoryPressureLevel.NORMAL;

  // Degradation strategies
  private strategies: DegradationStrategy[] = [];

  // Monitor interval ID
  private monitorInterval?: NodeJS.Timeout;

  // Memory statistics history
  private statsHistory: MemoryStats[] = [];
  private readonly maxHistorySize = 100;

  // Current concurrent conversions
  private currentConversions = 0;

  constructor(options: MemoryMonitorOptions = {}) {
    this.lowThreshold = options.lowThreshold || 70; // 70%
    this.criticalThreshold = options.criticalThreshold || 85; // 85%
    this.checkInterval = options.checkInterval || 5000; // 5 seconds
    this.enableAutoDegradation = options.enableAutoDegradation !== false; // Default true
    this.maxConcurrentNormal = options.maxConcurrentNormal || 5;
    this.maxConcurrentLow = options.maxConcurrentLow || 2;
    this.maxConcurrentCritical = options.maxConcurrentCritical || 1;

    // Register default degradation strategies
    this.registerDefaultStrategies();
  }

  /**
   * Start memory monitoring
   */
  start(): void {
    if (this.monitorInterval) {
      logger.warn('Memory monitor already running');
      return;
    }

    logger.info('Starting memory monitor', {
      lowThreshold: this.lowThreshold,
      criticalThreshold: this.criticalThreshold,
      checkInterval: this.checkInterval,
    });

    // Initial check
    this.checkMemory();

    // Start periodic checks
    this.monitorInterval = setInterval(() => {
      this.checkMemory();
    }, this.checkInterval);
  }

  /**
   * Stop memory monitoring
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
      logger.info('Memory monitor stopped');
    }
  }

  /**
   * Get current memory statistics
   */
  getStats(): MemoryStats {
    const mem = process.memoryUsage();

    const heapUsagePercent = (mem.heapUsed / mem.heapTotal) * 100;
    const level = this.determineLevel(heapUsagePercent);
    const maxConcurrent = this.getMaxConcurrent(level);
    const activeStrategies = this.strategies.filter((s) => s.applied).map((s) => s.name);

    return {
      level,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      heapUsagePercent: Math.round(heapUsagePercent * 100) / 100,
      rss: mem.rss,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      heapAvailable: mem.heapTotal - mem.heapUsed,
      maxConcurrent,
      activeStrategies,
    };
  }

  /**
   * Check if system can accept new conversion
   */
  canAcceptConversion(): { allowed: boolean; reason?: string } {
    const stats = this.getStats();

    // Check concurrent limit
    if (this.currentConversions >= stats.maxConcurrent) {
      return {
        allowed: false,
        reason: `Maximum concurrent conversions (${stats.maxConcurrent}) reached`,
      };
    }

    // Check memory pressure
    if (stats.level === MemoryPressureLevel.CRITICAL) {
      return {
        allowed: false,
        reason: `Memory pressure critical (${stats.heapUsagePercent.toFixed(1)}%)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Register conversion start
   */
  registerConversionStart(): void {
    this.currentConversions++;
    logger.debug('Conversion registered', {
      current: this.currentConversions,
      max: this.getStats().maxConcurrent,
    });
  }

  /**
   * Register conversion completion
   */
  registerConversionComplete(): void {
    if (this.currentConversions > 0) {
      this.currentConversions--;
      logger.debug('Conversion unregistered', {
        current: this.currentConversions,
        max: this.getStats().maxConcurrent,
      });
    }
  }

  /**
   * Check memory and apply degradation strategies
   */
  private checkMemory(): void {
    const stats = this.getStats();

    // Add to history
    this.statsHistory.push(stats);
    if (this.statsHistory.length > this.maxHistorySize) {
      this.statsHistory.shift();
    }

    // Check if level changed
    if (stats.level !== this.currentLevel) {
      const previousLevel = this.currentLevel;
      this.currentLevel = stats.level;

      logger.info('Memory pressure level changed', {
        previous: previousLevel,
        current: stats.level,
        heapUsage: `${stats.heapUsagePercent.toFixed(1)}%`,
      });

      // Apply degradation strategies if enabled
      if (this.enableAutoDegradation) {
        this.applyStrategies(stats.level);
      }
    }

    // Log warning if memory is high
    if (stats.level === MemoryPressureLevel.CRITICAL) {
      logger.warn('Critical memory pressure detected', {
        heapUsage: `${stats.heapUsagePercent.toFixed(1)}%`,
        heapUsed: `${(stats.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(stats.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(stats.rss / 1024 / 1024).toFixed(2)} MB`,
      });
    }
  }

  /**
   * Determine memory pressure level
   */
  private determineLevel(heapUsagePercent: number): MemoryPressureLevel {
    if (heapUsagePercent >= this.criticalThreshold) {
      return MemoryPressureLevel.CRITICAL;
    } else if (heapUsagePercent >= this.lowThreshold) {
      return MemoryPressureLevel.LOW;
    } else {
      return MemoryPressureLevel.NORMAL;
    }
  }

  /**
   * Get maximum concurrent conversions for memory level
   */
  private getMaxConcurrent(level: MemoryPressureLevel): number {
    switch (level) {
      case MemoryPressureLevel.CRITICAL:
        return this.maxConcurrentCritical;
      case MemoryPressureLevel.LOW:
        return this.maxConcurrentLow;
      case MemoryPressureLevel.NORMAL:
      default:
        return this.maxConcurrentNormal;
    }
  }

  /**
   * Register default degradation strategies
   */
  private registerDefaultStrategies(): void {
    // Strategy 1: Force garbage collection
    this.strategies.push({
      name: 'force_gc',
      description: 'Force garbage collection',
      action: () => {
        if (global.gc) {
          logger.info('Forcing garbage collection');
          global.gc();
        } else {
          logger.warn('Garbage collection not exposed (start with --expose-gc)');
        }
      },
    });

    // Strategy 2: Reduce cache size
    this.strategies.push({
      name: 'reduce_cache',
      description: 'Reduce internal cache sizes',
      action: () => {
        logger.info('Reducing cache sizes');
        // Cache reduction would be implemented by cache manager
      },
    });

    // Strategy 3: Disable non-essential features
    this.strategies.push({
      name: 'disable_features',
      description: 'Disable non-essential features',
      action: () => {
        logger.info('Disabling non-essential features');
        // Features would be disabled here
      },
    });

    // Strategy 4: Clear buffers
    this.strategies.push({
      name: 'clear_buffers',
      description: 'Clear unused buffers',
      action: () => {
        logger.info('Clearing unused buffers');
        // Buffer clearing would be implemented here
      },
    });
  }

  /**
   * Apply degradation strategies for memory level
   */
  private applyStrategies(level: MemoryPressureLevel): void {
    if (level === MemoryPressureLevel.NORMAL) {
      // Reset all strategies
      logger.info('Resetting degradation strategies');
      this.strategies.forEach((s) => (s.applied = false));
      return;
    }

    // Apply strategies based on level
    const strategiesToApply = level === MemoryPressureLevel.CRITICAL
      ? this.strategies // Apply all
      : this.strategies.slice(0, 2); // Apply first 2 for LOW

    for (const strategy of strategiesToApply) {
      if (!strategy.applied) {
        logger.info(`Applying degradation strategy: ${strategy.name}`, {
          description: strategy.description,
        });

        try {
          strategy.action();
          strategy.applied = true;
        } catch (error) {
          logger.error(`Failed to apply strategy: ${strategy.name}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  /**
   * Get statistics history
   */
  getStatsHistory(): MemoryStats[] {
    return [...this.statsHistory];
  }

  /**
   * Get current memory pressure level
   */
  getLevel(): MemoryPressureLevel {
    return this.currentLevel;
  }
}

/**
 * Global memory monitor instance
 */
let globalMemoryMonitor: MemoryMonitor | null = null;

/**
 * Get global memory monitor instance
 */
export function getMemoryMonitor(): MemoryMonitor {
  if (!globalMemoryMonitor) {
    globalMemoryMonitor = new MemoryMonitor();
  }
  return globalMemoryMonitor;
}

/**
 * Initialize memory monitor
 */
export function initMemoryMonitor(options?: MemoryMonitorOptions): MemoryMonitor {
  if (!globalMemoryMonitor) {
    globalMemoryMonitor = new MemoryMonitor(options);
    globalMemoryMonitor.start();
  }
  return globalMemoryMonitor;
}

/**
 * Get memory usage as formatted string
 */
export function formatMemoryStats(stats: MemoryStats): string {
  return `Memory: ${stats.heapUsagePercent.toFixed(1)}% ` +
         `(${(stats.heapUsed / 1024 / 1024).toFixed(2)} MB / ` +
         `${(stats.heapTotal / 1024 / 1024).toFixed(2)} MB), ` +
         `RSS: ${(stats.rss / 1024 / 1024).toFixed(2)} MB, ` +
         `Level: ${stats.level}`;
}

export default {
  MemoryMonitor,
  getMemoryMonitor,
  initMemoryMonitor,
  formatMemoryStats,
  MemoryPressureLevel,
};
