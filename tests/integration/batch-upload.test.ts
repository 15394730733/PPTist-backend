/**
 * Batch Upload Integration Tests
 *
 * Tests for batch file upload and conversion.
 *
 * @module tests/integration/batch-upload
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  httpRequest,
  createTestPPTX,
  createMultipartFormData,
  assertSuccessResponse,
  assertErrorResponse,
  sleep,
} from '../helpers/test-helpers.js';

const TEST_URL = process.env.TEST_URL || 'http://127.0.0.1:3001';

describe('Batch Upload API - Integration Tests', () => {
  // 测试用的 PPTX 文件
  let validPPTX1: Buffer;
  let validPPTX2: Buffer;
  let validPPTX3: Buffer;
  let invalidDocx: Buffer;

  beforeAll(async () => {
    // 创建测试文件
    validPPTX1 = await createTestPPTX({ filename: 'test1.pptx', slideCount: 1 });
    validPPTX2 = await createTestPPTX({ filename: 'test2.pptx', slideCount: 2 });
    validPPTX3 = await createTestPPTX({ filename: 'test3.pptx', slideCount: 3 });
    invalidDocx = Buffer.from('PK\x03\x04invalid document content');
  });

  describe('POST /api/v1/convert/batch - Success Cases', () => {
    it('should upload multiple valid PPTX files', async () => {
      const { body, contentType } = createMultipartFormData([
        { name: 'files', data: validPPTX1, filename: 'test1.pptx' },
        { name: 'files', data: validPPTX2, filename: 'test2.pptx' },
        { name: 'files', data: validPPTX3, filename: 'test3.pptx' },
      ]);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body,
      });

      expect(response.statusCode).toBe(200);
      assertSuccessResponse(response.body);

      // 验证响应结构
      expect(response.body.data).toHaveProperty('taskIds');
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('message');

      // 验证任务数量
      expect(response.body.data.taskIds).toHaveLength(3);
      expect(response.body.data.tasks).toHaveLength(3);

      // 验证汇总
      expect(response.body.data.summary.total).toBe(3);
      expect(response.body.data.summary.created).toBe(3);
      expect(response.body.data.summary.failed).toBe(0);

      // 验证任务信息
      response.body.data.tasks.forEach((task: any) => {
        expect(task).toHaveProperty('taskId');
        expect(task).toHaveProperty('filename');
        expect(task).toHaveProperty('size');
        expect(task).toHaveProperty('status');
        expect(task.status).toBe('queued');
      });
    });

    it('should handle single file upload (batch endpoint)', async () => {
      const { body, contentType } = createMultipartFormData([
        { name: 'files', data: validPPTX1, filename: 'single.pptx' },
      ]);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.taskIds).toHaveLength(1);
      expect(response.body.data.summary.created).toBe(1);
    });

    it('should return unique task IDs for each file', async () => {
      const { body, contentType } = createMultipartFormData([
        { name: 'files', data: validPPTX1, filename: 'test1.pptx' },
        { name: 'files', data: validPPTX2, filename: 'test2.pptx' },
      ]);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body,
      });

      const taskIds = response.body.data.taskIds;
      const uniqueIds = new Set(taskIds);

      expect(uniqueIds.size).toBe(taskIds.length);
    });
  });

  describe('POST /api/v1/convert/batch - Partial Failure Cases', () => {
    it('should succeed with some invalid files', async () => {
      const { body, contentType } = createMultipartFormData([
        { name: 'files', data: validPPTX1, filename: 'valid1.pptx' },
        { name: 'files', data: invalidDocx, filename: 'invalid.docx' },
        { name: 'files', data: validPPTX2, filename: 'valid2.pptx' },
        { name: 'files', data: invalidDocx, filename: 'another-invalid.docx' },
      ]);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body,
      });

      expect(response.statusCode).toBe(200);
      assertSuccessResponse(response.body);

      // 验证汇总
      expect(response.body.data.summary.total).toBe(4);
      expect(response.body.data.summary.created).toBe(2);
      expect(response.body.data.summary.failed).toBe(2);

      // 验证错误列表
      expect(response.body.data.errors).toBeDefined();
      expect(response.body.data.errors).toHaveLength(2);

      // 验证错误格式
      response.body.data.errors.forEach((error: any) => {
        expect(error).toHaveProperty('filename');
        expect(error).toHaveProperty('error');
        expect(error).toHaveProperty('code');
      });
    });

    it('should include error details for invalid files', async () => {
      const { body, contentType } = createMultipartFormData([
        { name: 'files', data: validPPTX1, filename: 'valid.pptx' },
        { name: 'files', data: invalidDocx, filename: 'invalid.docx' },
      ]);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body,
      });

      const invalidError = response.body.data.errors.find(
        (e: any) => e.filename === 'invalid.docx'
      );

      expect(invalidError).toBeDefined();
      expect(invalidError.code).toBeDefined();
      expect(invalidError.error).toBeTruthy();
    });
  });

  describe('POST /api/v1/convert/batch - Error Cases', () => {
    it('should reject empty file list', async () => {
      const { body, contentType } = createMultipartFormData([]);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body,
      });

      expect(response.statusCode).toBe(400);
      assertErrorResponse(response.body);

      expect(response.body.error).toContain('No files uploaded');
    });

    it('should reject too many files', async () => {
      // 创建 11 个文件（超过限制 10 个）
      const files = Array.from({ length: 11 }, (_, i) => ({
        name: 'files',
        data: validPPTX1,
        filename: `file${i}.pptx`,
      }));

      const { body, contentType } = createMultipartFormData(files);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body,
      });

      expect(response.statusCode).toBe(400);
      assertErrorResponse(response.body, 'TOO_MANY_FILES');

      expect(response.body.error).toContain('Maximum 10 files');
      expect(response.body.limit).toBe(10);
    });

    it('should reject when all files are invalid', async () => {
      const { body, contentType } = createMultipartFormData([
        { name: 'files', data: invalidDocx, filename: 'invalid1.docx' },
        { name: 'files', data: invalidDocx, filename: 'invalid2.docx' },
        { name: 'files', data: invalidDocx, filename: 'invalid3.docx' },
      ]);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body,
      });

      expect(response.statusCode).toBe(400);
      assertErrorResponse(response.body);

      expect(response.body.data.errors).toBeDefined();
      expect(response.body.data.errors).toHaveLength(3);
    });

    it('should handle malformed multipart data', async () => {
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': 'multipart/form-data; boundary=invalid' },
        body: Buffer.from('invalid multipart data'),
      });

      // 应该返回 4xx 或 5xx 错误
      expect([400, 500]).toContain(response.statusCode);
    });
  });

  describe('POST /api/v1/convert/batch - Edge Cases', () => {
    it('should handle maximum allowed files (10)', async () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
        name: 'files',
        data: validPPTX1,
        filename: `file${i}.pptx`,
      }));

      const { body, contentType } = createMultipartFormData(files);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.taskIds).toHaveLength(10);
      expect(response.body.data.summary.created).toBe(10);
    });

    it('should preserve original filenames', async () => {
      const { body, contentType } = createMultipartFormData([
        { name: 'files', data: validPPTX1, filename: 'my-presentation.pptx' },
        { name: 'files', data: validPPTX2, filename: 'another presentation (2).pptx' },
      ]);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body,
      });

      const tasks = response.body.data.tasks;

      expect(tasks[0].filename).toBe('my-presentation.pptx');
      expect(tasks[1].filename).toBe('another presentation (2).pptx');
    });

    it('should include file sizes in response', async () => {
      const { body, contentType } = createMultipartFormData([
        { name: 'files', data: validPPTX1, filename: 'test.pptx' },
      ]);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body,
      });

      const task = response.body.data.tasks[0];

      expect(task.size).toBeGreaterThan(0);
      expect(task.size).toBe(validPPTX1.length);
    });
  });

  describe('POST /api/v1/convert/batch - Concurrent Requests', () => {
    it('should handle multiple concurrent batch uploads', async () => {
      const requests = Array.from({ length: 5 }, async (_, i) => {
        const { body, contentType } = createMultipartFormData([
          { name: 'files', data: validPPTX1, filename: `concurrent${i}.pptx` },
        ]);

        return httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
          headers: { 'Content-Type': contentType },
          body,
        });
      });

      const responses = await Promise.all(requests);

      // 所有请求都应该成功
      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
        assertSuccessResponse(response.body);
      });

      // 验证所有任务 ID 都是唯一的
      const allTaskIds = responses.flatMap((r) => r.body.data.taskIds);
      const uniqueIds = new Set(allTaskIds);

      expect(uniqueIds.size).toBe(allTaskIds.length);
    });
  });
});
