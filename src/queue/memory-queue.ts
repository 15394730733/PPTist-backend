/**
 * In-Memory Task Queue Implementation
 *
 * Simple in-memory task queue using fastq for concurrent processing.
 * Implements the ITaskQueue interface for pluggable queue backends.
 *
 * @module queue/memory-queue
 */

import fastq from 'fastq';
import type {
  Task,
  ITaskQueue,
  TaskStatus,
  TaskOptions,
  QueueStats,
  TaskHandler,
  TaskMetadata,
  TaskPriority,
  TaskResult,
} from '../types/queue';
import { TaskStatus as EnumTaskStatus, TaskPriority as EnumTaskPriority } from '../types/queue';
import { logger } from '../utils/logger';

/**
 * Memory queue options
 */
export interface MemoryQueueOptions {
  /**
   * Number of concurrent tasks (default: 3)
   */
  concurrency?: number;

  /**
   * Task result retention time in milliseconds (default: 24 hours)
   */
  retentionMs?: number;
}

/**
 * Internal task representation
 */
interface InternalTask<T = any> {
  id: string;
  data: T;
  status: TaskStatus;
  progress?: number;
  result?: TaskResult<T>;
  error?: string;
  warnings?: string[];
  metadata: TaskMetadata;
  options?: TaskOptions;
}

/**
 * In-memory task queue implementation
 */
