/**
 * Conversion API Routes
 *
 * Defines routes for PPTX to JSON conversion endpoints.
 *
 * @module api/v1/routes/convert
 */

import { FastifyInstance } from 'fastify';

/**
 * Register conversion routes
 *
 * @param fastify - Fastify instance
 */
export async function convertRoutes(fastify: FastifyInstance): Promise<void> {
  // POST / - Upload and convert PPTX file (路径前缀由注册时提供)
  fastify.post('/', {
    schema: {
      summary: 'Convert PPTX to JSON',
      description: 'Upload a PPTX file and convert it to PPTist-compatible JSON format',
      tags: ['Conversion'],
      consumes: ['multipart/form-data'],
      // Multipart 请求不需要 body schema，由 multipart 插件处理
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            taskId: { type: 'string' },
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
        413: {
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
    await fastify.convertController.uploadAndConvert(request, reply);
  });

  // POST /batch - Batch convert multiple PPTX files
  fastify.post('/batch', {
    schema: {
      summary: 'Batch convert PPTX files',
      description: 'Upload multiple PPTX files and convert them to JSON format',
      tags: ['Conversion'],
      consumes: ['multipart/form-data'],
      // Multipart 请求不需要 body schema，由 multipart 插件处理
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            taskIds: {
              type: 'array',
              items: { type: 'string' },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    // Implementation in controller
    await fastify.convertController.batchUploadAndConvert(request, reply);
  });
}
