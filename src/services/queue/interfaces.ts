/**
 * Task Queue Interface
 *
 * Abstract interface for task queue implementations.
 * Allows switching between different backends (memory, Redis, etc.)
 */

import {
  ITaskQueue,
  Task,
  TaskStatus,
  TaskOptions,
  TaskPriority,
  QueueStats,
  TaskEventType,
  TaskEvent,
  TaskEventListener,
  TaskHandler,
} from '../../types/queue';

/**
 * Abstract base class for task queues
 * Implements common functionality and defines the interface
 */
export abstract class BaseTaskQueue<TInput = unknown, TOutput = unknown>
  implements ITaskQueue<TInput, TOutput>
{
  protected tasks: Map<string, Task<TInput>> = new Map();
  protected eventListeners: Map<TaskEventType, Set<TaskEventListener<TInput>>> = new Map();
  protected isProcessing = false;
  protected isPaused = false;
  protected handler: TaskHandler<TInput, TOutput> | null = null;
  protected activeTasks = 0;
  protected peakConcurrency = 0;
  protected stats: QueueStats = {
    total: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    avgProcessingTime: 0,
    peakConcurrency: 0,
  };
  protected processingTimes: number[] = [];

  /**
   * Add a task to the queue
   */
  abstract add(data: TInput, options?: TaskOptions): Promise<string>;

  /**
   * Add multiple tasks to the queue
   */
  async addBatch(tasks: Array<{ data: TInput; options?: TaskOptions }>): Promise<string[]> {
    const taskIds = await Promise.all(tasks.map((task) => this.add(task.data, task.options)));
    return taskIds;
  }

  /**
   * Get task status
   */
  async getTask(taskId: string): Promise<Task<TInput> | null> {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get multiple task statuses
   */
  async getTasks(taskIds: string[]): Promise<Array<Task<TInput> | null>> {
    return Promise.all(taskIds.map((id) => this.getTask(id)));
  }

  /**
   * Cancel a task
   */
  async cancel(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.metadata.completedAt || task.metadata.startedAt) {
      return false;
    }

    task.status = TaskStatus.CANCELLED;
    task.metadata.completedAt = new Date();
    this.stats.cancelled++;
    this.stats.queued--;

    await this.emit({
      type: TaskEventType.CANCELLED,
      taskId,
      task,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Remove a task from the queue
   */
  async remove(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // Can only remove queued or cancelled tasks
    if (
      task.status !== TaskStatus.QUEUED &&
      task.status !== TaskStatus.CANCELLED &&
      task.status !== TaskStatus.FAILED &&
      task.status !== TaskStatus.COMPLETED
    ) {
      return false;
    }

    this.tasks.delete(taskId);
    return true;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    return { ...this.stats };
  }

  /**
   * Start processing tasks
   */
  async start(handler: TaskHandler<TInput, TOutput>): Promise<void> {
    if (this.isProcessing) {
      throw new Error('Queue is already processing');
    }

    this.handler = handler;
    this.isProcessing = true;
    this.isPaused = false;

    await this.processQueue();
  }

  /**
   * Stop processing tasks
   */
  async stop(): Promise<void> {
    this.isProcessing = false;
    this.isPaused = false;

    // Wait for active tasks to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();

    while (this.activeTasks > 0 && Date.now() - start < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Clear all tasks from the queue
   */
  async clear(): Promise<void> {
    this.tasks.clear();
    this.stats.queued = 0;
    this.stats.processing = 0;
  }

  /**
   * Pause task processing
   */
  async pause(): Promise<void> {
    this.isPaused = true;
  }

  /**
   * Resume task processing
   */
  async resume(): Promise<void> {
    if (!this.isProcessing) {
      throw new Error('Queue is not started');
    }

    this.isPaused = false;
    await this.processQueue();
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task<TInput>[]> {
    return Array.from(this.tasks.values()).filter((task) => task.status === status);
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, updates: Partial<Task<TInput>>): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Update task properties
    Object.assign(task, updates);

    // Update metadata timestamp
    (task.metadata as any).updatedAt = new Date();
  }

  /**
   * Add event listener
   */
  on(event: TaskEventType, listener: TaskEventListener<TInput>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: TaskEventType, listener: TaskEventListener<TInput>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Process the queue (to be implemented by subclasses)
   */
  protected abstract processQueue(): Promise<void>;

  /**
   * Update statistics
   */
  protected updateStats(
    status: TaskStatus.COMPLETED | TaskStatus.FAILED | TaskStatus.CANCELLED,
    duration?: number
  ): void {
    if (status === TaskStatus.COMPLETED) {
      this.stats.completed++;
    } else if (status === TaskStatus.FAILED) {
      this.stats.failed++;
    } else if (status === TaskStatus.CANCELLED) {
      this.stats.cancelled++;
    }

    if (duration) {
      this.processingTimes.push(duration);
      // Keep only last 100 processing times
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
      // Update average
      this.stats.avgProcessingTime =
        this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
    }

    // Update peak concurrency
    if (this.activeTasks > this.stats.peakConcurrency) {
      this.stats.peakConcurrency = this.activeTasks;
    }
  }

  /**
   * Emit event to listeners
   */
  protected async emit(event: TaskEvent<TInput>): Promise<void> {
    const listeners = this.eventListeners.get(event.type);
    if (!listeners) {
      return;
    }

    await Promise.all(
      Array.from(listeners).map((listener) =>
        Promise.resolve(listener(event)).catch((error) => {
          console.error(`Error in event listener for ${event.type}:`, error);
        })
      )
    );
  }

  /**
   * Process a single task
   */
  protected async processTask(task: Task<TInput>): Promise<void> {
    if (!this.handler) {
      throw new Error('No handler registered');
    }

    this.activeTasks++;
    this.stats.processing++;
    this.stats.queued--;

    task.status = TaskStatus.PROCESSING;
    task.metadata.startedAt = new Date();

    await this.emit({
      type: TaskEventType.STARTED,
      taskId: task.id,
      task,
      timestamp: new Date(),
    });

    const startTime = Date.now();

    try {
      const result = await this.handler(task.data, task.id);

      const completedAt = new Date();
      const duration = completedAt.getTime() - startTime;

      task.status = TaskStatus.COMPLETED;
      task.metadata.completedAt = completedAt;
      task.metadata.processingDuration = duration;
      task.result = {
        success: true,
        data: result as any,
        metadata: task.metadata,
      };

      this.updateStats(TaskStatus.COMPLETED, duration);

      await this.emit({
        type: TaskEventType.COMPLETED,
        taskId: task.id,
        task,
        timestamp: completedAt,
      });
    } catch (error) {
      const failedAt = new Date();
      const duration = failedAt.getTime() - startTime;

      task.status = TaskStatus.FAILED;
      task.metadata.failedAt = failedAt;
      task.metadata.processingDuration = duration;
      task.result = {
        success: false,
        error: error as Error,
        metadata: task.metadata,
      };

      this.updateStats(TaskStatus.FAILED, duration);

      await this.emit({
        type: TaskEventType.FAILED,
        taskId: task.id,
        task,
        timestamp: failedAt,
        error: error as Error,
      });
    } finally {
      this.activeTasks--;
      this.stats.processing--;
    }
  }
}

export default BaseTaskQueue;
