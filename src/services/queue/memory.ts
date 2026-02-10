/**
 * In-Memory Task Queue Implementation
 *
 * Uses fastq for efficient in-memory task queuing with concurrency control.
 * Suitable for single-server deployments and development.
 */

import fastq, { queue, type worker } from 'fastq';
import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  TaskStatus,
  TaskOptions,
  TaskPriority,
  QueueStats,
  TaskEventType,
  TaskEvent,
  TaskHandler,
} from '../../types/queue';
import { BaseTaskQueue } from './interfaces.js';
import logger from '../../utils/logger';

interface QueuedTask<TInput> {
  id: string;
  data: TInput;
  options: TaskOptions;
  priority: TaskPriority;
  addedAt: Date;
}

/**
 * In-memory task queue implementation
 */
export class InMemoryQueue<TInput = unknown, TOutput = unknown> extends BaseTaskQueue<
  TInput,
  TOutput
> {
  private fastQueue: queue<QueuedTask<TInput>, void> | null = null;
  private concurrency: number;
  private timeoutMs: number;

  constructor(concurrency: number = 3, timeoutMs: number = 300000) {
    super();
    this.concurrency = concurrency;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Add a task to the queue
   */
  async add(data: TInput, options?: TaskOptions): Promise<string> {
    const taskId = uuidv4();
    const taskOptions = options || {};
    const priority = taskOptions.priority ?? TaskPriority.NORMAL;

    // Create task object
    const task: Task<TInput> = {
      id: taskId,
      status: TaskStatus.QUEUED,
      data,
      metadata: {
        createdAt: new Date(),
        retryCount: 0,
        priority,
      },
    };

    // Store task
    this.tasks.set(taskId, task);

    // Update stats
    this.stats.total++;
    this.stats.queued++;

    // Add to fast queue
    if (this.fastQueue) {
      this.fastQueue.push(
        {
          id: taskId,
          data,
          options: taskOptions,
          priority,
          addedAt: new Date(),
        },
        (error) => {
          if (error) {
            logger.error({ taskId, error }, 'Task processing error');
          }
        }
      );
    }

    // Emit event
    await this.emit({
      type: TaskEventType.ADDED,
      taskId,
      task,
      timestamp: new Date(),
    });

    logger.debug({ taskId, priority }, 'Task added to queue');

    return taskId;
  }

  /**
   * Start processing tasks
   */
  async start(handler: TaskHandler<TInput, TOutput>): Promise<void> {
    await super.start(handler);

    // Create fast queue with worker
    this.fastQueue = fastq(this, this.worker.bind(this) as any, this.concurrency);

    logger.info({ concurrency: this.concurrency }, 'In-memory queue started');
  }

  /**
   * Stop processing tasks
   */
  async stop(): Promise<void> {
    if (this.fastQueue) {
      this.fastQueue.kill();
      this.fastQueue = null;
    }

    await super.stop();

    logger.info('In-memory queue stopped');
  }

  /**
   * Pause task processing
   */
  async pause(): Promise<void> {
    await super.pause();

    if (this.fastQueue) {
      this.fastQueue.pause();
    }

    logger.info('In-memory queue paused');
  }

  /**
   * Resume task processing
   */
  async resume(): Promise<void> {
    await super.resume();

    if (this.fastQueue) {
      this.fastQueue.resume();
    }

    logger.info('In-memory queue resumed');
  }

  /**
   * Clear all tasks from the queue
   */
  async clear(): Promise<void> {
    if (this.fastQueue) {
      this.fastQueue.kill();
      this.fastQueue = fastq(this, this.worker.bind(this) as any, this.concurrency);
    }

    await super.clear();

    logger.info('In-memory queue cleared');
  }

  /**
   * Process queue (not used for fastq, it auto-processes)
   */
  protected async processQueue(): Promise<void> {
    // fastq handles processing automatically
    // This is a no-op for compatibility with base class
  }

  /**
   * Worker function for fastq
   */
  private async worker(
    this: InMemoryQueue<TInput, TOutput>,
    queuedTask: QueuedTask<TInput>,
    callback: (error?: Error | null) => void
  ): Promise<void> {
    const { id, options } = queuedTask;

    // Check if paused
    while (this.isPaused && this.isProcessing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Check if still processing
    if (!this.isProcessing) {
      callback(null);
      return;
    }

    // Get task
    const task = this.tasks.get(id);
    if (!task) {
      callback(new Error(`Task ${id} not found`));
      return;
    }

    // Check if cancelled
    if (task.status === TaskStatus.CANCELLED) {
      callback(null);
      return;
    }

    try {
      // Process with timeout
      await Promise.race([
        this.processTask(task),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Task timeout')), options.timeout || this.timeoutMs)
        ),
      ]);

      callback(null);
    } catch (error) {
      // Check if should retry
      const maxRetries = options.maxRetries || 3;
      const retryDelay = options.retryDelay || 1000;

      if (task.metadata.retryCount < maxRetries) {
        task.metadata.retryCount++;
        task.status = TaskStatus.QUEUED;

        logger.warn(
          {
            taskId: id,
            attempt: task.metadata.retryCount,
            maxRetries,
            error: (error as Error).message,
          },
          'Task retrying'
        );

        // Emit retry event
        await this.emit({
          type: TaskEventType.RETRY,
          taskId: id,
          task,
          timestamp: new Date(),
        });

        // Re-add to queue after delay
        setTimeout(() => {
          if (this.fastQueue) {
            this.fastQueue.push(queuedTask, callback);
          }
        }, retryDelay);
      } else {
        // Max retries exceeded, mark as timeout
        task.status = TaskStatus.TIMEOUT;

        await this.emit({
          type: TaskEventType.TIMEOUT,
          taskId: id,
          task,
          timestamp: new Date(),
          error: error as Error,
        });

        callback(error as Error);
      }
    }
  }

  /**
   * Get additional statistics specific to fastq
   */
  async getDetailedStats(): Promise<
    QueueStats & {
      queueLength: number;
      workerConcurrency: number;
      paused: boolean;
    }
  > {
    const baseStats = await this.getStats();

    return {
      ...baseStats,
      queueLength: this.fastQueue ? this.fastQueue.length() : 0,
      workerConcurrency: this.concurrency,
      paused: this.isPaused,
    };
  }
}

/**
 * Factory function to create in-memory queue
 */
export function createInMemoryQueue<TInput = unknown, TOutput = unknown>(
  concurrency?: number,
  timeoutMs?: number
): InMemoryQueue<TInput, TOutput> {
  return new InMemoryQueue<TInput, TOutput>(concurrency, timeoutMs);
}

export default InMemoryQueue;
