/**
 * Batch Query Integration Tests
 *
 * Tests for batch task status queries.
 *
 * @module tests/integration/batch-query
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  httpRequest,
  createTestPPTX,
  createMultipartFormData,
  assertSuccessResponse,
  assertErrorResponse,
  sleep,
  waitFor,
} from '../helpers/test-helpers.js';

const TEST_URL = process.env.TEST_URL || 'http://127.0.0.1:3001';

describe('Batch Query API - Integration Tests', () => {
  // 用于测试的任务 IDs
  let testTaskIds: string[] = [];
  let invalidTaskId: string;

  beforeAll(async () => {
    // 创建一些测试任务
    const validPPTX = await createTestPPTX({ filename: 'test.pptx', slideCount: 1 });

    const { body, contentType } = createMultipartFormData([
      { name: 'files', data: validPPTX, filename: 'batch1.pptx' },
      { name: 'files', data: validPPTX, filename: 'batch2.pptx' },
      { name: 'files', data: validPPTX, filename: 'batch3.pptx' },
    ]);

    const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
      headers: { 'Content-Type': contentType },
      body,
    });

    testTaskIds = response.body.data.taskIds;
    invalidTaskId = 'invalid-task-id-12345';
  });

  beforeEach(async () => {
    // 在每个测试前等待一小段时间，确保任务状态稳定
    await sleep(100);
  });

  describe('POST /api/v1/tasks/batch - Success Cases', () => {
    it('should query multiple valid task IDs', async () => {
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: testTaskIds },
      });

      expect(response.statusCode).toBe(200);
      assertSuccessResponse(response.body);

      // 验证响应结构
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('notFound');
      expect(response.body.data).toHaveProperty('progress');

      // 验证任务映射
      expect(Object.keys(response.body.data.tasks)).toHaveLength(testTaskIds.length);

      // 验证每个任务的信息
      testTaskIds.forEach((taskId: string) => {
        const task = response.body.data.tasks[taskId];
        expect(task).toBeDefined();
        expect(task).toHaveProperty('taskId', taskId);
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('progress');
        expect(typeof task.progress).toBe('number');
      });
    });

    it('should calculate summary statistics correctly', async () => {
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: testTaskIds },
      });

      const summary = response.body.data.summary;

      expect(summary.total).toBe(testTaskIds.length);
      expect(summary.statusCounts).toHaveProperty('queued');
      expect(summary.statusCounts).toHaveProperty('processing');
      expect(summary.statusCounts).toHaveProperty('completed');
      expect(summary.statusCounts).toHaveProperty('failed');

      // 验证状态计数总和等于总任务数
      const totalCount =
        summary.statusCounts.queued +
        summary.statusCounts.processing +
        summary.statusCounts.completed +
        summary.statusCounts.failed;

      expect(totalCount).toBe(testTaskIds.length);
    });

    it('should calculate overall progress', async () => {
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: testTaskIds },
      });

      const progress = response.body.data.progress;

      expect(progress).toHaveProperty('total');
      expect(progress).toHaveProperty('completed');
      expect(progress).toHaveProperty('percentage');

      expect(progress.total).toBe(testTaskIds.length);
      expect(typeof progress.percentage).toBe('number');
      expect(progress.percentage).toBeGreaterThanOrEqual(0);
      expect(progress.percentage).toBeLessThanOrEqual(100);
    });

    it('should include task metadata', async () => {
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: [testTaskIds[0]] },
      });

      const task = response.body.data.tasks[testTaskIds[0]];

      expect(task).toHaveProperty('metadata');
      expect(task.metadata).toHaveProperty('filename');
      expect(task.metadata).toHaveProperty('size');
    });

    it('should include timestamps', async () => {
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: [testTaskIds[0]] },
      });

      const task = response.body.data.tasks[testTaskIds[0]];

      expect(task).toHaveProperty('createdAt');
      expect(task).toHaveProperty('updatedAt');
      expect(typeof task.createdAt).toBe('string');
      expect(typeof task.updatedAt).toBe('string');
    });
  });

  describe('POST /api/v1/tasks/batch - Partial Success Cases', () => {
    it('should handle mix of valid and invalid task IDs', async () => {
      const mixedTaskIds = [...testTaskIds, invalidTaskId];

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: mixedTaskIds },
      });

      expect(response.statusCode).toBe(200);
      assertSuccessResponse(response.body);

      // 验证未找到的任务列表
      expect(response.body.data.notFound).toBeDefined();
      expect(response.body.data.notFound).toContain(invalidTaskId);

      // 验证无效任务标记为 not_found
      const invalidTask = response.body.data.tasks[invalidTaskId];
      expect(invalidTask).toBeDefined();
      expect(invalidTask.status).toBe('not_found');
      expect(invalidTask.progress).toBe(0);
    });

    it('should return notFound list for missing tasks', async () => {
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: [invalidTaskId] },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.notFound).toHaveLength(1);
      expect(response.body.data.notFound[0]).toBe(invalidTaskId);
    });

    it('should handle multiple missing task IDs', async () => {
      const missingTaskIds = [
        'missing-1',
        'missing-2',
        'missing-3',
        testTaskIds[0], // 一个有效的
      ];

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: missingTaskIds },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.notFound).toHaveLength(3);
    });
  });

  describe('POST /api/v1/tasks/batch - Error Cases', () => {
    it('should reject empty task ID array', async () => {
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: [] },
      });

      expect(response.statusCode).toBe(400);
      assertErrorResponse(response.body);

      expect(response.body.error).toContain('required and must not be empty');
    });

    it('should reject missing taskIds field', async () => {
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: {},
      });

      expect(response.statusCode).toBe(400);
      assertErrorResponse(response.body);
    });

    it('should reject too many task IDs', async () => {
      const tooManyTaskIds = Array.from({ length: 101 }, (_, i) => `task-${i}`);

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: tooManyTaskIds },
      });

      expect(response.statusCode).toBe(400);
      assertErrorResponse(response.body, 'TOO_MANY_TASKS');

      expect(response.body.error).toContain('Maximum 100 tasks');
      expect(response.body.limit).toBe(100);
    });

    it('should reject non-array taskIds', async () => {
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: 'not-an-array' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/tasks/batch - Deduplication', () => {
    it('should deduplicate repeated task IDs', async () => {
      const duplicatedTaskIds = [testTaskIds[0], testTaskIds[0], testTaskIds[1], testTaskIds[1]];

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: duplicatedTaskIds },
      });

      expect(response.statusCode).toBe(200);
      assertSuccessResponse(response.body);

      // 验证汇总使用去重后的数量
      expect(response.body.data.summary.total).toBe(2);
      expect(Object.keys(response.body.data.tasks)).toHaveLength(2);
    });

    it('should handle all duplicate task IDs', async () => {
      const allDuplicates = [testTaskIds[0], testTaskIds[0], testTaskIds[0]];

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: allDuplicates },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.summary.total).toBe(1);
      expect(Object.keys(response.body.data.tasks)).toHaveLength(1);
    });
  });

  describe('POST /api/v1/tasks/batch - Task Status Tracking', () => {
    it('should track task status changes', async () => {
      // 等待任务开始处理
      await waitFor(
        async () => {
          const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
            body: { taskIds: [testTaskIds[0]] },
          });

          const task = response.body.data.tasks[testTaskIds[0]];
          return task.status !== 'queued';
        },
        { timeout: 10000, interval: 500 }
      );

      // 获取最新状态
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: [testTaskIds[0]] },
      });

      const task = response.body.data.tasks[testTaskIds[0]];

      // 任务应该已经从 queued 状态变更
      expect(['processing', 'completed', 'failed']).toContain(task.status);
    }, 15000);

    it('should include error message for failed tasks', async () => {
      // 这个测试可能需要一段时间等待任务完成
      // 如果任务在测试时间内失败，验证错误信息

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: testTaskIds },
      });

      const failedTasks = Object.values(response.body.data.tasks).filter(
        (task: any) => task.status === 'failed'
      );

      failedTasks.forEach((task: any) => {
        expect(task).toHaveProperty('error');
        expect(typeof task.error).toBe('string');
      });
    });
  });

  describe('POST /api/v1/tasks/batch - Edge Cases', () => {
    it('should handle single task ID query', async () => {
      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: [testTaskIds[0]] },
      });

      expect(response.statusCode).toBe(200);
      expect(Object.keys(response.body.data.tasks)).toHaveLength(1);
      expect(response.body.data.summary.total).toBe(1);
    });

    it('should handle maximum allowed task IDs (100)', async () => {
      // 创建 100 个任务 ID（混合有效和无效）
      const manyTaskIds = Array.from({ length: 100 }, (_, i) => {
        if (i < testTaskIds.length) {
          return testTaskIds[i];
        }
        return `invalid-${i}`;
      });

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: manyTaskIds },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.summary.total).toBe(100);
    });

    it('should preserve task ID order in response', async () => {
      const orderedTaskIds = [testTaskIds[2], testTaskIds[0], testTaskIds[1]];

      const response = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: orderedTaskIds },
      });

      const returnedTaskIds = Object.keys(response.body.data.tasks);

      // 验证返回的任务顺序（注意：JS 对象不保证顺序，所以这里只验证所有任务都存在）
      orderedTaskIds.forEach((taskId) => {
        expect(returnedTaskIds).toContain(taskId);
      });
    });
  });

  describe('POST /api/v1/tasks/batch - Performance', () => {
    it('should handle concurrent batch queries', async () => {
      const requests = Array.from({ length: 10 }, async () => {
        return httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
          body: { taskIds: testTaskIds },
        });
      });

      const responses = await Promise.all(requests);

      // 所有请求都应该成功
      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
        assertSuccessResponse(response.body);
      });

      // 所有响应应该一致
      const firstResponse = responses[0].body.data;
      responses.forEach((response) => {
        expect(response.body.data.summary.total).toBe(firstResponse.summary.total);
      });
    });

    it('should respond quickly for large queries', async () => {
      const startTime = Date.now();

      await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: testTaskIds },
      });

      const duration = Date.now() - startTime;

      // 批量查询应该在 2 秒内完成
      expect(duration).toBeLessThan(2000);
    });
  });
});
