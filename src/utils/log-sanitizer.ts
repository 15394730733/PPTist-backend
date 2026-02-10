/**
 * Log Sanitizer
 *
 * Sanitizes sensitive information from log data.
 * Removes or masks sensitive data like file paths, tokens, etc.
 *
 * @module utils/log-sanitizer
 */

/**
 * Sensitive data patterns
 */
const SENSITIVE_PATTERNS = {
  // File paths (Windows and Unix)
  filePath: /[A-Z]:\\[^\\]+\\[^\\]+|\/[^\/]+\/[^\/]+/g,

  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // API keys and tokens
  apiKey: /\b(api[_-]?key|token|bearer|secret|authorization)[:\s]*[A-Za-z0-9\-._~+/]+=*\b/gi,

  // Credit card numbers
  creditCard: /\b(?:\d[ -]*?){13,16}\b/g,

  // Phone numbers
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,

  // IP addresses
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

  // UUIDs (except for request IDs)
  uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
};

/**
 * Sanitization options
 */
export interface SanitizeOptions {
  /**
   * Paths to redact (pino-style)
   */
  redact?: string[];

  /**
   * Whether to mask file paths
   */
  maskFilePaths?: boolean;

  /**
   * Whether to mask emails
   */
  maskEmails?: boolean;

  /**
   * Whether to mask API keys
   */
  maskApiKeys?: boolean;

  /**
   * Whether to mask credit cards
   */
  maskCreditCards?: boolean;

  /**
   * Whether to mask phone numbers
   */
  maskPhones?: boolean;

  /**
   * Whether to mask IP addresses
   */
  maskIpAddresses?: boolean;

  /**
   * Whether to mask UUIDs
   */
  maskUuids?: boolean;

  /**
   * Custom patterns to mask
   */
  customPatterns?: Array<{ pattern: RegExp; replacement: string }>;
}

/**
 * Default sanitization options
 */
const DEFAULT_OPTIONS: SanitizeOptions = {
  redact: [
    // Request headers
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-api-key"]',
    'req.headers["x-auth-token"]',

    // Response headers
    'res.headers["set-cookie"]',

    // Request body
    'req.body.password',
    'req.body.token',
    'req.body.apiKey',
    'req.body.secret',

    // Query parameters
    'req.query.token',
    'req.query.apiKey',
    'req.query.secret',
    'req.query.password',
  ],
  maskFilePaths: true,
  maskEmails: false,
  maskApiKeys: true,
  maskCreditCards: true,
  maskPhones: false,
  maskIpAddresses: false,
  maskUuids: false,
};

/**
 * Mask sensitive string with pattern
 */
function maskString(
  str: string,
  pattern: RegExp,
  maskChar: string = '*',
  visibleChars: number = 4
): string {
  return str.replace(pattern, (match) => {
    if (match.length <= visibleChars * 2) {
      return maskChar.repeat(match.length);
    }
    const start = match.substring(0, visibleChars);
    const end = match.substring(match.length - visibleChars);
    const middle = maskChar.repeat(match.length - visibleChars * 2);
    return `${start}${middle}${end}`;
  });
}

/**
 * Sanitize string value
 */
function sanitizeString(str: string, options: SanitizeOptions): string {
  let sanitized = str;

  // Apply masking based on options
  if (options.maskFilePaths) {
    sanitized = sanitized.replace(SENSITIVE_PATTERNS.filePath, (match) => {
      // Keep filename only
      const parts = match.split(/[\/\\]/);
      return parts[parts.length - 1] || '***';
    });
  }

  if (options.maskEmails) {
    sanitized = maskString(sanitized, SENSITIVE_PATTERNS.email);
  }

  if (options.maskApiKeys) {
    sanitized = sanitized.replace(SENSITIVE_PATTERNS.apiKey, (match) => {
      const parts = match.split(/[:\s]+/);
      const key = parts[parts.length - 1];
      return `${parts[0]} ${maskString(key, /./g)}`;
    });
  }

  if (options.maskCreditCards) {
    sanitized = maskString(sanitized, SENSITIVE_PATTERNS.creditCard, '*', 4);
  }

  if (options.maskPhones) {
    sanitized = maskString(sanitized, SENSITIVE_PATTERNS.phone, '*', 3);
  }

  if (options.maskIpAddresses) {
    sanitized = sanitized.replace(SENSITIVE_PATTERNS.ipAddress, '***.***.***.***');
  }

  if (options.maskUuids) {
    sanitized = maskString(sanitized, SENSITIVE_PATTERNS.uuid, '*', 8);
  }

  // Apply custom patterns
  if (options.customPatterns) {
    for (const { pattern, replacement } of options.customPatterns) {
      sanitized = sanitized.replace(pattern, replacement);
    }
  }

  return sanitized;
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj: any, options: SanitizeOptions): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key], options);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize log data
 *
 * @param data - Data to sanitize
 * @param options - Sanitization options
 * @returns Sanitized data
 */
