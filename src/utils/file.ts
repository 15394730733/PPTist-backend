import { promises as fs } from 'fs';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import logger from './logger.js';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a unique filename
 */
export function generateFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const basename = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${basename}-${timestamp}-${random}${ext}`;
}

/**
 * Ensure a directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    logger.debug({ dirPath }, 'Created directory');
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string): Promise<{
  size: number;
  created: Date;
  modified: Date;
}> {
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
  };
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    logger.debug({ filePath }, 'Deleted file');
  } catch (error) {
    logger.warn({ filePath, error }, 'Failed to delete file');
  }
}

/**
 * Move a file
 */
export async function moveFile(source: string, destination: string): Promise<void> {
  await ensureDir(path.dirname(destination));
  await fs.rename(source, destination);
  logger.debug({ source, destination }, 'Moved file');
}

/**
 * Copy a file
 */
export async function copyFile(source: string, destination: string): Promise<void> {
  await ensureDir(path.dirname(destination));
  await fs.copyFile(source, destination);
  logger.debug({ source, destination }, 'Copied file');
}

/**
 * Calculate file hash
 */
export async function calculateHash(
  filePath: string,
  algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Read file as buffer
 */
export async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}

/**
 * Write buffer to file
 */
export async function writeBufferToFile(
  filePath: string,
  buffer: Buffer
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, buffer);
  logger.debug({ filePath, size: buffer.length }, 'Wrote buffer to file');
}

/**
 * Stream file to destination
 */
export async function streamFile(source: string, destination: string): Promise<void> {
  await ensureDir(path.dirname(destination));

  const sourceStream = createReadStream(source);
  const destStream = createWriteStream(destination);

  await pipeline(sourceStream, destStream);

  logger.debug({ source, destination }, 'Streamed file');
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Clean up old files in a directory
 */
export async function cleanupOldFiles(
  dirPath: string,
  maxAgeMs: number
): Promise<number> {
  try {
    const files = await fs.readdir(dirPath);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);

      if (now - stats.mtimeMs > maxAgeMs) {
        await deleteFile(filePath);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info({ dirPath, deletedCount }, 'Cleaned up old files');
    }

    return deletedCount;
  } catch (error) {
    logger.error({ dirPath, error }, 'Failed to cleanup old files');
    return 0;
  }
}

export default {
  generateId,
  generateFilename,
  ensureDir,
  getFileStats,
  deleteFile,
  moveFile,
  copyFile,
  calculateHash,
  readFileAsBuffer,
  writeBufferToFile,
  streamFile,
  fileExists,
  formatBytes,
  cleanupOldFiles,
};
