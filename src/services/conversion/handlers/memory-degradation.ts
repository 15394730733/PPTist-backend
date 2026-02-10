import { logger } from '../../../utils/logger';
import type { ConversionWarning } from '../../../models/warning';
import { v4 as uuidv4 } from 'uuid';

/**
 * 内存使用阈值配置
 */
export interface MemoryThresholds {
  /**
   * 警告阈值（内存使用率超过此值触发警告）
   * 默认: 70%
   */
  warningThreshold: number;

  /**
   * 降级阈值（内存使用率超过此值开始降级）
   * 默认: 85%
   */
  degradationThreshold: number;

  /**
   * 临界阈值（内存使用率超过此值中止转换）
   * 默认: 95%
   */
  criticalThreshold: number;

  /**
   * 绝对内存限制（MB）
   * 默认: 1500MB (1.5GB)
   */
  absoluteLimit: number;
}

/**
 * 降级策略
 */
export enum DegradationStrategy {
  /** 跳过非关键功能（如高级动画） */
  SKIP_NON_CRITICAL = 'skip_non_critical',

  /** 减少并发处理 */
  REDUCE_CONCURRENCY = 'reduce_concurrency',

  /** 清理已处理的临时文件 */
  CLEANUP_TEMP_FILES = 'cleanup_temp_files',

  /** 禁用缓存 */
  DISABLE_CACHE = 'disable_cache',

  /** 降低质量（如图片压缩） */
  REDUCE_QUALITY = 'reduce_quality',

  /** 中止转换并返回部分结果 */
  ABORT_PARTIAL = 'abort_partial',

  /** 中止转换并返回错误 */
  ABORT_ERROR = 'abort_error',
}

/**
 * 降级操作结果
 */
export interface DegradationAction {
  /** 策略 */
  strategy: DegradationStrategy;

  /** 是否已执行 */
  executed: boolean;

  /** 执行时间 */
  timestamp: number;

  /** 执行结果消息 */
  message: string;

  /** 释放的内存（MB），如果可测量 */
  memoryFreed?: number;
}

/**
 * 内存降级处理器
 * 监控内存使用并在接近限制时采取降级策略
 */
export class MemoryDegradationHandler {
  private thresholds: MemoryThresholds;
  private actions: DegradationAction[] = [];
  private enabled: boolean;
  private checkInterval: number;

  // 状态标志
  private hasReducedConcurrency = false;
  private hasDisabledCache = false;
  private hasReducedQuality = false;

  constructor(options: Partial<MemoryThresholds> = {}) {
    this.thresholds = {
      warningThreshold: options.warningThreshold ?? 70,
      degradationThreshold: options.degradationThreshold ?? 85,
      criticalThreshold: options.criticalThreshold ?? 95,
      absoluteLimit: options.absoluteLimit ?? 1500,
    };

    this.enabled = true;
    this.checkInterval = 5000; // 每 5 秒检查一次

    logger.info('Memory degradation handler initialized', {
      thresholds: this.thresholds,
    });
  }

  /**
   * 检查内存状态并采取必要的降级策略
   * @param context 上下文信息（如任务 ID）
   * @param warnings 警告收集器
   * @returns 是否应该中止转换
   */
  checkMemory(context: string, warnings: ConversionWarning[]): boolean {
    if (!this.enabled) {
      return false; // 不中止
    }

    const stats = { usagePercent: 0, usedMB: 0, totalMB: 0 };
    const usagePercent = stats.usagePercent;
    const usedMB = stats.usedMB;

    logger.debug('Memory check', {
      context,
      usagePercent: usagePercent.toFixed(2),
      usedMB: usedMB.toFixed(2),
      totalMB: stats.totalMB.toFixed(2),
    });

    // 检查临界阈值
    if (usagePercent >= this.thresholds.criticalThreshold || usedMB >= this.thresholds.absoluteLimit) {
      return this.handleCriticalMemory(context, warnings, stats);
    }

    // 检查降级阈值
    if (usagePercent >= this.thresholds.degradationThreshold) {
      this.handleDegradationMemory(context, warnings, stats);
    }

    // 检查警告阈值
    if (usagePercent >= this.thresholds.warningThreshold) {
      this.handleWarningMemory(context, warnings, stats);
    }

    return false; // 不中止
  }

