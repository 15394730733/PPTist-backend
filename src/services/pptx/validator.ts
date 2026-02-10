/**
 * PPTX File Validator
 *
 * Validates PPTX files structure, format, encryption, and integrity.
 * Checks for common issues that would prevent successful conversion.
 *
 * @module services/pptx/validator
 */

import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';
import { PPTXValidationError } from '../../utils/errors';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: PPTXFileMetadata;
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  severity: 'critical' | 'error';
  context?: Record<string, any>;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  context?: Record<string, any>;
}

/**
 * PPTX file metadata
 */
export interface PPTXFileMetadata {
  filename: string;
  size: number;
  contentType: string;
  version?: string;
  application?: string;
  hasEncrypted: boolean;
  hasMacros: boolean;
  hasPassword: boolean;
  isValidZip: boolean;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * Maximum file size in bytes (default: 100MB)
   */
  maxSize?: number;

  /**
   * Whether to check file signature (default: true)
   */
  checkSignature?: boolean;

  /**
   * Whether to check zip structure (default: true)
   */
  checkZipStructure?: boolean;

  /**
   * Allowed content types (default: PPTX content types)
   */
  allowedContentTypes?: string[];

  /**
   * Whether to ignore encryption flag (default: false)
   * Some ZIP creators set encryption flag even when files are not encrypted
   */
  ignoreEncryption?: boolean;
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: Required<Omit<ValidationOptions, 'allowedContentTypes'>> = {
  maxSize: 100 * 1024 * 1024, // 100MB
  checkSignature: true,
  checkZipStructure: true,
  ignoreEncryption: false, // 默认不忽略加密标记
};

/**
 * Default allowed content types for PPTX
 */
const DEFAULT_CONTENT_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/zip',
];

/**
 * PPTX file signature (ZIP file signature)
 */
const PPTX_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK.. (ZIP signature)

/**
 * Required PPTX structure entries
 */
const REQUIRED_PPTX_ENTRIES = [
  '[Content_Types].xml',
  '_rels/.rels',
  'ppt/presentation.xml',
  'ppt/slides/',
];

/**
 * Validate PPTX file
 *
 * @param filePath - Path to PPTX file
 * @param options - Validation options
 * @returns Promise<ValidationResult>
 */
export async function validatePPTXFile(
  filePath: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options, ignoreEncryption: options.ignoreEncryption ?? false };
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    metadata: {
      filename: path.basename(filePath),
      size: 0,
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      hasEncrypted: false,
      hasMacros: false,
      hasPassword: false,
      isValidZip: false,
    },
  };

  logger.info('Starting PPTX file validation', {
    path: filePath,
    maxSize: opts.maxSize,
  });

  try {
    // Step 1: Check if file exists
    await checkFileExists(filePath);

    // Step 2: Get file metadata
    const stats = await fs.stat(filePath);
    result.metadata.size = stats.size;

    // Step 3: Check file size
    await checkFileSize(stats.size, opts.maxSize, result);

    // Step 4: Check file signature
    if (opts.checkSignature) {
      await checkFileSignature(filePath, result);
    }

    // Step 5: Check ZIP structure (basic check)
    if (opts.checkZipStructure) {
      await checkZipStructure(filePath, result, opts.ignoreEncryption);
    }

    // Step 6: Check for encrypted content (only if not ignoring encryption)
    // This is done during ZIP extraction, but we can do a preliminary check here
    if (!opts.ignoreEncryption) {
      await checkForEncryption(filePath, result);
    }

    // Determine overall validity
    result.valid = result.errors.filter((e) => e.severity === 'critical').length === 0;

    if (result.valid) {
      logger.info('PPTX file validation passed', {
        filename: result.metadata.filename,
        size: result.metadata.size,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      });
    } else {
      logger.warn('PPTX file validation failed', {
        filename: result.metadata.filename,
        errorCount: result.errors.length,
        errors: result.errors.map((e) => e.code),
      });
    }

    return result;
  } catch (error) {
    logger.error('PPTX file validation error', {
      error: error instanceof Error ? error.message : String(error),
      path: filePath,
    });

    result.valid = false;
    result.errors.push({
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'critical',
    });

    return result;
  }
}

/**
 * Check if file exists
 */
async function checkFileExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new PPTXValidationError(
      `File not found: ${filePath}`,
      'FILE_NOT_FOUND'
    );
  }
}

/**
 * Check file size
 */
async function checkFileSize(
  size: number,
  maxSize: number,
  result: ValidationResult
): Promise<void> {
  if (size === 0) {
    result.errors.push({
      code: 'EMPTY_FILE',
      message: 'PPTX file is empty',
      severity: 'critical',
      context: { size },
    });
    return;
  }

  if (size > maxSize) {
    result.errors.push({
      code: 'FILE_TOO_LARGE',
      message: `PPTX file size (${formatBytes(size)}) exceeds maximum allowed size (${formatBytes(maxSize)})`,
      severity: 'critical',
      context: { size, maxSize },
    });
    return;
  }

  // Warning for very large files
  if (size > maxSize * 0.8) {
    result.warnings.push({
      code: 'LARGE_FILE',
      message: `PPTX file is very large (${formatBytes(size)}), conversion may take longer`,
      context: { size },
    });
  }
}

