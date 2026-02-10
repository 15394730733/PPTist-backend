/**
 * ZIP Helper Utility
 *
 * Simple wrapper around fflate for creating ZIP files.
 * Used primarily in tests for creating mock PPTX files.
 *
 * @module utils/zip-helper
 */

import { zipSync } from 'fflate';

/**
 * ZIP helper interface
 */
export interface ZipHelper {
  /**
   * Add a file to the ZIP
   * @param path File path within the ZIP
   * @param content File content (string or Buffer)
   */
  addFile(path: string, content: string | Buffer): void;

  /**
   * Generate the ZIP as a Buffer
   * @returns ZIP file as Buffer
   */
  generate(): Buffer;
}

/**
 * ZIP helper implementation
 */
class ZipHelperImpl implements ZipHelper {
  private files: Map<string, Uint8Array> = new Map();

  /**
   * Add a file to the ZIP
   */
  addFile(path: string, content: string | Buffer): void {
    const uint8Array =
      typeof content === 'string'
        ? new TextEncoder().encode(content)
        : new Uint8Array(content);

    this.files.set(path, uint8Array);
  }

  /**
   * Generate the ZIP as a Buffer
   */
  generate(): Buffer {
    const files: Record<string, Uint8Array> = {};

    for (const [path, content] of this.files.entries()) {
      files[path] = content;
    }

    const zipped = zipSync(files);
    return Buffer.from(zipped);
  }
}

/**
 * Create a new ZIP helper instance
 *
 * @example
 * ```typescript
 * const zip = createZip();
 * zip.addFile('test.txt', 'Hello, World!');
 * zip.addFile('data.json', JSON.stringify({ foo: 'bar' }));
 * const buffer = zip.generate();
 * ```
 */
export function createZip(): ZipHelper {
  return new ZipHelperImpl();
}

/**
 * Create a ZIP from a file map
 *
 * @param files Map of file paths to contents
 * @returns ZIP file as Buffer
 *
 * @example
 * ```typescript
 * const buffer = createZipFromFiles({
 *   'file1.txt': 'Content 1',
 *   'file2.txt': 'Content 2',
 * });
 * ```
 */
export function createZipFromFiles(
  files: Record<string, string | Buffer>
): Buffer {
  const zip = createZip();

  for (const [path, content] of Object.entries(files)) {
    zip.addFile(path, content);
  }

  return zip.generate();
}

/**
 * Synchronously create a ZIP using fflate directly
 *
 * @param files Map of file paths to Uint8Array contents
 * @returns Zipped data as Uint8Array
 *
 * @example
 * ```typescript
 * const zipped = zipSyncDirect({
 *   'file.txt': new TextEncoder().encode('Hello'),
 * });
 * const buffer = Buffer.from(zipped);
 * ```
 */
export function zipSyncDirect(
  files: Record<string, Uint8Array>
): Uint8Array {
  return zipSync(files);
}