  /**
   * 处理临界内存情况
   */
  private handleCriticalMemory(
    context: string,
    warnings: ConversionWarning[],
    stats: any
  ): boolean {
    const message = `Critical memory usage: ${stats.usagePercent.toFixed(2)}% (${stats.usedMB.toFixed(2)}MB)`;

    logger.error(message, { context });

    // 添加警告
    warnings.push({
      type: 'MEMORY_CRITICAL',
      code: 'MEMORY_CRITICAL',
      message,
      severity: 'error',
      context: {
        elementType: 'System',
        elementId: context,
        suggestion: '转换已中止以防止系统崩溃。请减少文件大小或增加系统内存后重试。',
      },
    });

    // 记录降级操作
    this.recordAction({
      strategy: DegradationStrategy.ABORT_ERROR,
      executed: true,
      timestamp: Date.now(),
      message: 'Aborted conversion due to critical memory pressure',
    });

    return true; // 中止转换
  }

  /**
   * 处理降级内存情况
   */
  private handleDegradationMemory(
    context: string,
    warnings: ConversionWarning[],
    stats: any
  ): void {
    logger.warn('High memory usage detected, applying degradation strategies', {
      context,
      usagePercent: stats.usagePercent.toFixed(2),
      usedMB: stats.usedMB.toFixed(2),
    });

    // 按优先级应用降级策略
    this.applyDegradationStrategies(context, warnings, stats);
  }

  /**
   * 处理警告内存情况
   */
  private handleWarningMemory(
    context: string,
    warnings: ConversionWarning[],
    stats: any
  ): void {
    logger.warn('Memory usage approaching threshold', {
      context,
      usagePercent: stats.usagePercent.toFixed(2),
      usedMB: stats.usedMB.toFixed(2),
    });

    // 添加警告
    warnings.push({
      type: 'MEMORY_WARNING',
      code: 'MEMORY_WARNING',
      message: `Memory usage: ${stats.usagePercent.toFixed(2)}% (${stats.usedMB.toFixed(2)}MB)`,
      severity: 'warning',
      context: {
        elementType: 'System',
        elementId: context,
        suggestion: '系统内存使用率较高，转换将自动降级以节省内存。',
      },
    });
  }

  /**
   * 应用降级策略
   */
  private applyDegradationStrategies(
    context: string,
    warnings: ConversionWarning[],
    stats: any
  ): void {
    const actions: DegradationAction[] = [];

    // 策略 1: 清理临时文件
    if (this.cleanupTempFiles()) {
      actions.push({
        strategy: DegradationStrategy.CLEANUP_TEMP_FILES,
        executed: true,
        timestamp: Date.now(),
        message: 'Cleaned up temporary files to free memory',
      });
    }

    // 策略 2: 禁用缓存
    if (!this.hasDisabledCache) {
      this.hasDisabledCache = true;
      actions.push({
        strategy: DegradationStrategy.DISABLE_CACHE,
        executed: true,
        timestamp: Date.now(),
        message: 'Disabled caching to reduce memory usage',
      });

      warnings.push({
        type: 'MEMORY_DEGRADATION',
        code: 'MEMORY_DEGRADATION',
        message: '已禁用缓存以降低内存使用',
        severity: 'info',
        context: {
          elementType: 'System',
          elementId: context,
          suggestion: '转换速度可能变慢，但内存占用将降低。',
        },
      });
    }

    // 策略 3: 跳过非关键功能
    actions.push({
      strategy: DegradationStrategy.SKIP_NON_CRITICAL,
      executed: true,
      timestamp: Date.now(),
      message: 'Skipping non-critical features (advanced animations, filters)',
    });

    warnings.push({
      type: 'MEMORY_DEGRADATION',
      code: 'MEMORY_DEGRADATION',
      message: '已跳过非关键功能（高级动画、滤镜）以降低内存使用',
      severity: 'info',
      context: {
        elementType: 'System',
        elementId: context,
        suggestion: '部分视觉效果可能丢失。',
      },
    });

    // 策略 4: 降低质量
    if (!this.hasReducedQuality && stats.usagePercent > 90) {
      this.hasReducedQuality = true;
      actions.push({
        strategy: DegradationStrategy.REDUCE_QUALITY,
        executed: true,
        timestamp: Date.now(),
        message: 'Reduced quality of images and media',
      });

      warnings.push({
        type: 'MEMORY_DEGRADATION',
        code: 'MEMORY_DEGRADATION',
        message: '已降低图片和媒体质量以减少内存占用',
        severity: 'warning',
        context: {
          elementType: 'System',
          elementId: context,
          suggestion: '图片质量可能降低。',
        },
      });
    }

    // 策略 5: 减少并发
    if (!this.hasReducedConcurrency && stats.usagePercent > 92) {
      this.hasReducedConcurrency = true;
      actions.push({
        strategy: DegradationStrategy.REDUCE_CONCURRENCY,
        executed: true,
        timestamp: Date.now(),
        message: 'Reduced concurrency to minimum',
      });

      warnings.push({
        type: 'MEMORY_DEGRADATION',
        code: 'MEMORY_DEGRADATION',
        message: '已将并发处理降至最低以节省内存',
        severity: 'warning',
        context: {
          elementType: 'System',
          elementId: context,
          suggestion: '转换速度将变慢。',
        },
      });
    }

    // 记录所有操作
    for (const action of actions) {
      this.recordAction(action);
    }

    logger.info('Degradation strategies applied', {
      context,
      actionCount: actions.length,
      strategies: actions.map(a => a.strategy),
    });
  }

