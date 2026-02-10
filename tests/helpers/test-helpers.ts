/**
 * Test Helpers
 *
 * Utility functions for integration tests.
 *
 * @module tests/helpers/test-helpers
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as http from 'http';
import { randomUUID } from 'crypto';

/**
 * Test app options
 */
export interface TestAppOptions {
  port?: number;
  host?: string;
}

/**
 * Default test options
 */
const DEFAULT_TEST_OPTIONS = {
  port: 3001, // 使用不同的端口避免与开发环境冲突
  host: '127.0.0.1',
};

/**
 * Get test app URL
 */
export function getTestUrl(options: TestAppOptions = {}): string {
  const opts = { ...DEFAULT_TEST_OPTIONS, ...options };
  return `http://${opts.host}:${opts.port}`;
}

/**
 * Make HTTP request
 */
export async function httpRequest(
  method: string,
  url: string,
  options: {
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
  } = {}
): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: any;
}> {
  const { headers = {}, body, timeout = 30000 } = options;

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqBody = body ? JSON.stringify(body) : undefined;

    const req = http.request(
      {
        method,
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        headers: {
          ...headers,
          ...(reqBody ? { 'Content-Type': 'application/json' } : {}),
        },
        timeout,
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsedBody = data ? JSON.parse(data) : data;
            resolve({
              statusCode: res.statusCode || 200,
              headers: res.headers,
              body: parsedBody,
            });
          } catch {
            resolve({
              statusCode: res.statusCode || 200,
              headers: res.headers,
              body: data,
            });
          }
        });

        res.on('error', (error) => {
          reject(error);
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (reqBody) {
      req.write(reqBody);
    }

    req.end();
  });
}

/**
 * Wait for a condition
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
  } = {}
): Promise<void> {
  const { timeout = 30000, interval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a minimal PPTX file (ZIP structure)
 */
export async function createMinimalPPTX(filename: string): Promise<Buffer> {
  const { createZip } = await import('../../src/utils/zip-helper.js');

  const zip = createZip();

  // 添加基本 PPTX 结构
  zip.addFile('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  zip.addFile('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');

  return zip.generate();
}

/**
 * Create test PPTX file
 */
export async function createTestPPTX(options: {
  filename: string;
  slideCount?: number;
  title?: string;
}): Promise<Buffer> {
  // 简化实现：创建最小 PPTX
  return createMinimalPPTX(options.filename);
}

/**
 * Cleanup test files
 */
export async function cleanupTestFiles(pattern: string): Promise<void> {
  try {
    // 简化实现：仅记录日志
    console.log(`Would cleanup files matching: ${pattern}`);
  } catch (error) {
    console.error('Failed to cleanup test files:', error);
  }
}

/**
 * Generate random task ID
 */
export function generateTaskId(): string {
  return randomUUID();
}

/**
 * Parse multipart form data
 */
export function createMultipartBoundary(): string {
  return `----WebKitFormBoundary${randomUUID().replace(/-/g, '')}`;
}

/**
 * Create multipart form data
 */
export function createMultipartFormData(
  files: Array<{ name: string; data: Buffer; filename: string }>
): {
  boundary: string;
  contentType: string;
  body: Buffer;
} {
  const boundary = createMultipartBoundary();
  const parts: Buffer[] = [];

  for (const file of files) {
    let part = '';
    part += `--${boundary}\r\n`;
    part += `Content-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\n`;
    part += 'Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n';
    part += '\r\n';

    parts.push(Buffer.from(part));
    parts.push(file.data);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    boundary,
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat(parts),
  };
}

/**
 * Assert task status
 */
export function assertTaskStatus(
  task: any,
  expectedStatus: string
): void {
  if (task.status !== expectedStatus) {
    throw new Error(
      `Expected task status "${expectedStatus}", got "${task.status}"`
    );
  }
}

/**
 * Assert success response
 */
export function assertSuccessResponse(response: any): void {
  if (response.success !== true) {
    throw new Error(`Expected success response, got: ${JSON.stringify(response)}`);
  }
}

/**
 * Assert error response
 */
export function assertErrorResponse(
  response: any,
  expectedErrorCode?: string
): void {
  if (response.success !== false) {
    throw new Error(`Expected error response, got: ${JSON.stringify(response)}`);
  }

  if (expectedErrorCode && response.code !== expectedErrorCode) {
    throw new Error(
      `Expected error code "${expectedErrorCode}", got "${response.code}"`
    );
  }
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000 } = options;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      await sleep(delay);
    }
  }

  throw new Error('Retry failed');
}

/**
 * Convert Buffer to readable stream
 */
export function bufferToStream(buffer: Buffer): NodeJS.ReadableStream {
  const { Readable } = require('stream');
  return Readable.from(buffer);
}
