/**
 * Media Extraction Service
 *
 * Extracts and processes media files (images, videos, audio) from PPTX files.
 * Handles base64 encoding for small files and file extraction for large files.
 *
 * @module services/pptx/extract-media
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';
import { PPTXValidationError } from '../../utils/errors';
import type { ExtractedPPTX } from './unzip.js';

/**
 * Media file information
 */
export interface MediaFile {
  filename: string;
  contentType: string;
  size: number;
  data?: Buffer; // For small files (< 1MB)
  path?: string; // For large files (>= 1MB)
  isEmbedded: boolean;
  base64?: string; // Base64 encoded data
}

/**
 * Media processing options
 */
export interface MediaExtractionOptions {
  /**
   * Threshold for base64 encoding in bytes (default: 1MB)
   */
  base64Threshold?: number;

  /**
   * Output directory for extracted media files (default: /tmp/pptx-media/)
   */
  outputDir?: string;

  /**
   * Whether to keep extracted files after conversion (default: false)
   */
  keepFiles?: boolean;

  /**
   * Task ID for creating task-specific directories
   */
  taskId?: string;
}

/**
 * Default media extraction options
 */
const DEFAULT_OPTIONS: Required<Omit<MediaExtractionOptions, 'taskId'>> = {
  base64Threshold: 1024 * 1024, // 1MB
  outputDir: '/tmp/pptx-media/',
  keepFiles: false,
};

/**
 * Media content type mappings
 */
const MEDIA_CONTENT_TYPES: Record<string, string> = {
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.emf': 'image/x-emf',
  '.wmf': 'image/x-wmf',
  // Videos
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.mkv': 'video/x-matroska',
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.wma': 'audio/x-ms-wma',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
};

/**
 * Extract media files from PPTX
 *
 * @param extracted - Extracted PPTX structure
 * @param options - Media extraction options
 * @returns Promise<Map<string, MediaFile>> - Map of filename to media file info
 */
