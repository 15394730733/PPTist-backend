/**
 * API v1 Routes
 *
 * Registers all v1 API routes and controllers.
 *
 * @module api/v1
 */

import { FastifyInstance } from 'fastify';
import { convertRoutes } from './routes/convert.js';
import { taskRoutes } from './routes/tasks.js';
import { createConvertController } from './controllers/convert.js';
import { createTaskController } from './controllers/tasks.js';
import type { TaskQueue } from '../../types/queue';
import { logger } from '../../utils/logger';
import { getDefaultUploadsDir, getDefaultResultsDir } from '../../utils/paths';

/**
 * Register API v1 routes
 *
 * @param fastify - Fastify instance
 * @param queue - Task queue instance
 */
export async function registerV1Routes(
  fastify: FastifyInstance,
  queue: TaskQueue
): Promise<void> {
  logger.info('Registering API v1 routes');

  // Create controllers
  const convertController = createConvertController({
    queue,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    uploadDir: getDefaultUploadsDir(),
    maxBatchFiles: 10,
  });

  const taskController = createTaskController({
    queue,
    resultsDir: getDefaultResultsDir(),
    maxBatchQuery: 100,
  });

  // Attach controllers to fastify instance for route access
  fastify.decorate('convertController', convertController);
  fastify.decorate('taskController', taskController);

  // Register routes
  await fastify.register(convertRoutes, { prefix: '/convert' });
  await fastify.register(taskRoutes, { prefix: '/tasks' });

  logger.info('API v1 routes registered successfully');
}

/**
 * API v1 route prefix
 */
export const API_V1_PREFIX = '/api/v1';
