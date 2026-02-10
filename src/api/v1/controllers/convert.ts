/**
 * Conversion Controller
 *
 * Handles file upload, validation, and task creation for PPTX conversion.
 *
 * @module api/v1/controllers/convert
 */

import { MultipartFile } from '@fastify/multipart';
import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../../../utils/logger';
import { validatePPTXFile, isPPTXFilename } from '../../../services/pptx/validator';
import type { TaskQueue } from '../../../types/queue';
import { PPTXValidationError } from '../../../utils/errors';
import { getDefaultUploadsDir } from '../../../utils/paths';

/**
 * PPTX 文件魔数（文件签名）
 */
const PPTX_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK.. (ZIP signature)

/**
 * 验证文件魔数（文件头签名）
 */
export async function validateFileSignature(buffer: Buffer): Promise<boolean> {
  if (buffer.length < 4) {
    return false;
  }

  // 检查 ZIP 文件签名（PPTX 本质上是 ZIP 文件）
  return buffer.subarray(0, 4).equals(PPTX_SIGNATURE);
}

/**
 * 清理文件名，防止路径遍历攻击
 */
export function sanitizeFilename(filename: string): string {
  // 移除路径分隔符和特殊字符
  return filename
    .replace(/[\/\\]/g, '') // 移除路径分隔符
    .replace(/\.\./g, '') // 移除 .. (路径遍历)
    .replace(/[<>:"|?*]/g, '') // 移除 Windows 不允许的字符
    .substring(0, 255); // 限制文件名长度
}

/**
 * 批量转换结果
 */
export interface BatchConvertResult {
  /** 任务 ID 列表 */
  taskIds: string[];

  /** 任务详情列表 */
  tasks: BatchTaskInfo[];

  /** 汇总信息 */
  summary: {
    /** 总文件数 */
    total: number;
    /** 成功创建任务数 */
    created: number;
    /** 失败文件数 */
    failed: number;
  };

  /** 错误列表 */
  errors: BatchError[];
}

/**
 * 批量任务信息
 */
export interface BatchTaskInfo {
  /** 任务 ID */
  taskId: string;

  /** 文件名 */
  filename: string;

  /** 文件大小 */
  size: number;

  /** 任务状态 */
  status: string;
}

/**
 * 批量错误信息
 */
export interface BatchError {
  /** 文件名 */
  filename: string;

  /** 错误消息 */
  error: string;

  /** 错误代码 */
  code: string;
}

/**
 * Conversion controller options
 */
export interface ConvertControllerOptions {
  /**
   * Task queue instance
   */
  queue: TaskQueue;

  /**
   * Maximum file size in bytes (default: 100MB)
   */
  maxFileSize?: number;

  /**
   * Temporary upload directory (default: /tmp/pptx-uploads/)
   */
  uploadDir?: string;

  /**
   * Maximum number of files in batch upload (default: 10)
   */
  maxBatchFiles?: number;

  /**
   * Allowed MIME types
   */
  allowedMimeTypes?: string[];
}

/**
 * Default options
 */
const DEFAULT_OPTIONS = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  uploadDir: getDefaultUploadsDir(),
  maxBatchFiles: 10, // 最多 10 个文件
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/zip',
  ],
};

/**
 * Conversion controller class
 */
export class ConvertController {
  private queue: TaskQueue;
  private maxFileSize: number;
  private uploadDir: string;
  private maxBatchFiles: number;
  private allowedMimeTypes: string[];

  constructor(options: ConvertControllerOptions) {
    this.queue = options.queue;
    this.maxFileSize = options.maxFileSize || DEFAULT_OPTIONS.maxFileSize;
    this.uploadDir = options.uploadDir || DEFAULT_OPTIONS.uploadDir;
    this.maxBatchFiles = options.maxBatchFiles ?? DEFAULT_OPTIONS.maxBatchFiles;
    this.allowedMimeTypes = options.allowedMimeTypes || DEFAULT_OPTIONS.allowedMimeTypes;

    // Ensure upload directory exists
    this.initializeUploadDir();
  }

