import { z } from 'zod';

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
 * Task metadata schema
 */
export const TaskMetadataSchema = z.object({
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  failedAt: z.date().optional(),
  processingDuration: z.number().optional(), // milliseconds
  retryCount: z.number().int().min(0).default(0),
  priority: z.number().int().min(0).max(3).default(1), // 0-3 priority levels
  fileSize: z.number().int().positive().optional(),
  originalFileName: z.string().optional(),
});

/**
 * Conversion task schema
 */
export const ConversionTaskSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(TaskStatus),
  filePath: z.string(),
  fileName: z.string(),
  fileSize: z.number().int().positive(),
  pptistVersion: z.string().default('latest'),
  metadata: TaskMetadataSchema,
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
});

/**
 * Task creation input schema
 */
export const CreateTaskSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(104857600), // Max 100MB
  filePath: z.string(),
  pptistVersion: z.string().optional().default('latest'),
});

/**
 * Task query result schema (without sensitive file paths)
 */
export const TaskQuerySchema = ConversionTaskSchema.pick({
  id: true,
  status: true,
  fileName: true,
  fileSize: true,
  pptistVersion: true,
  metadata: true,
  errorMessage: true,
  errorCode: true,
}).extend({
  progress: z.number().min(0).max(100).optional(),
});

/**
 * Batch task query request schema
 */
export const BatchTaskQuerySchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * Batch task query response schema
 */
export const BatchTaskResponseSchema = z.object({
  tasks: z.array(TaskQuerySchema),
  notFound: z.array(z.string().uuid()),
});

// Type exports
export type TaskMetadata = z.infer<typeof TaskMetadataSchema>;
export type ConversionTask = z.infer<typeof ConversionTaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type TaskQuery = z.infer<typeof TaskQuerySchema>;
export type BatchTaskQuery = z.infer<typeof BatchTaskQuerySchema>;
export type BatchTaskResponse = z.infer<typeof BatchTaskResponseSchema>;

/**
 * Task class with helper methods
 */
export class ConversionTaskModel {
  constructor(
    public id: string,
    public status: TaskStatus,
    public filePath: string,
    public fileName: string,
    public fileSize: number,
    public pptistVersion: string,
    public metadata: TaskMetadata,
    public errorMessage?: string,
    public errorCode?: string
  ) {}

  /**
   * Create a new task
   */
  static create(input: CreateTaskInput): ConversionTaskModel {
    const metadata: TaskMetadata = {
      createdAt: new Date(),
      retryCount: 0,
      priority: 1,
      fileSize: input.fileSize,
      originalFileName: input.fileName,
    };

    return new ConversionTaskModel(
      crypto.randomUUID(),
      TaskStatus.QUEUED,
      input.filePath,
      input.fileName,
      input.fileSize,
      input.pptistVersion,
      metadata
    );
  }

  /**
   * Mark task as processing
   */
  markProcessing(): void {
    this.status = TaskStatus.PROCESSING;
    this.metadata.startedAt = new Date();
  }

  /**
   * Mark task as completed
   */
  markCompleted(): void {
    this.status = TaskStatus.COMPLETED;
    this.metadata.completedAt = new Date();
    if (this.metadata.startedAt) {
      this.metadata.processingDuration =
        this.metadata.completedAt.getTime() - this.metadata.startedAt.getTime();
    }
  }

  /**
   * Mark task as failed
   */
  markFailed(error: Error, code?: string): void {
    this.status = TaskStatus.FAILED;
    this.metadata.failedAt = new Date();
    this.errorMessage = error.message;
    this.errorCode = code || 'UNKNOWN_ERROR';
    if (this.metadata.startedAt) {
      this.metadata.processingDuration =
        this.metadata.failedAt.getTime() - this.metadata.startedAt.getTime();
    }
  }

  /**
   * Mark task as cancelled
   */
  markCancelled(): void {
    this.status = TaskStatus.CANCELLED;
    this.metadata.completedAt = new Date();
  }

  /**
   * Mark task as timed out
   */
  markTimeout(): void {
    this.status = TaskStatus.TIMEOUT;
    this.metadata.failedAt = new Date();
    this.errorCode = 'TASK_TIMEOUT';
  }

  /**
   * Increment retry count
   */
  incrementRetry(): void {
    this.metadata.retryCount += 1;
  }

  /**
   * Check if task is terminal (completed, failed, cancelled, or timeout)
   */
  isTerminal(): boolean {
    return [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED, TaskStatus.TIMEOUT].includes(
      this.status
    );
  }

  /**
   * Check if task can be retried
   */
  canRetry(maxRetries: number): boolean {
    return this.status === TaskStatus.FAILED && this.metadata.retryCount < maxRetries;
  }

  /**
   * Get task progress percentage
   */
  getProgress(): number {
    switch (this.status) {
      case TaskStatus.QUEUED:
        return 0;
      case TaskStatus.PROCESSING:
        return 50;
      case TaskStatus.COMPLETED:
      case TaskStatus.FAILED:
      case TaskStatus.CANCELLED:
      case TaskStatus.TIMEOUT:
        return 100;
      default:
        return 0;
    }
  }

  /**
   * Convert to plain object (without sensitive data)
   */
  toQuery(): TaskQuery {
    return {
      id: this.id,
      status: this.status,
      fileName: this.fileName,
      fileSize: this.fileSize,
      pptistVersion: this.pptistVersion,
      metadata: this.metadata,
      errorMessage: this.errorMessage,
      errorCode: this.errorCode,
      progress: this.getProgress(),
    };
  }

  /**
   * Convert to full object (including file path)
   */
  toObject(): ConversionTask {
    return {
      id: this.id,
      status: this.status,
      filePath: this.filePath,
      fileName: this.fileName,
      fileSize: this.fileSize,
      pptistVersion: this.pptistVersion,
      metadata: this.metadata,
      errorMessage: this.errorMessage,
      errorCode: this.errorCode,
    };
  }
}

export default {
  TaskStatus,
  TaskMetadataSchema,
  ConversionTaskSchema,
  CreateTaskSchema,
  TaskQuerySchema,
  BatchTaskQuerySchema,
  BatchTaskResponseSchema,
  ConversionTaskModel,
};