export async function extractMediaFiles(
  extracted: ExtractedPPTX,
  options: MediaExtractionOptions = {}
): Promise<Map<string, MediaFile>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const mediaFiles = new Map<string, MediaFile>();

  logger.debug('Starting media extraction', {
    totalMedia: extracted.metadata.totalMedia,
    base64Threshold: opts.base64Threshold,
    outputDir: opts.outputDir,
  });

  // Create output directory if specified
  let outputDir = opts.outputDir;
  if (opts.taskId) {
    outputDir = path.join(opts.outputDir, opts.taskId);
    await fs.mkdir(outputDir, { recursive: true });
  }

  // Process each media file
  for (const [filename, buffer] of extracted.media.entries()) {
    try {
      const processOpts: Required<MediaExtractionOptions> = {
        ...opts,
        taskId: opts.taskId || 'default',
      };
      const mediaFile = await processMediaFile(filename, buffer, outputDir, processOpts);
      mediaFiles.set(filename, mediaFile);

      logger.debug(`Extracted media file ${filename}`, {
        size: mediaFile.size,
        contentType: mediaFile.contentType,
        isBase64: !!mediaFile.base64,
        hasPath: !!mediaFile.path,
      });
    } catch (error) {
      logger.error(`Failed to process media file ${filename}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue processing other files
    }
  }

  logger.info('Media extraction completed', {
    totalProcessed: mediaFiles.size,
    totalFailed: extracted.metadata.totalMedia - mediaFiles.size,
    base64Count: Array.from(mediaFiles.values()).filter((m) => m.isEmbedded).length,
    fileCount: Array.from(mediaFiles.values()).filter((m) => !m.isEmbedded).length,
  });

  return mediaFiles;
}

/**
 * Process individual media file
 */
async function processMediaFile(
  filename: string,
  buffer: Buffer,
  outputDir: string,
  options: Required<MediaExtractionOptions>
): Promise<MediaFile> {
  const ext = path.extname(filename).toLowerCase();
  const contentType = MEDIA_CONTENT_TYPES[ext] || 'application/octet-stream';
  const size = buffer.length;

  const mediaFile: MediaFile = {
    filename,
    contentType,
    size,
    isEmbedded: size < options.base64Threshold,
  };

  // Small files: encode as base64
  if (size < options.base64Threshold) {
    mediaFile.data = buffer;
    mediaFile.base64 = buffer.toString('base64');
    mediaFile.isEmbedded = true;
  } else {
    // Large files: save to disk
    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, buffer);
    mediaFile.path = outputPath;
    mediaFile.isEmbedded = false;
  }

  return mediaFile;
}

/**
 * Get media file content type from filename
 *
 * @param filename - Media filename
 * @returns Content type
 */
export function getMediaContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MEDIA_CONTENT_TYPES[ext] || 'application/octet-stream';
}

/**
 * Check if media file should be embedded as base64
 *
 * @param size - File size in bytes
 * @param threshold - Base64 threshold (default: 1MB)
 * @returns true if file should be embedded
 */
export function shouldEmbedAsBase64(
  size: number,
  threshold: number = DEFAULT_OPTIONS.base64Threshold
): boolean {
  return size < threshold;
}

/**
 * Calculate media file statistics
 *
 * @param mediaFiles - Map of media files
 * @returns Media statistics
 */
export function calculateMediaStats(mediaFiles: Map<string, MediaFile>): MediaStats {
  const stats: MediaStats = {
    totalFiles: mediaFiles.size,
    totalSize: 0,
    embeddedCount: 0,
    externalCount: 0,
    byType: {} as Record<string, number>,
    byExtension: {} as Record<string, number>,
  };

  for (const mediaFile of mediaFiles.values()) {
    stats.totalSize += mediaFile.size;

    if (mediaFile.isEmbedded) {
      stats.embeddedCount++;
    } else {
      stats.externalCount++;
    }

    // Count by content type
    const type = mediaFile.contentType;
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // Count by extension
    const ext = path.extname(mediaFile.filename).toLowerCase();
    stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
  }

  return stats;
}

/**
 * Media statistics
 */
export interface MediaStats {
  totalFiles: number;
  totalSize: number;
  embeddedCount: number;
  externalCount: number;
  byType: Record<string, number>;
  byExtension: Record<string, number>;
}

/**
 * Clean up extracted media files
 *
 * @param mediaFiles - Map of media files
 * @param options - Cleanup options
 */
export async function cleanupMediaFiles(
  mediaFiles: Map<string, MediaFile>,
  options: MediaExtractionOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let cleanedCount = 0;

  for (const mediaFile of mediaFiles.values()) {
    if (!mediaFile.isEmbedded && mediaFile.path) {
      try {
        await fs.unlink(mediaFile.path);
        cleanedCount++;
      } catch (error) {
        logger.error(`Failed to delete media file ${mediaFile.path}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // Clean up task directory if empty
  if (opts.taskId && opts.outputDir) {
    const taskDir = path.join(opts.outputDir, opts.taskId);
    try {
      const files = await fs.readdir(taskDir);
      if (files.length === 0) {
        await fs.rmdir(taskDir);
        logger.debug(`Removed empty media directory ${taskDir}`);
      }
    } catch (error) {
      // Directory might not exist or already removed
      logger.debug(`Could not clean up directory ${taskDir}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Media files cleanup completed', {
    cleanedCount,
    remainingCount: mediaFiles.size - cleanedCount,
  });
}

/**
 * Validate media file
 *
 * @param buffer - Media file buffer
 * @param expectedType - Expected content type
 * @returns true if valid
 */
export function validateMediaFile(
  buffer: Buffer,
  expectedType?: string
): { valid: boolean; error?: string } {
  // Check if buffer is not empty
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Media file is empty' };
  }

  // Check file signature (magic bytes)
  const signature = detectFileSignature(buffer);

  if (expectedType) {
    const expectedSignature = getSignatureForContentType(expectedType);
    if (expectedSignature && signature !== expectedSignature) {
      return {
        valid: false,
        error: `File signature mismatch: expected ${expectedType}, detected ${signature}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Detect file signature from buffer
 */
function detectFileSignature(buffer: Buffer): string {
  if (buffer.length < 4) return 'unknown';

  const header = buffer.subarray(0, 4).toString('hex').toLowerCase();

  // PNG: 89 50 4E 47
  if (header.startsWith('89504e47')) return 'image/png';

  // JPEG: FF D8 FF
  if (header.startsWith('ffd8ff')) return 'image/jpeg';

  // GIF: 47 49 46 38
  if (header.startsWith('47494638')) return 'image/gif';

  // BMP: 42 4D
  if (header.startsWith('424d')) return 'image/bmp';

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (header.startsWith('52494646') && buffer.length > 11) {
    const webpSignature = buffer.subarray(8, 12).toString('ascii');
    if (webpSignature === 'WEBP') return 'image/webp';
  }

  // MP4: Check for ftyp or mdat
  if (buffer.length > 11) {
    const ftyp = buffer.subarray(4, 8).toString('ascii');
    if (ftyp === 'ftyp') return 'video/mp4';
  }

  // MP3: ID3v2 tag or frame sync
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3') return 'audio/mpeg';
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return 'audio/mpeg';

  // WAV: RIFF
  if (header.startsWith('52494646') && buffer.length > 11) {
    const wave = buffer.subarray(8, 12).toString('ascii');
    if (wave === 'WAVE') return 'audio/wav';
  }

  return 'unknown';
}

/**
 * Get expected file signature for content type
 */
function getSignatureForContentType(contentType: string): string | null {
  const signatures: Record<string, string> = {
    'image/png': 'image/png',
    'image/jpeg': 'image/jpeg',
    'image/gif': 'image/gif',
    'image/bmp': 'image/bmp',
    'image/webp': 'image/webp',
    'video/mp4': 'video/mp4',
    'audio/mpeg': 'audio/mpeg',
    'audio/wav': 'audio/wav',
  };

  return signatures[contentType] || null;
}

/**
 * Resolve media reference from relationships
 *
 * @param relId - Relationship ID
 * @param relationships - Relationships map
 * @returns Media filename or undefined
 */
export function resolveMediaReference(
  relId: string,
  relationships: Map<number, string>
): string | undefined {
  if (!relId) return undefined;

  // Parse relationships XML to find media reference
  // This is a simplified implementation
  // In production, you would parse the relationships XML properly

  for (const [slideIndex, relXml] of relationships.entries()) {
    if (relXml.includes(relId)) {
      // Extract target from relationship
      const match = relXml.match(/Target="([^"]+)"/);
      if (match && match[1]) {
        // Extract filename from target path
        return path.basename(match[1]);
      }
    }
  }

  return undefined;
}