  /**
   * Initialize upload directory
   */
  private async initializeUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory', {
        error: error instanceof Error ? error.message : String(error),
        uploadDir: this.uploadDir,
      });
    }
  }

  /**
   * Handle single file upload and conversion
   */
  async uploadAndConvert(request: any, reply: any): Promise<void> {
    try {
      // Parse uploaded file
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No file uploaded. Please provide a PPTX file.',
        });
      }

      // Parse conversion options from request
      const ignoreEncryption = request.body?.ignoreEncryption === true || request.query?.ignoreEncryption === 'true';

      // Validate file
      const validationResult = await this.validateUploadedFile(data);

      if (!validationResult.valid) {
        const errorMessage = validationResult.errors.map((e: any) => e.message).join('; ');

        // Check if it's a file size error and return 413
        const hasFileSizeError = validationResult.errors.some((e: any) => e.code === 'FILE_TOO_LARGE');
        const statusCode = hasFileSizeError ? 413 : 400;

        return reply.code(statusCode).send({
          success: false,
          error: errorMessage,
          code: hasFileSizeError ? 'FILE_TOO_LARGE' : 'VALIDATION_ERROR',
        });
      }

      // Save uploaded file to temporary location
      const filePath = await this.saveUploadedFile(data, validationResult.metadata.filename);

      // Create conversion task data (queue will generate taskId)
      const taskData = {
        filePath,
        originalFilename: validationResult.metadata.filename,
        metadata: validationResult.metadata,
        options: {
          ignoreEncryption,
        },
      };

      // Submit to queue and get generated taskId
      const taskId = await this.queue.add(taskData);

      logger.info('Conversion task created', {
        taskId,
        filename: data.filename,
        size: validationResult.metadata.size,
      });

      return reply.code(200).send({
        success: true,
        taskId,
        message: 'File uploaded successfully. Conversion started.',
      });
    } catch (error) {
      logger.error('Failed to process upload', {
        error: error instanceof Error ? error.message : String(error),
      });

      return reply.code(500).send({
        success: false,
        error: 'Internal server error during file upload.',
      });
    }
  }

  /**
   * Handle batch file upload and conversion
   */
  async batchUploadAndConvert(request: any, reply: any): Promise<void> {
    try {
      const files: MultipartFile[] = [];
      const taskIds: string[] = [];
      const tasks: BatchTaskInfo[] = [];
      const errors: BatchError[] = [];

      // Parse uploaded files
      const data = await request.files();

      for await (const file of data) {
        files.push(file);
      }

      // 验证文件数量
      if (files.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'No files uploaded. Please provide at least one PPTX file.',
        });
      }

      if (files.length > this.maxBatchFiles) {
        return reply.code(400).send({
          success: false,
          error: `Too many files. Maximum ${this.maxBatchFiles} files allowed per batch upload.`,
          code: 'TOO_MANY_FILES',
          limit: this.maxBatchFiles,
        });
      }

      logger.info('Batch upload started', {
        fileCount: files.length,
        maxFiles: this.maxBatchFiles,
      });

      // 处理每个文件
      for (const file of files) {
        try {
          // 验证文件
          const validationResult = await this.validateUploadedFile(file);

          if (!validationResult.valid) {
            const errorMessage = validationResult.errors.map((e: any) => e.message).join('; ');
            const errorCode = validationResult.errors[0]?.code || 'VALIDATION_ERROR';

            logger.warn('File validation failed in batch upload', {
              filename: file.filename,
              errors: validationResult.errors,
            });

            errors.push({
              filename: file.filename,
              error: errorMessage,
              code: errorCode,
            });
            continue;
          }

          // 保存上传的文件
          const filePath = await this.saveUploadedFile(file, validationResult.metadata.filename);

          // 创建转换任务数据 (queue will generate taskId)
          const taskData = {
            filePath,
            originalFilename: validationResult.metadata.filename,
            metadata: validationResult.metadata,
          };

          // Submit to queue and get generated taskId
          const taskId = await this.queue.add(taskData);

          taskIds.push(taskId);
          tasks.push({
            taskId,
            filename: file.filename,
            size: validationResult.metadata.size,
            status: 'queued',
          });

          logger.info('Batch conversion task created', {
            taskId,
            filename: file.filename,
            size: validationResult.metadata.size,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          logger.error('Failed to process file in batch', {
            filename: file.filename,
            error: errorMessage,
          });

          errors.push({
            filename: file.filename,
            error: errorMessage,
            code: 'PROCESSING_ERROR',
          });
        }
      }

      // 检查是否至少有一个任务创建成功
      if (taskIds.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Failed to create conversion tasks. All files were invalid or could not be processed.',
          errors,
        });
      }

      // 构建响应
      const result: BatchConvertResult = {
        taskIds,
        tasks,
        summary: {
          total: files.length,
          created: taskIds.length,
          failed: errors.length,
        },
        errors: errors.length > 0 ? errors : [],
      };

      logger.info('Batch upload completed', {
        summary: result.summary,
      });

      return reply.code(200).send({
        success: true,
        data: result,
        message: `${taskIds.length} of ${files.length} file(s) uploaded successfully. Conversion started.`,
      });
    } catch (error) {
      logger.error('Failed to process batch upload', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return reply.code(500).send({
        success: false,
        error: 'Internal server error during batch file upload.',
      });
    }
  }

  /**
   * Validate uploaded file
   */
  private async validateUploadedFile(file: MultipartFile): Promise<any> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // 1. 清理并验证文件名
    const sanitizedFilename = sanitizeFilename(file.filename);
    if (sanitizedFilename !== file.filename) {
      warnings.push({
        code: 'FILENAME_SANITIZED',
        message: 'Filename was sanitized for security reasons',
        severity: 'warning',
      });
    }

    // 2. 检查文件扩展名
    if (!isPPTXFilename(sanitizedFilename)) {
      errors.push({
        code: 'INVALID_FILE_TYPE',
        message: 'Invalid file type. Please upload a .pptx file.',
        severity: 'critical',
      });
      return {
        valid: false,
        errors,
        warnings,
        metadata: { filename: sanitizedFilename },
      };
    }

    // 3. 将文件读入内存进行验证
    const fileBuffer = await file.toBuffer();

    // 4. 检查文件大小
    if (fileBuffer.length === 0) {
      errors.push({
        code: 'EMPTY_FILE',
        message: 'Uploaded file is empty',
        severity: 'critical',
      });
      return {
        valid: false,
        errors,
        warnings,
        metadata: { filename: sanitizedFilename, size: 0 },
      };
    }

    if (fileBuffer.length > this.maxFileSize) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File size (${Math.round(fileBuffer.length / 1024 / 1024)}MB) exceeds maximum allowed size of ${Math.round(this.maxFileSize / 1024 / 1024)}MB`,
        severity: 'critical',
      });
      return {
        valid: false,
        errors,
        warnings,
        metadata: { filename: sanitizedFilename, size: fileBuffer.length },
      };
    }

    // 5. 验证文件魔数（签名）
    const hasValidSignature = await validateFileSignature(fileBuffer);
    if (!hasValidSignature) {
      errors.push({
        code: 'INVALID_FILE_SIGNATURE',
        message: 'File does not have a valid PPTX/ZIP signature. The file may be corrupted or not a PPTX file.',
        severity: 'critical',
      });
      return {
        valid: false,
        errors,
        warnings,
        metadata: { filename: sanitizedFilename, size: fileBuffer.length },
      };
    }

    // 6. 验证 MIME 类型
    if (file.mimetype && !this.allowedMimeTypes.includes(file.mimetype)) {
      warnings.push({
        code: 'UNEXPECTED_MIME_TYPE',
        message: `Unexpected MIME type: ${file.mimetype}. This may indicate file corruption.`,
        severity: 'warning',
      });
    }

    // 7. 验证最小文件大小（PPTX 文件至少应该有一些内容）
    const MIN_PPTX_SIZE = 1000; // 1KB
    if (fileBuffer.length < MIN_PPTX_SIZE) {
      warnings.push({
        code: 'VERY_SMALL_FILE',
        message: 'File is unusually small. This may not be a valid PPTX file.',
        severity: 'warning',
      });
    }

    // 验证通过
    return {
      valid: true,
      errors: [],
      warnings,
      metadata: {
        filename: sanitizedFilename,
        originalFilename: file.filename,
        size: fileBuffer.length,
        contentType: file.mimetype || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        hasEncrypted: false,
        hasMacros: false,
        hasPassword: false,
        isValidZip: true,
      },
    };
  }

  /**
   * Save uploaded file to temporary location
   */
  private async saveUploadedFile(file: MultipartFile, sanitizedFilename?: string): Promise<string> {
    // 使用清理后的文件名，如果提供的话
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filename = `${uniqueId}-${sanitizedFilename || sanitizeFilename(file.filename)}`;
    const filePath = path.join(this.uploadDir, filename);

    // 验证路径安全性（防止路径遍历）
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(this.uploadDir);

    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      throw new Error('Invalid file path: potential path traversal attack detected');
    }

    const buffer = await file.toBuffer();
    await fs.writeFile(filePath, buffer);

    logger.debug('Uploaded file saved', {
      filename,
      path: filePath,
      size: buffer.length,
    });

    return filePath;
  }

}

/**
 * Create convert controller instance
 */
export function createConvertController(options: ConvertControllerOptions): ConvertController {
  return new ConvertController(options);
}