/**
 * Check file signature
 */
async function checkFileSignature(
  filePath: string,
  result: ValidationResult
): Promise<void> {
  try {
    const fd = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(4);
    await fd.read(buffer, 0, 4, 0);
    await fd.close();

    if (!buffer.subarray(0, 4).equals(PPTX_SIGNATURE)) {
      result.errors.push({
        code: 'INVALID_SIGNATURE',
        message: 'File does not have a valid PPTX/ZIP signature',
        severity: 'critical',
        context: { signature: buffer.toString('hex') },
      });
      result.metadata.isValidZip = false;
    } else {
      result.metadata.isValidZip = true;
    }
  } catch (error) {
    result.errors.push({
      code: 'SIGNATURE_CHECK_FAILED',
      message: `Failed to check file signature: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'error',
      context: { error },
    });
  }
}

/**
 * Check ZIP structure
 */
async function checkZipStructure(
  filePath: string,
  result: ValidationResult,
  ignoreEncryption: boolean = false
): Promise<void> {
  try {
    // This is a basic check - full ZIP validation is done during extraction
    // We just verify that the file can be opened as a ZIP

    // Import yauzl dynamically to avoid issues if not installed
    const yauzl = await import('yauzl');

    await new Promise<void>((resolve, reject) => {
      yauzl.open(
        filePath,
        {
          strictFileNames: false,
          validateEntrySizes: false,
          lazyEntries: true,
        },
        (err, zipfile) => {
          if (err) {
            result.errors.push({
              code: 'INVALID_ZIP_STRUCTURE',
              message: `Invalid ZIP structure: ${err.message}`,
              severity: 'critical',
              context: { error: err.message },
            });
            result.metadata.isValidZip = false;
            return reject(err);
          }

          if (!zipfile) {
            result.errors.push({
              code: 'ZIP_OPEN_FAILED',
              message: 'Failed to open ZIP file (unknown error)',
              severity: 'critical',
            });
            result.metadata.isValidZip = false;
            return reject(new Error('ZIP open failed'));
          }

          result.metadata.isValidZip = true;

          // Check for required entries
          let entryCount = 0;
          let foundEntries = new Set<string>();

          zipfile.on('entry', (entry) => {
            entryCount++;

            // Check for encryption flag (only warning, not error)
            if (entry.isEncrypted && !ignoreEncryption) {
              result.warnings.push({
                code: 'ENTRY_ENCRYPTION_FLAG',
                message: `ZIP entry has encryption flag set: ${entry.fileName}`,
                context: { entry: entry.fileName },
              });
            }

            // Check for required entries
            for (const required of REQUIRED_PPTX_ENTRIES) {
              if (entry.fileName.startsWith(required) || entry.fileName === required) {
                foundEntries.add(required);
              }
            }

            zipfile.readEntry();
          });

          zipfile.on('end', () => {
            // Check for missing required entries
            for (const required of REQUIRED_PPTX_ENTRIES) {
              if (!foundEntries.has(required)) {
                result.errors.push({
                  code: 'MISSING_REQUIRED_ENTRY',
                  message: `Missing required PPTX entry: ${required}`,
                  severity: 'critical',
                  context: { entry: required },
                });
              }
            }

            if (entryCount === 0) {
              result.errors.push({
                code: 'EMPTY_ZIP',
                message: 'ZIP file contains no entries',
                severity: 'critical',
              });
            }

            zipfile.close();
            resolve();
          });

          zipfile.on('error', (err) => {
            zipfile?.close();
            reject(err);
          });

          zipfile.readEntry();
        }
      );
    });
  } catch (error) {
    // Error already added to result, just log
    logger.debug('ZIP structure check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check for encryption
 */
async function checkForEncryption(
  filePath: string,
  result: ValidationResult,
  ignoreEncryption: boolean = false
): Promise<void> {
  try {
    const yauzl = await import('yauzl');

    await new Promise<void>((resolve, reject) => {
      yauzl.open(
        filePath,
        {
          strictFileNames: false,
          lazyEntries: true,
          // decompress option removed - using default decompression
        },
        (err, zipfile) => {
          if (err || !zipfile) {
            return reject(err || new Error('ZIP open failed'));
          }

          let hasEncrypted = false;
          let hasMacros = false;

          zipfile.on('entry', (entry) => {
            // Check for encryption flag (only if not ignoring)
            if (!ignoreEncryption && entry.isEncrypted) {
              hasEncrypted = true;
            }

            // Check for macros
            if (entry.fileName.includes('vbaProject.bin')) {
              hasMacros = true;
            }

            // Check for EncryptedPackage
            if (!ignoreEncryption && entry.fileName.includes('Encrypted')) {
              hasEncrypted = true;
            }

            zipfile.readEntry();
          });

          zipfile.on('end', () => {
            result.metadata.hasEncrypted = hasEncrypted;
            result.metadata.hasMacros = hasMacros;

            if (hasEncrypted) {
              result.errors.push({
                code: 'FILE_ENCRYPTED',
                message: 'PPTX file is encrypted or password-protected. Please remove the password before converting.',
                severity: 'critical',
                context: { hasEncrypted: true },
              });
              result.metadata.hasPassword = true;
            }

            if (hasMacros) {
              result.warnings.push({
                code: 'FILE_HAS_MACROS',
                message: 'PPTX file contains VBA macros. Macros will be ignored during conversion.',
                context: { hasMacros: true },
              });
            }

            zipfile.close();
            resolve();
          });

          zipfile.on('error', (err) => {
            zipfile?.close();
            reject(err);
          });

          zipfile.readEntry();
        }
      );
    });
  } catch (error) {
    logger.debug('Encryption check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Non-critical, don't add error
  }
}

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Quick validation check for file extension and basic properties
 *
 * @param filename - Filename to check
 * @returns true if filename appears to be a PPTX file
 */
export function isPPTXFilename(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.pptx';
}

/**
 * Validate MIME type
 *
 * @param mimeType - MIME type to validate
 * @param allowedTypes - Allowed MIME types (default: PPTX types)
 * @returns true if MIME type is valid
 */
export function validateMimeType(
  mimeType: string,
  allowedTypes: string[] = DEFAULT_CONTENT_TYPES
): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Create validation error from error code
 *
 * @param code - Error code
 * @param context - Additional context
 * @returns ValidationError
 */
export function createValidationError(
  code: string,
  context?: Record<string, any>
): ValidationError {
  const messages: Record<string, string> = {
    FILE_NOT_FOUND: 'PPTX file not found',
    EMPTY_FILE: 'PPTX file is empty',
    FILE_TOO_LARGE: 'PPTX file exceeds maximum allowed size',
    INVALID_SIGNATURE: 'Invalid PPTX file signature',
    INVALID_ZIP_STRUCTURE: 'Invalid ZIP file structure',
    MISSING_REQUIRED_ENTRY: 'Missing required PPTX structure',
    FILE_ENCRYPTED: 'PPTX file is password-protected',
    ZIP_OPEN_FAILED: 'Failed to open ZIP file',
    EMPTY_ZIP: 'ZIP file contains no entries',
  };

  return {
    code,
    message: messages[code] || `Unknown error: ${code}`,
    severity: 'critical',
    context,
  };
}

/**
 * Create validation warning from warning code
 *
 * @param code - Warning code
 * @param context - Additional context
 * @returns ValidationWarning
 */
export function createValidationWarning(
  code: string,
  context?: Record<string, any>
): ValidationWarning {
  const messages: Record<string, string> = {
    LARGE_FILE: 'PPTX file is very large, conversion may take longer',
    FILE_HAS_MACROS: 'PPTX contains macros (will be ignored)',
    EXTERNAL_MEDIA: 'PPTX contains externally linked media files',
    UNSUPPORTED_FEATURE: 'PPTX contains unsupported features',
  };

  return {
    code,
    message: messages[code] || `Unknown warning: ${code}`,
    context,
  };
}

/**
 * Validate PPTX file buffer in memory (useful for uploaded files)
 *
 * @param buffer - File buffer
 * @param filename - Original filename
 * @param options - Validation options
 * @returns Promise<ValidationResult>
 */
export async function validatePPTXBuffer(
  buffer: Buffer,
  filename: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    metadata: {
      filename,
      size: buffer.length,
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      hasEncrypted: false,
      hasMacros: false,
      hasPassword: false,
      isValidZip: false,
    },
  };

  logger.debug('Validating PPTX buffer', {
    filename,
    size: buffer.length,
  });

  // Check buffer size
  if (buffer.length === 0) {
    result.errors.push({
      code: 'EMPTY_FILE',
      message: 'PPTX file is empty',
      severity: 'critical',
    });
    result.valid = false;
    return result;
  }

  // Check max size
  if (opts.maxSize && buffer.length > opts.maxSize) {
    result.errors.push({
      code: 'FILE_TOO_LARGE',
      message: `PPTX file size (${formatBytes(buffer.length)}) exceeds maximum allowed size (${formatBytes(opts.maxSize)})`,
      severity: 'critical',
      context: { size: buffer.length, maxSize: opts.maxSize },
    });
    result.valid = false;
  }

  // Check file signature
  if (opts.checkSignature && buffer.length >= 4) {
    if (!buffer.subarray(0, 4).equals(PPTX_SIGNATURE)) {
      result.errors.push({
        code: 'INVALID_SIGNATURE',
        message: 'File does not have a valid PPTX/ZIP signature',
        severity: 'critical',
        context: { signature: buffer.subarray(0, 4).toString('hex') },
      });
      result.valid = false;
      result.metadata.isValidZip = false;
    } else {
      result.metadata.isValidZip = true;
    }
  }

  // Note: Full ZIP structure validation requires the file to be saved to disk
  // or use a streaming ZIP parser that works with buffers

  return result;
}
