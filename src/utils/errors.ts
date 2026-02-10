/**
 * Custom error classes for the PPTX conversion service
 */

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, public code: string = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, 404, 'NOT_FOUND');
  }
}

/**
 * File processing error
 */
export class FileProcessingError extends AppError {
  constructor(
    message: string,
    public code: string = 'FILE_PROCESSING_ERROR'
  ) {
    super(message, 500, code);
  }
}

/**
 * PPTX parsing error
 */
export class PPTXParseError extends FileProcessingError {
  constructor(message: string) {
    super(message, 'PPTX_PARSE_ERROR');
  }
}

/**
 * Conversion error
 */
export class ConversionError extends FileProcessingError {
  constructor(message: string) {
    super(message, 'CONVERSION_ERROR');
  }
}

/**
 * Queue error
 */
export class QueueError extends AppError {
  constructor(message: string) {
    super(message, 500, 'QUEUE_ERROR');
  }
}

/**
 * Storage error
 */
export class StorageError extends AppError {
  constructor(message: string) {
    super(message, 500, 'STORAGE_ERROR');
  }
}

/**
 * File size limit exceeded error
 */
export class FileSizeLimitError extends ValidationError {
  constructor(maxSize: number, actualSize: number) {
    super(
      `File size ${actualSize} bytes exceeds maximum allowed size of ${maxSize} bytes`,
      'FILE_SIZE_LIMIT_EXCEEDED'
    );
  }
}

/**
 * Invalid file type error
 */
export class InvalidFileTypeError extends ValidationError {
  constructor(actualType: string) {
    super(
      `Invalid file type: ${actualType}. Only PPTX files are allowed`,
      'INVALID_FILE_TYPE'
    );
  }
}

/**
 * Task timeout error
 */
export class TaskTimeoutError extends AppError {
  constructor(taskId: string) {
    super(`Task ${taskId} timed out`, 408, 'TASK_TIMEOUT');
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    if (retryAfter) {
      this.retryAfter = retryAfter;
    }
  }

  retryAfter?: number;
}

/**
 * Error response formatter
 */
export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      },
    };
  }

  if (error instanceof Error) {
    return {
      error: {
        message: error.message,
        statusCode: 500,
      },
    };
  }

  return {
    error: {
      message: 'An unknown error occurred',
      statusCode: 500,
    },
  };
}

/**
 * PPTX validation error (alias for ValidationError)
 */
export class PPTXValidationError extends ValidationError {
  constructor(message: string, code: string = 'PPTX_VALIDATION_ERROR') {
    super(message, code);
  }
}

export default {
  AppError,
  ValidationError,
  PPTXValidationError,
  NotFoundError,
  FileProcessingError,
  PPTXParseError,
  ConversionError,
  QueueError,
  StorageError,
  FileSizeLimitError,
  InvalidFileTypeError,
  TaskTimeoutError,
  RateLimitError,
  formatErrorResponse,
};
