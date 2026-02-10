/**
 * Task Controller
 *
 * Handles task status queries and result retrieval.
 *
 * @module api/v1/controllers/tasks
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../../../utils/logger';
import type { TaskQueue } from '../../../types/queue';
import { getDefaultResultsDir } from '../../../utils/paths';

/**
 * 批量任务状态查询结果
 */
export interface BatchTaskStatusResult {
  /** 任务映射（taskId -> taskInfo） */
  tasks: Record<string, TaskStatusInfo>;

  /** 汇总统计 */
  summary: BatchTaskSummary;

  /** 未找到的任务 ID 列表 */
  notFound: string[];

  /** 总进度信息 */
  progress: {
    /** 总任务数 */
    total: number;
    /** 已完成任务数 */
    completed: number;
    /** 进度百分比 */
    percentage: number;
  };
}

/**
 * 任务状态信息
 */
export interface TaskStatusInfo {
  /** 任务 ID */
  taskId: string;

  /** 任务状态 */
  status: string;

  /** 进度百分比 */
  progress: number;

  /** 创建时间 */
  createdAt?: string;

  /** 更新时间 */
  updatedAt?: string;

  /** 错误信息（如果有） */
  error?: string;

  /** 元数据（文件名、大小等） */
  metadata?: {
    filename?: string;
    size?: number;
  };
}

/**
 * 批量任务汇总
 */
export interface BatchTaskSummary {
  /** 总任务数 */
  total: number;

  /** 各状态计数 */
  statusCounts: {
    /** 排队中 */
    queued: number;
    /** 处理中 */
    processing: number;
    /** 已完成 */
    completed: number;
    /** 失败 */
    failed: number;
  };
}

/**
 * Task controller options
 */
export interface TaskControllerOptions {
  /**
   * Task queue instance
   */
  queue: TaskQueue;

  /**
   * Results directory (default: /tmp/pptx-results/)
   */
  resultsDir?: string;

  /**
   * Maximum number of tasks in batch query (default: 100)
   */
  maxBatchQuery?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS = {
  resultsDir: getDefaultResultsDir(),
  maxBatchQuery: 100, // 最多 100 个任务
};

/**
 * Task controller class
 */
export class TaskController {
  private queue: TaskQueue;
  private resultsDir: string;
  private maxBatchQuery: number;

  constructor(options: TaskControllerOptions) {
    this.queue = options.queue;
    this.resultsDir = options.resultsDir || DEFAULT_OPTIONS.resultsDir;
    this.maxBatchQuery = options.maxBatchQuery ?? DEFAULT_OPTIONS.maxBatchQuery;

    // Ensure results directory exists
    this.initializeResultsDir();
  }

