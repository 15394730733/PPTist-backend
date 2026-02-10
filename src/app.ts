/**
 * Fastify Application Instance
 *
 * Main application setup with plugins, middleware, and routes.
 * Configures logging, CORS, file upload, etc.
 *
 * @module app
 */

import fastify, {
  FastifyInstance,
  FastifyServerOptions,
  FastifyError,
} from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import * as path from 'path';
// import * as config from 'config';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { getMetrics } from './utils/metrics-enhanced.js';

/**
 * Create Fastify application instance
 */
export function createApp(): FastifyInstance {
  const serverOptions: FastifyServerOptions = {
    logger: false, // Use our custom logger
    bodyLimit: 100 * 1024 * 1024, // 100MB
  };

  const app: FastifyInstance = fastify(serverOptions);

  // Register request ID middleware
  app.addHook('preHandler', requestIdMiddleware);

  // Register global error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    logger.error('Unhandled error', {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      validation: error.validation,
    });

    reply.code(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Internal server error',
      code: error.code,
    });
  });

  // Register CORS plugin with enhanced configuration
  app.register(fastifyCors, {
    // 允许的来源（生产环境应该配置具体的域名）
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://example.com'])
      : true, // 开发环境允许所有来源

    // 允许携带凭证（cookies、authorization headers）
    credentials: true,

    // 允许的 HTTP 方法
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],

    // 允许的请求头
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-API-Key',
    ],

    // 暴露的响应头（允许前端读取）
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],

    // 预检请求的缓存时间（秒）
    maxAge: 86400, // 24 小时

    // 预检请求的成功状态码
    optionsSuccessStatus: 204,
  });

  // Register security headers
  app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // Disabled for file uploads
  });

  // Register rate limiting
  app.register(rateLimit, {
    max: 100, // 每个 IP 地址每分钟最多 100 个请求
    timeWindow: '1 minute',
    cache: 10000, // 缓存 10000 个不同 IP 的计数
    allowList: ['127.0.0.1', '::1'], // 本地地址不受限制
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    continueExceeding: true,
    skipOnError: true, // 如果请求处理出错，不计入速率限制
    errorResponseBuilder: (req, context) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
      });
      return {
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '1 minute',
      };
    },
  });

  // Register Swagger documentation
  app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'PPTX to JSON Conversion API',
        description: 'Convert PowerPoint PPTX files to PPTist JSON format',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@example.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
        {
          url: 'https://api.example.com',
          description: 'Production server',
        },
      ],
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Conversion', description: 'PPTX conversion endpoints' },
        { name: 'Tasks', description: 'Task management endpoints' },
        { name: 'Metrics', description: 'Metrics and monitoring endpoints' },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key for authentication',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Error message' },
              code: { type: 'string', example: 'ERROR_CODE' },
            },
          },
          ConversionRequest: {
            type: 'object',
            required: ['file'],
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description: 'PPTX file to convert (max 100MB)',
              },
              extractMedia: {
                type: 'boolean',
                description: 'Extract media files (default: true)',
              },
              includeAnimations: {
                type: 'boolean',
                description: 'Include animations (default: true)',
              },
              includeNotes: {
                type: 'boolean',
                description: 'Include speaker notes (default: true)',
              },
            },
          },
          ConversionResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              taskId: { type: 'string', format: 'uuid' },
              message: { type: 'string' },
            },
          },
          TaskStatus: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              status: {
                type: 'string',
                enum: ['queued', 'processing', 'completed', 'failed'],
              },
              progress: { type: 'number', minimum: 0, maximum: 100 },
              result: { type: 'object' },
              error: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  });

  // Register Swagger UI
  app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list', // 默认展开所有文档
      deepLinking: true,
    },
    staticCSP: true, // 为 Swagger UI 提供 CSP
    transformStaticCSP: (header) => header,
  });

  // Register file upload plugin
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 10,
    },
  });

  // Register static file serving
  app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/', // Optional: default is '/'
  });

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
    });
  });

  // Prometheus metrics endpoint
  app.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    const metrics = await getMetrics();
    return reply.send(metrics);
  });

  // API v1 routes placeholder (will be registered by route modules)
  // Note: Routes are registered in src/api/v1/index.ts

  logger.info('Fastify application created');

  return app;
}

/**
 * Start the server
 *
 * @param app - Fastify application instance
 * @param port - Port number (default: from config)
 */
export async function startServer(
  app: FastifyInstance,
  port?: number
): Promise<void> {
  const serverPort = port || 3000;

  try {
    await app.listen({ port: serverPort, host: '0.0.0.0' });

    logger.info('Server started successfully', {
      port: serverPort,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      port: serverPort,
    });
    throw error;
  }
}

/**
 * Gracefully shutdown the server
 */
export async function shutdownServer(
  app: FastifyInstance,
  signal: 'SIGTERM' | 'SIGINT' = 'SIGTERM'
): Promise<void> {
  logger.info('Shutting down server', { signal });

  // Stop accepting new connections
  await app.close();

  logger.info('Server shut down complete');
}

export default { createApp, startServer, shutdownServer };