export function sanitizeLogData(data: any, options?: Partial<SanitizeOptions>): any {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  return sanitizeObject(data, mergedOptions);
}

/**
 * Create pino redaction paths from options
 *
 * @param options - Sanitization options
 * @returns Array of redaction paths
 */
export function createRedactionPaths(options?: Partial<SanitizeOptions>): string[] {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  return mergedOptions.redact || [];
}

/**
 * Create pino redaction configuration
 *
 * @param options - Sanitization options
 * @returns Redaction configuration object
 */
export function createRedaction(options?: Partial<SanitizeOptions>) {
  const paths = createRedactionPaths(options);
  return {
    paths,
    remove: true,
  };
}

/**
 * Sanitize file path for logging
 *
 * @param filePath - File path to sanitize
 * @returns Sanitized file path
 */
export function sanitizeFilePath(filePath: string): string {
  // Keep only the filename
  const parts = filePath.split(/[\/\\]/);
  return parts[parts.length - 1] || '***';
}

/**
 * Sanitize error for logging
 *
 * @param error - Error to sanitize
 * @returns Sanitized error object
 */
export function sanitizeError(error: Error): any {
  return {
    name: error.name,
    message: sanitizeString(error.message, DEFAULT_OPTIONS),
    stack: error.stack ? sanitizeString(error.stack, DEFAULT_OPTIONS) : undefined,
  };
}

/**
 * Sanitize request data for logging
 *
 * @param requestData - Request data to sanitize
 * @returns Sanitized request data
 */
export function sanitizeRequestData(requestData: {
  headers?: Record<string, string>;
  body?: any;
  query?: any;
  url?: string;
  method?: string;
}): any {
  const sanitized: any = {};

  if (requestData.url) {
    sanitized.url = requestData.url;
  }

  if (requestData.method) {
    sanitized.method = requestData.method;
  }

  if (requestData.headers) {
    sanitized.headers = { ...requestData.headers };

    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    for (const header of sensitiveHeaders) {
      if (sanitized.headers[header]) {
        sanitized.headers[header] = '[REDACTED]';
      }
    }
  }

  if (requestData.body) {
    sanitized.body = sanitizeObject(requestData.body, DEFAULT_OPTIONS);
  }

  if (requestData.query) {
    sanitized.query = sanitizeObject(requestData.query, DEFAULT_OPTIONS);
  }

  return sanitized;
}

/**
 * Sanitize task data for logging
 *
 * @param taskData - Task data to sanitize
 * @returns Sanitized task data
 */
export function sanitizeTaskData(taskData: {
  id?: string;
  filename?: string;
  filePath?: string;
  metadata?: any;
}): any {
  const sanitized: any = {};

  if (taskData.id) {
    sanitized.id = taskData.id;
  }

  if (taskData.filename) {
    sanitized.filename = taskData.filename;
  }

  if (taskData.filePath) {
    sanitized.filePath = sanitizeFilePath(taskData.filePath);
  }

  if (taskData.metadata) {
    sanitized.metadata = sanitizeObject(taskData.metadata, DEFAULT_OPTIONS);
  }

  return sanitized;
}

export default {
  sanitizeLogData,
  createRedactionPaths,
  createRedaction,
  sanitizeFilePath,
  sanitizeError,
  sanitizeRequestData,
  sanitizeTaskData,
};