  /**
   * Initialize results directory
   */
  private async initializeResultsDir(): Promise<void> {
    try {
      await fs.mkdir(this.resultsDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create results directory', {
        error: error instanceof Error ? error.message : String(error),
        resultsDir: this.resultsDir,
      });
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(request: any, reply: any): Promise<void> {
    try {
      const { taskId } = request.params;

      if (!taskId) {
        return reply.code(400).send({
          success: false,
          error: 'Task ID is required',
        });
      }

      // Get task from queue
      const task = await this.queue.getTask(taskId);

      if (!task) {
        return reply.code(404).send({
          success: false,
          error: 'Task not found',
        });
      }

      return reply.code(200).send({
        success: true,
        taskId: task.id,
        status: task.status,
        progress: task.progress || 0,
        message: this.getStatusMessage(task.status),
        error: task.error,
      });
    } catch (error) {
      logger.error('Failed to get task status', {
        error: error instanceof Error ? error.message : String(error),
      });

      return reply.code(500).send({
        success: false,
        error: 'Internal server error while fetching task status',
      });
    }
  }

  /**
   * Get task result (JSON)
   */
  async getTaskResult(request: any, reply: any): Promise<void> {
    try {
      const { taskId } = request.params;

      if (!taskId) {
        return reply.code(400).send({
          success: false,
          error: 'Task ID is required',
        });
      }

      // Get task from queue
      const task = await this.queue.getTask(taskId);

      if (!task) {
        return reply.code(404).send({
          success: false,
          error: 'Task not found',
        });
      }

      // Check if task is completed
      if (task.status !== 'completed') {
        return reply.code(400).send({
          success: false,
          error: `Task is not completed. Current status: ${task.status}`,
        });
      }

      // Read result from file and convert to PPTist format
      try {
        const jsonPath = path.join(this.resultsDir, `${taskId}.json`);

        logger.info(`Reading result file: ${jsonPath}`);

        const fileContent = await fs.readFile(jsonPath, 'utf-8');

        logger.info('Result file read', {
          taskId,
          jsonPath,
          fileLength: fileContent.length,
          hasContent: fileContent.length > 0,
        });

        // Parse the conversion result
        const parsedData = JSON.parse(fileContent);

        // Import the PPTist serializer dynamically
        const { serializeToPPTistFormat } = await import('../../../services/conversion/pptist-serializer.js');

        // Convert to PPTist expected format
        const pptistFormat = serializeToPPTistFormat(
          parsedData.presentation,
          parsedData.metadata,
          parsedData.warnings
        );

        // Convert back to JSON string with proper formatting
        const pptistJSON = JSON.stringify(pptistFormat, null, 2);

        logger.info('Converted to PPTist format', {
          taskId,
          slideCount: pptistFormat.slides.length,
        });

        // Set content disposition header with proper encoding
        const originalFilename = (task.data as any).originalFilename.replace('.pptx', '.json');

        // Extract base filename without extension for ASCII fallback
        const baseName = 'result'; // Safe ASCII fallback name

        // Encode the full filename for UTF-8 support
        const encodedFilename = encodeURIComponent(originalFilename);

        // Use RFC 5987 encoding with ASCII fallback
        return reply
          .header('Content-Disposition', `attachment; filename="${baseName}.json"; filename*=UTF-8''${encodedFilename}`)
          .header('Content-Type', 'application/json')
          .send(pptistJSON);
      } catch (fileError) {
        logger.error(`Failed to read result file: ${jsonPath}`, {
          taskId,
          error: fileError instanceof Error ? fileError.message : String(fileError),
        });
        return reply.code(404).send({
          success: false,
          error: 'Conversion result not found',
        });
      }

      // Debug logging
      logger.info('Task result details', {
        taskId,
        resultKeys,
        hasData: !!(task.result as any).data,
        resultType: typeof task.result,
      });

      // Extract the actual data from the wrapped result
      // Queue wraps results as { success: true, data: actualResult }
      let actualResult = (task.result as any).data || task.result;

      // Fallback to file if result is still empty
      if (!actualResult || Object.keys(actualResult).length === 0) {
        logger.warn('Extracted result is empty, reading from file', {
          taskId,
          actualResultKeys: actualResult ? Object.keys(actualResult) : 'null/undefined',
        });
        try {
          const jsonPath = path.join(this.resultsDir, `${taskId}.json`);
          const fileContent = await fs.readFile(jsonPath, 'utf-8');
          actualResult = JSON.parse(fileContent);
          logger.info('Successfully read result from file', {
            taskId,
            hasPresentation: !!(actualResult as any).presentation,
          });
        } catch (fileError) {
          logger.error('Failed to read result from file', {
            taskId,
            error: fileError instanceof Error ? fileError.message : String(fileError),
          });
          return reply.code(500).send({
            success: false,
            error: 'Failed to retrieve conversion result',
          });
        }
      }

      // Set content disposition header with proper encoding
      const originalFilename = (task.data as any).originalFilename.replace('.pptx', '.json');

      // Extract base filename without extension for ASCII fallback
      const baseName = 'result'; // Safe ASCII fallback name

      // Encode the full filename for UTF-8 support
      const encodedFilename = encodeURIComponent(originalFilename);

      // Use RFC 5987 encoding with ASCII fallback
      reply.header('Content-Disposition', `attachment; filename="${baseName}.json"; filename*=UTF-8''${encodedFilename}`);
      reply.header('Content-Type', 'application/json');

      return reply.send(actualResult);
    } catch (error) {
      logger.error('Failed to get task result', {
        error: error instanceof Error ? error.message : String(error),
      });

      return reply.code(500).send({
        success: false,
        error: 'Internal server error while fetching task result',
      });
    }
  }

  /**
   * Get task result as ZIP
   */
  async getTaskResultZip(request: any, reply: any): Promise<void> {
    try {
      const { taskId } = request.params;

      if (!taskId) {
        return reply.code(400).send({
          success: false,
          error: 'Task ID is required',
        });
      }

      // Get task from queue
      const task = await this.queue.getTask(taskId);

      if (!task) {
        return reply.code(404).send({
          success: false,
          error: 'Task not found',
        });
      }

      // Check if task is completed
      if (task.status !== 'completed') {
        return reply.code(400).send({
          success: false,
          error: `Task is not completed. Current status: ${task.status}`,
        });
      }

      // Check if ZIP result exists
      const zipPath = path.join(this.resultsDir, `${taskId}.zip`);

      try {
        await fs.access(zipPath);
      } catch {
        return reply.code(404).send({
          success: false,
          error: 'ZIP result not found. Try downloading JSON instead.',
        });
      }

      // Stream ZIP file
      const stream = await fs.readFile(zipPath);

      // Set content disposition header with proper encoding
      const originalFilename = (task.data as any).originalFilename.replace('.pptx', '.zip');

      // Extract base filename without extension for ASCII fallback
      const baseName = 'result'; // Safe ASCII fallback name

      // Encode the full filename for UTF-8 support
      const encodedFilename = encodeURIComponent(originalFilename);

      // Use RFC 5987 encoding with ASCII fallback
      reply.header('Content-Disposition', `attachment; filename="${baseName}.zip"; filename*=UTF-8''${encodedFilename}`);
      reply.header('Content-Type', 'application/zip');

      return reply.send(stream);
    } catch (error) {
      logger.error('Failed to get task result ZIP', {
        error: error instanceof Error ? error.message : String(error),
      });

      return reply.code(500).send({
        success: false,
        error: 'Internal server error while fetching task result ZIP',
      });
    }
  }

  /**
   * Batch get task statuses
   */
  async batchGetTaskStatus(request: any, reply: any): Promise<void> {
    try {
      const { taskIds } = request.body;

      // 验证请求
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Task IDs array is required and must not be empty',
        });
      }