export class MemoryTaskQueue<TInput = any, TOutput = any>
  implements ITaskQueue<TInput, TOutput>
{
  private queue: any;
  private tasks: Map<string, InternalTask<TInput>> = new Map();
  private handler: TaskHandler<TInput, TOutput> | null = null;
  private concurrency: number;
  private retentionMs: number;
  private stats: QueueStats = {
    total: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    avgProcessingTime: 0,
    peakConcurrency: 0,
  };
  private processingTimes: number[] = [];

  constructor(options: MemoryQueueOptions = {}) {
    this.concurrency = options.concurrency || 3;
    this.retentionMs = options.retentionMs || 24 * 60 * 60 * 1000; // 24 hours

    // Create fastq instance for concurrent processing
    this.queue = fastq(this, this.processTask.bind(this), this.concurrency);

    // Start cleanup interval
    this.startCleanupInterval();

    logger.info('Memory queue created', {
      concurrency: this.concurrency,
      retentionMs: this.retentionMs,
    });
  }

  /**
   * Add a task to the queue
   */
  async add(data: TInput, options?: TaskOptions): Promise<string> {
    const taskId = this.generateTaskId();
    const now = new Date();

    const task: InternalTask<TInput> = {
      id: taskId,
      data,
      status: EnumTaskStatus.QUEUED,
      progress: 0,
      metadata: {
        createdAt: now,
        retryCount: 0,
        priority: options?.priority ?? EnumTaskPriority.NORMAL,
      },
      options,
    };

    this.tasks.set(taskId, task);
    this.stats.total++;
    this.stats.queued++;

    logger.debug('Task added to queue', {
      taskId,
      priority: task.metadata.priority,
    });

    // Push to processing queue
    this.queue.push(task, (error: Error | null) => {
      if (error) {
        logger.error('Task processing failed', {
          taskId,
          error: error.message,
        });
      }
    });

    return taskId;
  }

  /**
   * Add multiple tasks to the queue
   */
  async addBatch(
    tasks: Array<{ data: TInput; options?: TaskOptions }>
  ): Promise<string[]> {
    const taskIds: string[] = [];

    for (const task of tasks) {
      const taskId = await this.add(task.data, task.options);
      taskIds.push(taskId);
    }

    logger.info('Batch tasks added', {
      count: taskIds.length,
    });

    return taskIds;
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<Task<TInput> | null> {
    const task = this.tasks.get(taskId);

    if (!task) {
      return null;
    }

    return this.convertToTask(task);
  }

  /**
   * Get multiple tasks
   */
  async getTasks(taskIds: string[]): Promise<Array<Task<TInput> | null>> {
    const tasks: Array<Task<TInput> | null> = [];

    for (const taskId of taskIds) {
      const task = await this.getTask(taskId);
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Cancel a task
   */
  async cancel(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);

    if (!task) {
      return false;
    }

    if (task.status === EnumTaskStatus.COMPLETED || task.status === EnumTaskStatus.FAILED) {
      return false;
    }

    // Remove from queue (if queued) or update status (if processing)
    this.tasks.delete(taskId);
    this.stats.cancelled++;

    logger.info('Task cancelled', { taskId });

    return true;
  }

  /**
   * Remove a task from the queue
   */
  async remove(taskId: string): Promise<boolean> {
    const existed = this.tasks.has(taskId);
    this.tasks.delete(taskId);

    if (existed) {
      logger.debug('Task removed', { taskId });
    }

    return existed;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    // Update current counts
    const allTasks = Array.from(this.tasks.values());

    this.stats.queued = allTasks.filter(
      (t) => t.status === EnumTaskStatus.QUEUED
    ).length;
    this.stats.processing = allTasks.filter(
      (t) => t.status === EnumTaskStatus.PROCESSING
    ).length;
    this.stats.completed = allTasks.filter(
      (t) => t.status === EnumTaskStatus.COMPLETED
    ).length;
    this.stats.failed = allTasks.filter(
      (t) => t.status === EnumTaskStatus.FAILED
    ).length;

    // Calculate average processing time
    if (this.processingTimes.length > 0) {
      const sum = this.processingTimes.reduce((a, b) => a + b, 0);
      this.stats.avgProcessingTime = Math.round(
        sum / this.processingTimes.length
      );
    }

    return { ...this.stats };
  }

  /**
   * Start processing tasks
   */
  async start(handler: TaskHandler<TInput, TOutput>): Promise<void> {
    this.handler = handler;
    logger.info('Queue processing started');
  }

  /**
   * Stop processing tasks
   */
  async stop(): Promise<void> {
    this.queue.kill();
    logger.info('Queue processing stopped');
  }

  /**
   * Clear all tasks
   */
  async clear(): Promise<void> {
    this.tasks.clear();
    this.queue.killAndDrain();

    // Reset stats
    this.stats = {
      total: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      avgProcessingTime: 0,
      peakConcurrency: 0,
    };
    this.processingTimes = [];

    // Recreate queue for future use
    this.queue = fastq(this, this.processTask.bind(this), this.concurrency);

    logger.info('All tasks cleared');
  }

  /**
   * Pause task processing
   */
  async pause(): Promise<void> {
    this.queue.pause();
    logger.info('Queue paused');
  }

  /**
   * Resume task processing
   */
  async resume(): Promise<void> {
    this.queue.resume();
    logger.info('Queue resumed');
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task<TInput>[]> {
    const allTasks = Array.from(this.tasks.values());
    const filtered = allTasks.filter((t) => t.status === status);

    return filtered.map((t) => this.convertToTask(t));
  }

  /**
   * Update task
   */
  async updateTask(
    taskId: string,
    updates: Partial<Task<TInput>>
  ): Promise<void> {
    const task = this.tasks.get(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Merge updates
    const updatedTask = {
      ...task,
      ...updates,
      metadata: {
        ...task.metadata,
        ...updates.metadata,
      },
    };

    this.tasks.set(taskId, updatedTask);

    logger.debug('Task updated', {
      taskId,
      updates: Object.keys(updates),
    });
  }

  /**
   * Process task (called by fastq)
   */
  private async processTask(
    internalTask: InternalTask<TInput>,
    callback: (error: Error | null) => void
  ): Promise<void> {
    const { id: taskId } = internalTask;

    logger.debug('Processing task', { taskId });

    // Check if handler is registered
    if (!this.handler) {
      logger.debug('No handler registered, skipping task processing', { taskId });
      callback(null);
      return;
    }

    const startTime = Date.now();

    try {
      // Update task status to processing
      const currentTask = this.tasks.get(taskId);
      await this.updateTask(taskId, {
        status: EnumTaskStatus.PROCESSING,
        metadata: {
          ...currentTask!.metadata,
          startedAt: new Date(),
        },
      });

      this.stats.queued--;
      this.stats.processing++;

      // Call handler
      const result = await this.handler(internalTask.data, taskId);

      // Update task as completed
      const updatedTask = this.tasks.get(taskId);
      await this.updateTask(taskId, {
        status: EnumTaskStatus.COMPLETED,
        progress: 100,
        result: {
          success: true,
          data: result as any,
          metadata: internalTask.metadata,
        },
        metadata: {
          ...updatedTask!.metadata,
          completedAt: new Date(),
          processingDuration: Date.now() - startTime,
        },
      });

      this.stats.processing--;
      this.stats.completed++;

      // Track processing time
      const duration = Date.now() - startTime;
      this.processingTimes.push(duration);

      logger.info('Task completed', {
        taskId,
        duration,
      });

      callback(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update task as failed
      const currentTask = this.tasks.get(taskId);
      await this.updateTask(taskId, {
        status: EnumTaskStatus.FAILED,
        error: errorMessage,
        metadata: {
          ...currentTask!.metadata,
          failedAt: new Date(),
          processingDuration: Date.now() - startTime,
        },
      });

      this.stats.processing--;
      this.stats.failed++;

      logger.error('Task failed', {
        taskId,
        error: errorMessage,
      });

      callback(error instanceof Error ? error : new Error(errorMessage));
    }
  }

  /**
   * Convert internal task to Task interface
   */
  private convertToTask(internalTask: InternalTask<TInput>): Task<TInput> {
    return {
      id: internalTask.id,
      status: internalTask.status as TaskStatus,
      progress: internalTask.progress,
      data: internalTask.data,
      result: internalTask.result,
      error: internalTask.error,
      warnings: internalTask.warnings,
      metadata: internalTask.metadata,
    };
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start cleanup interval to remove old tasks
   */
  private startCleanupInterval(): void {
    const intervalMs = 60 * 60 * 1000; // 1 hour

    const intervalId = setInterval(() => {
      this.cleanupOldTasks();
    }, intervalMs);

    // Clear interval on process exit
    process.on('beforeExit', () => clearInterval(intervalId));
    process.on('SIGINT', () => clearInterval(intervalId));
    process.on('SIGTERM', () => clearInterval(intervalId));
  }

  /**
   * Clean up old completed/failed tasks
   */
  private cleanupOldTasks(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      const completedAt = task.metadata.completedAt;
      const failedAt = task.metadata.failedAt;

      const endTime = completedAt || failedAt;

      if (endTime && now - endTime.getTime() > this.retentionMs) {
        this.tasks.delete(taskId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up old tasks', { count: cleaned });
    }
  }

  /**
   * Get queue length (for debugging)
   */
  getQueueLength(): number {
    return this.queue.length();
  }
}
