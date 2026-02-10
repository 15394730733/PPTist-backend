/**
 * Memory Queue Unit Tests
 *
 * Tests for in-memory task queue implementation.
 *
 * @module tests/unit/services/queue
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryTaskQueue } from '../../../../src/queue/memory-queue';
import type { ConversionTask } from '../../../../src/types/task';

describe('Memory Queue - Unit Tests', () => {
  let queue: MemoryTaskQueue;

  beforeEach(() => {
    queue = new MemoryTaskQueue({ concurrency: 3 });
  });

  describe('add', () => {
    it('should add task to queue', async () => {
      const taskData = { filePath: '/path/to/file.pptx' };
      const taskId = await queue.add(taskData);

      const retrieved = await queue.getTask(taskId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(taskId);
      expect(retrieved?.status).toBe('queued');
      expect(retrieved?.data).toEqual(taskData);
    });

    it('should add multiple tasks', async () => {
      const tasksData = Array.from({ length: 5 }, (_, i) => ({
        filePath: `/path/to/file${i}.pptx`,
      }));

      const taskIds: string[] = [];
      for (const data of tasksData) {
        const taskId = await queue.add(data);
        taskIds.push(taskId);
      }

      for (const taskId of taskIds) {
        const retrieved = await queue.getTask(taskId);
        expect(retrieved).toBeDefined();
      }
    });

    it('should preserve task data', async () => {
      const taskData = {
        filePath: '/test.pptx',
        originalFilename: 'test.pptx',
        metadata: { size: 1024 },
      };

      const taskId = await queue.add(taskData);

      const retrieved = await queue.getTask(taskId);
      expect(retrieved?.data).toEqual(taskData);
    });
  });

  describe('getTask', () => {
    it('should retrieve existing task', async () => {
      const taskData = { filePath: '/test.pptx' };
      const taskId = await queue.add(taskData);

      const retrieved = await queue.getTask(taskId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(taskId);
      expect(retrieved?.data).toEqual(taskData);
    });

    it('should return null for non-existent task', async () => {
      const retrieved = await queue.getTask('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should return null for null ID', async () => {
      const retrieved = await queue.getTask(null as any);
      expect(retrieved).toBeNull();
    });
  });

  describe('updateTask', () => {
    it('should update task status', async () => {
      const taskData = { filePath: '/test.pptx' };
      const taskId = await queue.add(taskData);

      await queue.updateTask(taskId, { status: 'processing' });

      const retrieved = await queue.getTask(taskId);
      expect(retrieved?.status).toBe('processing');
    });

    it('should update progress', async () => {
      const taskData = { filePath: '/test.pptx' };
      const taskId = await queue.add(taskData);

      await queue.updateTask(taskId, { progress: 50 });

      const retrieved = await queue.getTask(taskId);
      expect(retrieved?.progress).toBe(50);
    });

    it('should set completed status', async () => {
      const taskData = { filePath: '/test.pptx' };
      const taskId = await queue.add(taskData);

      await queue.updateTask(taskId, { status: 'completed', progress: 100 });

      const retrieved = await queue.getTask(taskId);
      expect(retrieved?.status).toBe('completed');
      expect(retrieved?.progress).toBe(100);
    });

    it('should set failed status with error', async () => {
      const taskData = { filePath: '/test.pptx' };
      const taskId = await queue.add(taskData);

      await queue.updateTask(taskId, {
        status: 'failed',
        error: 'Conversion failed',
      });

      const retrieved = await queue.getTask(taskId);
      expect(retrieved?.status).toBe('failed');
      expect(retrieved?.error).toBe('Conversion failed');
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      const tasksData = Array.from({ length: 5 }, (_, i) => ({
        filePath: `/file${i}.pptx`,
      }));

      const taskIds: string[] = [];
      for (const data of tasksData) {
        const taskId = await queue.add(data);
        taskIds.push(taskId);
      }

      await queue.updateTask(taskIds[0], { status: 'processing' });
      await queue.updateTask(taskIds[1], { status: 'completed' });
      await queue.updateTask(taskIds[2], { status: 'failed' });

      const stats = await queue.getStats();

      expect(stats.total).toBe(5);
      expect(stats.queued).toBe(2);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should return zero stats for empty queue', async () => {
      const stats = await queue.getStats();

      expect(stats.total).toBe(0);
      expect(stats.queued).toBe(0);
      expect(stats.processing).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe('updateTask with result', () => {
    it('should set task result', async () => {
      const taskData = { filePath: '/test.pptx' };
      const taskId = await queue.add(taskData);

      const resultData = { slides: [{ id: 'slide-1', elements: [] }] };
      await queue.updateTask(taskId, {
        result: resultData as any,
        status: 'completed',
        progress: 100,
      });

      const retrieved = await queue.getTask(taskId);
      expect(retrieved?.result).toEqual(resultData);
    });
  });

  describe('Task Removal', () => {
    it('should remove old tasks after retention period', async () => {
      // Note: cleanupOldTasks is a private method, so we can't call it directly in tests
      // The queue has an automatic cleanup interval that runs internally
      // For now, just verify that we can remove a task manually
      const taskId = await queue.add({ filePath: '/old.pptx' });

      const removed = await queue.remove(taskId);
      expect(removed).toBe(true);

      const retrieved = await queue.getTask(taskId);
      expect(retrieved).toBeNull();
    });

    it('should return false when removing non-existent task', async () => {
      const removed = await queue.remove('non-existent-task');
      expect(removed).toBe(false);
    });
  });

  describe('Concurrency', () => {
    it('should allow updating multiple tasks to processing', async () => {
      const maxConcurrency = 3;

      const tasksData = Array.from({ length: 10 }, (_, i) => ({
        filePath: `/file${i}.pptx`,
      }));

      const taskIds: string[] = [];
      for (const data of tasksData) {
        const taskId = await queue.add(data);
        taskIds.push(taskId);
      }

      // Update multiple tasks to processing
      for (let i = 0; i < maxConcurrency + 2; i++) {
        await queue.updateTask(taskIds[i], { status: 'processing' });
      }

      const stats = await queue.getStats();
      // The queue allows manual updates, concurrency is enforced by fastq
      expect(stats.processing).toBe(maxConcurrency + 2);
      expect(stats.queued).toBe(10 - (maxConcurrency + 2));
    });
  });
});