      // 验证数量限制
      if (taskIds.length > this.maxBatchQuery) {
        return reply.code(400).send({
          success: false,
          error: `Too many task IDs. Maximum ${this.maxBatchQuery} tasks per query.`,
          code: 'TOO_MANY_TASKS',
          limit: this.maxBatchQuery,
        });
      }

      // 去重
      const uniqueTaskIds = Array.from(new Set(taskIds));

      if (uniqueTaskIds.length < taskIds.length) {
        logger.warn('Duplicate task IDs detected in batch query', {
          requested: taskIds.length,
          unique: uniqueTaskIds.length,
        });
      }

      logger.info('Batch task status query started', {
        taskCount: uniqueTaskIds.length,
      });

      // 并行查询所有任务状态
      const taskPromises = uniqueTaskIds.map(async (taskId) => {
        try {
          const task = await this.queue.getTask(taskId);

          if (!task) {
            return {
              taskId,
              found: false,
            };
          }

          return {
            taskId,
            found: true,
            task,
          };
        } catch (error) {
          logger.error('Failed to get task in batch query', {
            taskId,
            error: error instanceof Error ? error.message : String(error),
          });

          return {
            taskId,
            found: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      const results = await Promise.all(taskPromises);

      // 整理结果
      const tasks: Record<string, TaskStatusInfo> = {};
      const notFound: string[] = [];
      const statusCounts = {
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      };

      for (const result of results) {
        if (!result.found) {
          tasks[result.taskId] = {
            taskId: result.taskId,
            status: 'not_found',
            progress: 0,
          };
          notFound.push(result.taskId);
          continue;
        }

        const task = result.task;
        if (!task) {
          // Should not happen due to found check, but handle anyway
          continue;
        }

        // 统计状态
        if (task.status in statusCounts) {
          statusCounts[task.status as keyof typeof statusCounts]++;
        }

        // 提取元数据
        const metadata = task.data ? {
          filename: (task.data as any).originalFilename,
          size: (task.data as any).metadata?.size,
        } : undefined;

        tasks[result.taskId] = {
          taskId: result.taskId,
          status: task.status,
          progress: task.progress || 0,
          createdAt: (task as any).createdAt?.toISOString(),
          updatedAt: (task as any).updatedAt?.toISOString(),
          error: task.error,
          metadata,
        };
      }

      // 计算总进度
      const totalProgress = Object.values(tasks).reduce((sum, task) => {
        return sum + (task.status !== 'not_found' ? task.progress : 0);
      }, 0);

      const validTaskCount = uniqueTaskIds.length - notFound.length;
      const averageProgress = validTaskCount > 0 ? Math.round(totalProgress / validTaskCount) : 0;

      // 构建响应
      const batchResult: BatchTaskStatusResult = {
        tasks,
        summary: {
          total: uniqueTaskIds.length,
          statusCounts,
        },
        notFound,
        progress: {
          total: uniqueTaskIds.length,
          completed: statusCounts.completed,
          percentage: averageProgress,
        },
      };

      logger.info('Batch task status query completed', {
        summary: batchResult.summary,
        notFound: notFound.length,
      });

      return reply.code(200).send({
        success: true,
        data: batchResult,
      });
    } catch (error) {
      logger.error('Failed to batch get task statuses', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return reply.code(500).send({
        success: false,
        error: 'Internal server error while fetching task statuses',
      });
    }
  }

  /**
   * Get status message for task status
   */
  private getStatusMessage(status: string): string {
    const messages: Record<string, string> = {
      queued: 'Task is queued and will be processed shortly',
      processing: 'Task is currently being processed',
      completed: 'Task completed successfully',
      failed: 'Task failed during processing',
    };

    return messages[status] || 'Unknown status';
  }
}

/**
 * Create task controller instance
 */
export function createTaskController(options: TaskControllerOptions): TaskController {
  return new TaskController(options);
}
