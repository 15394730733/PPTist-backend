/**
 * External Media Handler
 *
 * Handles external media resources referenced in PPTX files.
 * Downloads and processes external images, videos, etc.
 *
 * @module services/conversion/handlers/external-media
 */

import { logger } from '../../../utils/logger';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

/**
 * External media type
 */
export enum ExternalMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other',
}

/**
 * External media reference
 */
export interface ExternalMediaReference {
  /**
   * Original URL
   */
  url: string;

  /**
   * Media type
   */
  type: ExternalMediaType;

  /**
   * Element ID
   */
  elementId: string;

  /**
   * Relationship ID (r:id)
   */
  relationshipId?: string;

  /**
   * Expected content type
   */
  contentType?: string;

  /**
   * Whether media is required for conversion
   */
  required: boolean;
}

/**
 * Download result
 */
export interface DownloadResult {
  /**
   * Whether download succeeded
   */
  success: boolean;

  /**
   * Local file path
   */
  localPath?: string;

  /**
   * Downloaded content type
   */
  contentType?: string;

  /**
   * File size in bytes
   */
  size?: number;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Whether to use placeholder instead
   */
  usePlaceholder?: boolean;
}

/**
 * External media handler options
 */
export interface ExternalMediaHandlerOptions {
  /**
   * Directory to store downloaded media
   */
  mediaDir?: string;

  /**
   * Maximum file size to download (bytes)
   */
  maxFileSize?: number;

  /**
   * Download timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether to follow redirects
   */
  followRedirects?: boolean;

  /**
   * Maximum number of redirects to follow
   */
  maxRedirects?: number;

  /**
   * User agent for HTTP requests
   */
  userAgent?: string;

  /**
   * Whether to download external media
   */
  downloadExternal?: boolean;

  /**
   * Whether to use placeholders on failure
   */
  usePlaceholders?: boolean;
}

/**
 * External media handler class
 */
export class ExternalMediaHandler {
  private mediaDir: string;
  private maxFileSize: number;
  private timeout: number;
  private followRedirects: boolean;
  private maxRedirects: number;
  private userAgent: string;
  private downloadExternal: boolean;
  private usePlaceholders: boolean;

  // Download statistics
  private stats = {
    total: 0,
    downloaded: 0,
    failed: 0,
    placeholder: 0,
    totalBytes: 0,
  };

  constructor(options: ExternalMediaHandlerOptions = {}) {
    this.mediaDir = options.mediaDir || '/tmp/pptx-media/';
    this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB
    this.timeout = options.timeout || 30000; // 30 seconds
    this.followRedirects = options.followRedirects !== false; // Default true
    this.maxRedirects = options.maxRedirects || 5;
    this.userAgent = options.userAgent || 'PPTX-Converter/1.0';
    this.downloadExternal = options.downloadExternal !== false; // Default true
    this.usePlaceholders = options.usePlaceholders !== false; // Default true

    // Initialize media directory
    this.initializeDirectory();
  }

  /**
   * Initialize media directory
   */
  private async initializeDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.mediaDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to initialize external media directory', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Detect external media references
   *
   * @param elements - Parsed elements
   * @returns Array of external media references
   */
  detectExternalMedia(elements: any[]): ExternalMediaReference[] {
    const externalMedia: ExternalMediaReference[] = [];

    for (const element of elements) {
      // Check for external images
      if (element.type === 'image' && element.source?.url) {
        const url = element.source.url;

        // Check if it's an external URL (not relative path)
        if (this.isExternalUrl(url)) {
          externalMedia.push({
            url,
            type: ExternalMediaType.IMAGE,
            elementId: element.id,
            relationshipId: element.relationshipId,
            contentType: element.source.contentType,
            required: true, // Images are typically required
          });

          logger.debug('Detected external image', {
            elementId: element.id,
            url: this.sanitizeUrl(url),
          });
        }
      }

      // Check for external videos
      if (element.type === 'video' && element.source?.url) {
        const url = element.source.url;

        if (this.isExternalUrl(url)) {
          externalMedia.push({
            url,
            type: ExternalMediaType.VIDEO,
            elementId: element.id,
            relationshipId: element.relationshipId,
            contentType: element.source.contentType,
            required: false, // Videos are often optional
          });

          logger.debug('Detected external video', {
            elementId: element.id,
            url: this.sanitizeUrl(url),
          });
        }
      }

      // Check for external audio
      if (element.type === 'audio' && element.source?.url) {
        const url = element.source.url;

        if (this.isExternalUrl(url)) {
          externalMedia.push({
            url,
            type: ExternalMediaType.AUDIO,
            elementId: element.id,
            relationshipId: element.relationshipId,
            contentType: element.source.contentType,
            required: false, // Audio is often optional
          });

          logger.debug('Detected external audio', {
            elementId: element.id,
            url: this.sanitizeUrl(url),
          });
        }
      }
    }

    if (externalMedia.length > 0) {
      logger.info('Detected external media references', {
        count: externalMedia.length,
        types: externalMedia.map((m) => m.type),
      });
    }

    return externalMedia;
  }