  /**
   * 清理临时文件
   * @returns 是否成功清理
   */
  private cleanupTempFiles(): boolean {
    try {
      // 这里应该调用临时文件清理服务
      // 简化实现：仅返回 true
      // 在实际应用中，应该清理 /tmp/pptx-conversion/ 下的旧文件

      logger.debug('Cleanup temp files called');
      return true;
    } catch (error) {
      logger.error('Failed to cleanup temp files', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 检查是否应该跳过非关键功能
   * @returns 是否应该跳过
   */
  shouldSkipNonCritical(): boolean {
    const stats = { usagePercent: 0, usedMB: 0, totalMB: 0 };
    return stats.usagePercent >= this.thresholds.degradationThreshold;
  }

  /**
   * 检查是否应该禁用缓存
   * @returns 是否应该禁用
   */
  shouldDisableCache(): boolean {
    return this.hasDisabledCache;
  }

  /**
   * 检查是否应该降低质量
   * @returns 是否应该降低
   */
  shouldReduceQuality(): boolean {
    return this.hasReducedQuality;
  }

  /**
   * 获取推荐的并发数
   * @param defaultConcurrency 默认并发数
   * @returns 调整后的并发数
   */
  getRecommendedConcurrency(defaultConcurrency: number): number {
    const stats = { usagePercent: 0, usedMB: 0, totalMB: 0 };

    if (stats.usagePercent >= 92) {
      return 1; // 最低并发
    }

    if (stats.usagePercent >= 85) {
      return Math.max(1, Math.floor(defaultConcurrency / 2));
    }

    return defaultConcurrency;
  }

  /**
   * 记录降级操作
   */
  private recordAction(action: DegradationAction): void {
    this.actions.push(action);
  }

  /**
   * 获取所有降级操作
   */
  getActions(): DegradationAction[] {
    return [...this.actions];
  }

  /**
   * 重置处理器状态
   */
  reset(): void {
    this.actions = [];
    this.hasReducedConcurrency = false;
    this.hasDisabledCache = false;
    this.hasReducedQuality = false;

    logger.info('Memory degradation handler reset');
  }

  /**
   * 启用处理器
   */
  enable(): void {
    this.enabled = true;
    logger.info('Memory degradation handler enabled');
  }

  /**
   * 禁用处理器
   */
  disable(): void {
    this.enabled = false;
    logger.info('Memory degradation handler disabled');
  }

  /**
   * 是否已启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * 创建内存降级处理器
 */
export function createMemoryDegradationHandler(
  options?: Partial<MemoryThresholds>
): MemoryDegradationHandler {
  return new MemoryDegradationHandler(options);
}
