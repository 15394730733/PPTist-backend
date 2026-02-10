/**
 * Task Queue Factory
 *
 * Creates task queue instances based on configuration.
 * Supports pluggable backends (memory, Redis, etc.)
 */

import { InMemoryQueue } from './memory.js';
import type { ITaskQueue } from '../../types/queue';
import { logger } from '../../utils/logger';

/**
 * Queue type enum
 */
export enum QueueType {
  MEMORY = 'memory',
  REDIS = 'redis',
}

/**
 * Default queue configuration (hardcoded for now)
 */
const DEFAULT_QUEUE_CONFIG = {
  type: 'memory',
  concurrency: 3,
  retentionMs: 86400000, // 24 hours
};

/**
 * Create a task queue based on configuration
 */
export function createQueue<TInput = unknown, TOutput = unknown>(): ITaskQueue<
  TInput,
  TOutput
> {
  const type = DEFAULT_QUEUE_CONFIG.type as QueueType;

  logger.info(
    { type, concurrency: DEFAULT_QUEUE_CONFIG.concurrency },
    'Creating task queue'
  );

  switch (type) {
    case QueueType.MEMORY:
      return new InMemoryQueue<TInput, TOutput>(
        DEFAULT_QUEUE_CONFIG.concurrency,
        DEFAULT_QUEUE_CONFIG.retentionMs
      );

    case QueueType.REDIS:
      // Redis queue implementation would go here
      // For now, fall back to memory with a warning
      logger.warn('Redis queue not yet implemented, falling back to memory queue');
      return new InMemoryQueue<TInput, TOutput>(
        DEFAULT_QUEUE_CONFIG.concurrency,
        DEFAULT_QUEUE_CONFIG.retentionMs
      );

    default:
      logger.warn(`Unknown queue type: ${type}, using memory queue`);
      return new InMemoryQueue<TInput, TOutput>(
        DEFAULT_QUEUE_CONFIG.concurrency,
        DEFAULT_QUEUE_CONFIG.retentionMs
      );
  }
}

/**
 * Create a custom task queue with specific options
 */
export function createCustomQueue<TInput = unknown, TOutput = unknown>(
  type: QueueType,
  options?: {
    concurrency?: number;
    retentionMs?: number;
    [key: string]: unknown;
  }
): ITaskQueue<TInput, TOutput> {
  logger.info({ type, options }, 'Creating custom task queue');

  switch (type) {
    case QueueType.MEMORY:
      return new InMemoryQueue<TInput, TOutput>(
        options?.concurrency || 3,
        options?.retentionMs || 86400000
      );

    case QueueType.REDIS:
      throw new Error('Redis queue not yet implemented');

    default:
      throw new Error(`Unknown queue type: ${type}`);
  }
}

export default {
  createQueue,
  createCustomQueue,
  QueueType,
};