  /**
   * Download external media
   *
   * @param mediaRef - External media reference
   * @param taskId - Task ID for file naming
   * @returns Download result
   */
  async downloadMedia(
    mediaRef: ExternalMediaReference,
    taskId: string
  ): Promise<DownloadResult> {
    this.stats.total++;

    // Check if external media download is enabled
    if (!this.downloadExternal) {
      logger.debug('External media download disabled, skipping', {
        url: this.sanitizeUrl(mediaRef.url),
      });

      return {
        success: false,
        usePlaceholder: this.usePlaceholders,
        error: 'External media download disabled',
      };
    }

    try {
      // Validate URL
      const url = new URL(mediaRef.url);

      // Check protocol
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error(`Unsupported protocol: ${url.protocol}`);
      }

      // Generate local filename
      const ext = this.getExtensionFromUrl(mediaRef.url, mediaRef.contentType);
      const localFilename = `${taskId}-${mediaRef.elementId}${ext}`;
      const localPath = path.join(this.mediaDir, localFilename);

      // Download file
      logger.info('Downloading external media', {
        type: mediaRef.type,
        url: this.sanitizeUrl(mediaRef.url),
        localPath,
      });

      const content = await this.downloadFile(mediaRef.url);

      // Check file size
      if (content.length > this.maxFileSize) {
        throw new Error(
          `File size ${content.length} bytes exceeds maximum ${this.maxFileSize} bytes`
        );
      }

      // Write to disk
      await fs.writeFile(localPath, content);

      const contentType = this.detectContentType(content, mediaRef.contentType);

      this.stats.downloaded++;
      this.stats.totalBytes += content.length;

      logger.info('External media downloaded successfully', {
        type: mediaRef.type,
        url: this.sanitizeUrl(mediaRef.url),
        localPath,
        size: content.length,
        contentType,
      });

      return {
        success: true,
        localPath,
        contentType,
        size: content.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.stats.failed++;

      logger.error('Failed to download external media', {
        type: mediaRef.type,
        url: this.sanitizeUrl(mediaRef.url),
        error: errorMessage,
      });

      // Return with placeholder flag
      return {
        success: false,
        usePlaceholder: this.usePlaceholders && mediaRef.required,
        error: errorMessage,
      };
    }
  }

  /**
   * Process all external media for a task
   *
   * @param elements - Parsed elements
   * @param taskId - Task ID
   * @returns Map of element ID to download result
   */
  async processExternalMedia(
    elements: any[],
    taskId: string
  ): Promise<Map<string, DownloadResult>> {
    const results = new Map<string, DownloadResult>();

    // Detect external media
    const externalMedia = this.detectExternalMedia(elements);

    if (externalMedia.length === 0) {
      logger.info('No external media to process', { taskId });
      return results;
    }

    // Download each external media
    for (const mediaRef of externalMedia) {
      const result = await this.downloadMedia(mediaRef, taskId);
      results.set(mediaRef.elementId, result);

      // If download failed and media is required, add warning
      if (!result.success && mediaRef.required) {
        if (result.usePlaceholder) {
          this.stats.placeholder++;
          logger.warn('Using placeholder for failed external media', {
            elementId: mediaRef.elementId,
            url: this.sanitizeUrl(mediaRef.url),
            error: result.error,
          });
        }
      }
    }

    logger.info('External media processing complete', {
      taskId,
      total: this.stats.total,
      downloaded: this.stats.downloaded,
      failed: this.stats.failed,
      placeholder: this.stats.placeholder,
      totalBytes: this.stats.totalBytes,
    });

    return results;
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const requestOptions = {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: this.timeout,
      };

      const req = protocol.request(url, requestOptions, (response) => {
        // Check status code
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        // Check content length
        const contentLength = parseInt(response.headers['content-length'] || '0', 10);
        if (contentLength > this.maxFileSize) {
          reject(new Error(`Content length ${contentLength} exceeds maximum ${this.maxFileSize}`));
          return;
        }

        // Download response
        const chunks: Buffer[] = [];
        let downloadedBytes = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;

          // Check size limit during download
          if (downloadedBytes > this.maxFileSize) {
            req.destroy();
            reject(new Error(`Download exceeded maximum file size ${this.maxFileSize}`));
            return;
          }

          chunks.push(chunk);
        });

        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        response.on('error', (error) => {
          reject(error);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Download timeout'));
      });

      req.end();
    });
  }

  /**
   * Check if URL is external
   */
  private isExternalUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Get file extension from URL and content type
   */
  private getExtensionFromUrl(url: string, contentType?: string): string {
    // Try to get from URL
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;

      if (pathname) {
        const ext = path.extname(pathname);
        if (ext) {
          return ext;
        }
      }
    } catch {
      // Ignore URL parsing errors
    }

    // Try to get from content type
    if (contentType) {
      const extMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
      };

      return extMap[contentType] || '';
    }

    // Default no extension
    return '';
  }

  /**
   * Detect content type from buffer
   */
  private detectContentType(buffer: Buffer, declaredContentType?: string): string {
    // Try to detect from magic bytes
    if (buffer.length >= 4) {
      // PNG
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return 'image/png';
      }

      // JPEG
      if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        return 'image/jpeg';
      }

      // GIF
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
        return 'image/gif';
      }

      // WebP
      if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
        return 'image/webp';
      }
    }

    // Fall back to declared content type
    return declaredContentType || 'application/octet-stream';
  }

  /**
   * Sanitize URL for logging
   */
  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove query parameters and hash
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      // Return first 100 chars if URL parsing fails
      return url.substring(0, 100) + (url.length > 100 ? '...' : '');
    }
  }

  /**
   * Get download statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      downloaded: 0,
      failed: 0,
      placeholder: 0,
      totalBytes: 0,
    };
  }
}

/**
 * Create external media handler
 */
export function createExternalMediaHandler(
  options?: ExternalMediaHandlerOptions
): ExternalMediaHandler {
  return new ExternalMediaHandler(options);
}

export default {
  ExternalMediaHandler,
  createExternalMediaHandler,
  ExternalMediaType,
};
