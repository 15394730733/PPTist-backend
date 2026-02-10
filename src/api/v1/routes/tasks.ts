/**
 * Task API Routes
 *
 * Defines routes for task status and result retrieval.
 *
 * @module api/v1/routes/tasks
 */

import { FastifyInstance } from 'fastify';

/**
 * Register task routes
 *
 * @param fastify - Fastify instance
 */
export async function taskRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /:taskId - Query task status (路径前缀由注册时提供)
  fastify.get('/:taskId', {
    schema: {
      summary: 'Get task status',
      description: 'Query the status of a conversion task',
      tags: ['Tasks'],
      params: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID' },
        },
        required: ['taskId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            taskId: { type: 'string' },
            status: { type: 'string', enum: ['queued', 'processing', 'completed', 'failed'] },
            progress: { type: 'number', minimum: 0, maximum: 100 },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    // Implementation in controller
    await fastify.taskController.getTaskStatus(request, reply);
  });

  // GET /:taskId/result - Download conversion result (JSON)
  fastify.get('/:taskId/result', {
    schema: {
      summary: 'Get conversion result',
      description: 'Download the converted JSON file',
      tags: ['Tasks'],
      params: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID' },
        },
        required: ['taskId'],
      },
      response: {
        200: {
          description: 'JSON file',
          type: 'object',
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    // Implementation in controller
    await fastify.taskController.getTaskResult(request, reply);
  });

  // GET /:taskId/result/zip - Download conversion result (ZIP with media)
  fastify.get('/:taskId/result/zip', {
    schema: {
      summary: 'Get conversion result as ZIP',
      description: 'Download the converted JSON file and media as a ZIP archive',
      tags: ['Tasks'],
      params: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID' },
        },
        required: ['taskId'],
      },
      response: {
        200: {
          description: 'ZIP file',
          type: 'string',
          contentType: 'application/zip',
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    // Implementation in controller
    await fastify.taskController.getTaskResultZip(request, reply);
  });

  // POST /batch - Batch query task statuses
  fastify.post('/batch', {
    schema: {
      summary: 'Batch get task statuses',
      description: 'Query the status of multiple conversion tasks',
      tags: ['Tasks'],
      body: {
        type: 'object',
        properties: {
          taskIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['taskIds'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tasks: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  progress: { type: 'number' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                queued: { type: 'number' },
                processing: { type: 'number' },
                completed: { type: 'number' },
                failed: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    // Implementation in controller
    await fastify.taskController.batchGetTaskStatus(request, reply);
  });
}
