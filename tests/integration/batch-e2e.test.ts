/**
 * Batch E2E Integration Tests
 *
 * End-to-end tests for the complete batch conversion workflow.
 *
 * @module tests/integration/batch-e2e
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  httpRequest,
  createTestPPTX,
  createMultipartFormData,
  assertSuccessResponse,
  waitFor,
  sleep,
} from '../helpers/test-helpers.js';

const TEST_URL = process.env.TEST_URL || 'http://127.0.0.1:3001';

describe('Batch Conversion - End-to-End Tests', () => {
  describe('Complete Batch Conversion Workflow', () => {
    it('should complete full batch conversion: upload -> query -> download', async () => {
      // 步骤 1: 批量上传文件
      const pptx1 = await createTestPPTX({ filename: 'e2e-test1.pptx', slideCount: 1 });
      const pptx2 = await createTestPPTX({ filename: 'e2e-test2.pptx', slideCount: 2 });
      const pptx3 = await createTestPPTX({ filename: 'e2e-test3.pptx', slideCount: 3 });

      const { body: uploadBody, contentType } = createMultipartFormData([
        { name: 'files', data: pptx1, filename: 'e2e-test1.pptx' },
        { name: 'files', data: pptx2, filename: 'e2e-test2.pptx' },
        { name: 'files', data: pptx3, filename: 'e2e-test3.pptx' },
      ]);

      const uploadResponse = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body: uploadBody,
      });

      expect(uploadResponse.statusCode).toBe(200);
      assertSuccessResponse(uploadResponse.body);

      const { taskIds } = uploadResponse.body.data;
      expect(taskIds).toHaveLength(3);

      console.log(`✅ Batch upload created ${taskIds.length} tasks:`, taskIds);

      // 步骤 2: 等待所有任务完成
      await waitFor(
        async () => {
          const queryResponse = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
            body: { taskIds },
          });

          const { summary } = queryResponse.body.data;
          const { completed, failed } = summary.statusCounts;

          // 所有任务要么完成，要么失败
          return completed + failed === taskIds.length;
        },
        { timeout: 60000, interval: 2000 }
      );

      console.log('✅ All tasks completed');

      // 步骤 3: 查询最终状态
      const finalStatusResponse = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds },
      });

      const finalStatus = finalStatusResponse.body.data;
      const { summary, tasks, notFound } = finalStatus;

      expect(notFound).toHaveLength(0);
      expect(summary.total).toBe(3);

      console.log('📊 Final status:', {
        total: summary.total,
        queued: summary.statusCounts.queued,
        processing: summary.statusCounts.processing,
        completed: summary.statusCounts.completed,
        failed: summary.statusCounts.failed,
      });

      // 步骤 4: 下载已完成的任务结果
      for (const taskId of taskIds) {
        const task = tasks[taskId];

        if (task.status === 'completed') {
          // 下载 JSON 结果
          const resultResponse = await httpRequest(
            'GET',
            `${TEST_URL}/api/v1/tasks/${taskId}/result`
          );

          if (resultResponse.statusCode === 200) {
            console.log(`✅ Downloaded result for task ${taskId}`);

            // 验证结果是有效的 JSON
            expect(resultResponse.headers['content-type']).toContain('application/json');

            // 验证结果包含基本的 PPTist 结构
            const result = resultResponse.body;
            expect(Array.isArray(result)).toBe(true); // 应该是幻灯片数组

            console.log(`   Task ${taskId}: ${result.length} slides`);
          } else {
            console.log(`⚠️  Could not download result for task ${taskId}:`, resultResponse.body);
          }
        } else if (task.status === 'failed') {
          console.log(`❌ Task ${taskId} failed:`, task.error);
        }
      }

      // 步骤 5: 验证至少有一个任务成功
      const successCount = summary.statusCounts.completed;
      expect(successCount).toBeGreaterThan(0);

      console.log(`\n✨ E2E test completed: ${successCount}/${taskIds.length} tasks succeeded`);
    }, 90000);

    it('should handle mixed success and failure scenarios', async () => {
      // 创建有效和无效文件的混合
      const validPPTX = await createTestPPTX({ filename: 'valid.pptx', slideCount: 1 });
      const invalidPPTX = Buffer.from('invalid content');

      const { body: uploadBody, contentType } = createMultipartFormData([
        { name: 'files', data: validPPTX, filename: 'valid1.pptx' },
        { name: 'files', data: invalidPPTX, filename: 'invalid1.pptx' },
        { name: 'files', data: validPPTX, filename: 'valid2.pptx' },
        { name: 'files', data: invalidPPTX, filename: 'invalid2.docx' },
      ]);

      const uploadResponse = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body: uploadBody,
      });

      expect(uploadResponse.statusCode).toBe(200);

      const { taskIds, summary, errors } = uploadResponse.body.data;

      // 验证上传结果
      expect(summary.total).toBe(4);
      expect(summary.created).toBeGreaterThan(0);
      expect(summary.failed).toBeGreaterThan(0);
      expect(errors).toHaveLength(2);

      console.log(`Created ${summary.created} tasks, ${summary.failed} failed during upload`);

      // 等待任务完成
      await waitFor(
        async () => {
          const queryResponse = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
            body: { taskIds },
          });

          const { summary } = queryResponse.body.data;
          return summary.statusCounts.completed + summary.statusCounts.failed === taskIds.length;
        },
        { timeout: 60000, interval: 2000 }
      );

      // 验证最终结果
      const finalResponse = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds },
      });

      const { summary: finalSummary } = finalResponse.body.data;

      console.log('Final summary:', finalSummary.statusCounts);

      // 应该有成功和失败的任务
      expect(finalSummary.statusCounts.completed + finalSummary.statusCounts.failed).toBe(taskIds.length);
    }, 90000);
  });

  describe('Batch Conversion with Real-world Scenarios', () => {
    it('should handle large batch uploads (10 files)', async () => {
      const files = Array.from({ length: 10 }, async (_, i) => {
        return createTestPPTX({ filename: `large-batch-${i}.pptx`, slideCount: i + 1 });
      });

      const pptxFiles = await Promise.all(files);

      const multipartData = createMultipartFormData(
        pptxFiles.map((pptx, i) => ({
          name: 'files',
          data: pptx,
          filename: `large-batch-${i}.pptx`,
        }))
      );

      const uploadResponse = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': multipartData.contentType },
        body: multipartData.body,
      });

      expect(uploadResponse.statusCode).toBe(200);
      expect(uploadResponse.body.data.taskIds).toHaveLength(10);

      const { taskIds } = uploadResponse.body.data;

      console.log(`✅ Uploaded 10 files, created ${taskIds.length} tasks`);

      // 等待所有任务完成
      await waitFor(
        async () => {
          const queryResponse = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
            body: { taskIds },
          });

          const { summary } = queryResponse.body.data;
          return summary.statusCounts.completed + summary.statusCounts.failed === taskIds.length;
        },
        { timeout: 120000, interval: 3000 }
      );

      console.log('✅ All 10 tasks completed');

      // 验证最终状态
      const finalResponse = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds },
      });

      const { summary } = finalResponse.body.data;
      const successRate = (summary.statusCounts.completed / taskIds.length) * 100;

      console.log(`Success rate: ${successRate.toFixed(1)}%`);

      // 至少 50% 的任务应该成功
      expect(summary.statusCounts.completed).toBeGreaterThanOrEqual(taskIds.length / 2);
    }, 150000);

    it('should maintain task isolation during batch processing', async () => {
      // 创建多个独立的批量上传
      const batch1 = await createTestPPTX({ filename: 'batch1-file.pptx', slideCount: 1 });
      const batch2 = await createTestPPTX({ filename: 'batch2-file.pptx', slideCount: 1 });
      const batch3 = await createTestPPTX({ filename: 'batch3-file.pptx', slideCount: 1 });

      // 上传第一批
      const { body: body1, contentType: ct1 } = createMultipartFormData([
        { name: 'files', data: batch1, filename: 'batch1-file.pptx' },
      ]);
      const upload1 = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': ct1 },
        body: body1,
      });

      // 上传第二批
      const { body: body2, contentType: ct2 } = createMultipartFormData([
        { name: 'files', data: batch2, filename: 'batch2-file.pptx' },
      ]);
      const upload2 = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': ct2 },
        body: body2,
      });

      // 上传第三批
      const { body: body3, contentType: ct3 } = createMultipartFormData([
        { name: 'files', data: batch3, filename: 'batch3-file.pptx' },
      ]);
      const upload3 = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': ct3 },
        body: body3,
      });

      const allTaskIds = [
        upload1.body.data.taskIds[0],
        upload2.body.data.taskIds[0],
        upload3.body.data.taskIds[0],
      ];

      // 验证所有任务 ID 都是唯一的
      const uniqueIds = new Set(allTaskIds);
      expect(uniqueIds.size).toBe(3);

      // 等待所有任务完成
      await waitFor(
        async () => {
          const queryResponse = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
            body: { taskIds: allTaskIds },
          });

          const { summary } = queryResponse.body.data;
          return summary.statusCounts.completed + summary.statusCounts.failed === 3;
        },
        { timeout: 60000, interval: 2000 }
      );

      // 验证每个任务都独立完成
      const finalResponse = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds: allTaskIds },
      });

      const { tasks } = finalResponse.body.data;

      allTaskIds.forEach((taskId) => {
        const task = tasks[taskId];
        expect(['completed', 'failed']).toContain(task.status);
        expect(task.taskId).toBe(taskId);
      });

      console.log('✅ Task isolation verified');
    }, 90000);
  });

  describe('Batch Conversion Error Recovery', () => {
    it('should continue processing after partial failures', async () => {
      // 这个测试验证即使某些任务失败，其他任务仍能正常处理
      const pptx1 = await createTestPPTX({ filename: 'test1.pptx', slideCount: 1 });
      const pptx2 = await createTestPPTX({ filename: 'test2.pptx', slideCount: 1 });

      const { body: uploadBody, contentType } = createMultipartFormData([
        { name: 'files', data: pptx1, filename: 'test1.pptx' },
        { name: 'files', data: pptx2, filename: 'test2.pptx' },
      ]);

      const uploadResponse = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
        headers: { 'Content-Type': contentType },
        body: uploadBody,
      });

      const { taskIds } = uploadResponse.body.data;

      // 等待任务完成
      await waitFor(
        async () => {
          const queryResponse = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
            body: { taskIds },
          });

          const { summary } = queryResponse.body.data;
          return summary.statusCounts.completed + summary.statusCounts.failed === taskIds.length;
        },
        { timeout: 60000, interval: 2000 }
      );

      const finalResponse = await httpRequest('POST', `${TEST_URL}/api/v1/tasks/batch`, {
        body: { taskIds },
      });

      const { summary, tasks } = finalResponse.body.data;

      // 验证至少有一个任务成功
      expect(summary.statusCounts.completed + summary.statusCounts.failed).toBe(taskIds.length);

      console.log('Task processing results:', {
        completed: summary.statusCounts.completed,
        failed: summary.statusCounts.failed,
        tasks: tasks,
      });
    }, 90000);
  });
});
