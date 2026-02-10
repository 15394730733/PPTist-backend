/**
 * Task Queue Factory
 *
 * Factory for creating task queue instances based on configuration.
 *
 * @module queue/factory
 */

import type { TaskQueue } from '../types/queue';
import { MemoryTaskQueue } from './memory-queue.js';
import { logger } from '../utils/logger';

/**
 * Create task queue instance based on configuration
 *
 * @returns Task queue instance
 */
export function createQueue(): TaskQueue {
  // Default configuration (hardcoded for now)
  const queueType = 'memory' as 'memory' | 'redis';
  const concurrency = 3;
  const retentionMs = 24 * 60 * 60 * 1000; // 24 hours

  logger.info('Creating task queue', { type: queueType, concurrency, retentionMs });

  switch (queueType) {
    case 'memory':
      return new MemoryTaskQueue({
        concurrency,
        retentionMs,
      });

    case 'redis':
      // Redis queue implementation (future)
      throw new Error('Redis queue not yet implemented');

    default:
      // Should never reach here
      const _exhaust: never = queueType;
      return _exhaust;
  }
}

/**
 * Create task queue with custom options
 *
 * @param type - Queue type
 * @param options - Queue options
 * @returns Task queue instance
 */
export function createQueueWithOptions(
  type: 'memory' | 'redis',
  options: {
    concurrency?: number;
    retentionMs?: number;
    [key: string]: any;
  } = {}
): TaskQueue {
  logger.info('Creating task queue with options', { type, options });

  switch (type) {
    case 'memory':
      return new MemoryTaskQueue({
        concurrency: options.concurrency || 3,
        retentionMs: options.retentionMs || 24 * 60 * 60 * 1000,
      });

    case 'redis':
      throw new Error('Redis queue not yet implemented');

    default:
      throw new Error(`Unknown queue type: ${type}`);
  }
}
