/**
 * Path utilities for cross-platform temp directories
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Get a cross-platform temp directory path
 */
export function getTempDir(subdir: string = ''): string {
  const tmpDir = os.tmpdir();
  return subdir ? path.join(tmpDir, subdir) : tmpDir;
}

/**
 * Get default results directory
 */
export function getDefaultResultsDir(): string {
  return getTempDir('pptx-results');
}

/**
 * Get default media directory
 */
export function getDefaultMediaDir(): string {
  return getTempDir('pptx-media');
}

/**
 * Get default uploads directory
 */
export function getDefaultUploadsDir(): string {
  return getTempDir('pptx-uploads');
}
