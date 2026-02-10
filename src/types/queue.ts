/**
 * Task Queue Interface
 *
 * Defines the contract for task queue implementations.
 * This abstraction allows switching between different queue backends
 * (memory, Redis, etc.) without changing the application code.
 */

/**
 * Task status enum
 */
export enum TaskStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

/**
 * Task priority enum
 */
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

/**
 * Task metadata
 */
export interface TaskMetadata {
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  processingDuration?: number; // milliseconds
  retryCount: number;
  priority: TaskPriority;
}

/**
 * Task result
 */
export interface TaskResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  metadata: TaskMetadata;
}

/**
 * Task interface
 */
export interface Task<T = unknown> {
  id: string;
  status: TaskStatus;
  progress?: number; // 0-100
  data: T;
  result?: TaskResult<T>;
  error?: string;
  warnings?: string[];
  metadata: TaskMetadata;
}

/**
 * Task handler function type
 */
export type TaskHandler<TInput = unknown, TOutput = unknown> = (
  taskData: TInput,
  taskId: string
) => Promise<TOutput>;

/**
 * Task queue interface
 */
export interface ITaskQueue<TInput = unknown, TOutput = unknown> {
  /**
   * Add a task to the queue
   * @param data - Task data
   * @param options - Task options (priority, delay, etc.)
   * @returns Task ID
   */
  add(data: TInput, options?: TaskOptions): Promise<string>;

  /**
   * Add multiple tasks to the queue
   * @param tasks - Array of task data and options
   * @returns Array of task IDs
   */
  addBatch(tasks: Array<{ data: TInput; options?: TaskOptions }>): Promise<string[]>;

  /**
   * Get task status
   * @param taskId - Task ID
   * @returns Task or null if not found
   */
  getTask(taskId: string): Promise<Task<TInput> | null>;

  /**
   * Get multiple task statuses
   * @param taskIds - Array of task IDs
   * @returns Array of tasks (may include null for not found)
   */
  getTasks(taskIds: string[]): Promise<Array<Task<TInput> | null>>;

  /**
   * Cancel a task
   * @param taskId - Task ID
   * @returns True if cancelled, false if not found or already completed
   */
  cancel(taskId: string): Promise<boolean>;

  /**
   * Remove a task from the queue
   * @param taskId - Task ID
   * @returns True if removed, false if not found
   */
  remove(taskId: string): Promise<boolean>;

  /**
   * Get queue statistics
   */
  getStats(): Promise<QueueStats>;

  /**
   * Start processing tasks
   * @param handler - Task handler function
   */
  start(handler: TaskHandler<TInput, TOutput>): Promise<void>;

  /**
   * Stop processing tasks
   */
  stop(): Promise<void>;

  /**
   * Clear all tasks from the queue
   */
  clear(): Promise<void>;

  /**
   * Pause task processing
   */
  pause(): Promise<void>;

  /**
   * Resume task processing
   */
  resume(): Promise<void>;

  /**
   * Get tasks by status
   * @param status - Task status
   * @returns Array of tasks
   */
  getTasksByStatus(status: TaskStatus): Promise<Task<TInput>[]>;

  /**
   * Update task
   * @param taskId - Task ID
   * @param updates - Partial task updates
   */
  updateTask(taskId: string, updates: Partial<Task<TInput>>): Promise<void>;
}

/**
 * Task options
 */
export interface TaskOptions {
  priority?: TaskPriority;
  delay?: number; // milliseconds
  timeout?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

/**
 * Queue statistics
 */
export interface QueueStats {
  total: number; // Total tasks ever added
  queued: number; // Currently queued
  processing: number; // Currently processing
  completed: number; // Total completed
  failed: number; // Total failed
  cancelled: number; // Total cancelled
  avgProcessingTime: number; // Average processing time in ms
  peakConcurrency: number; // Peak concurrent tasks
}

/**
 * Task event types
 */
export enum TaskEventType {
  ADDED = 'added',
  STARTED = 'started',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
  RETRY = 'retry',
}

/**
 * Task event
 */
export interface TaskEvent<T = unknown> {
  type: TaskEventType;
  taskId: string;
  task?: Task<T>;
  timestamp: Date;
  error?: Error;
}

/**
 * Event listener type
 */
export type TaskEventListener<T = unknown> = (event: TaskEvent<T>) => void | Promise<void>;

/**
 * Type alias for ITaskQueue (for backward compatibility)
 */
export type TaskQueue<TInput = unknown, TOutput = unknown> = ITaskQueue<TInput, TOutput>;
