import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance, FastifyError } from 'fastify'
import { getConfig } from './config/index.js'
import { createLogger } from './utils/logger.js'
import { ConversionError } from './utils/errors.js'
import { conversionModule } from './modules/conversion/index.js'

export async function createApp(): Promise<FastifyInstance> {
  const config = getConfig()
  const logger = createLogger(config.LOG_LEVEL)

  const fastify = Fastify({
    logger: false, // We use our own pino logger
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    // Request timeout for large files (60 seconds)
    bodyLimit: config.MAX_FILE_SIZE,
  })

  // Register multipart plugin for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: config.MAX_FILE_SIZE,
      files: 1, // Only one file at a time
    },
  })

  // Register rate limiting (T049)
  await fastify.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    allowList: ['127.0.0.1'], // Allow localhost for development
    cache: 10000,
    continueExceeding: true,
  })

  // Global error handler
  fastify.setErrorHandler((error: FastifyError | Error, request, reply) => {
    logger.error({ error: error.message, requestId: request.id }, 'Request error')

    if (error instanceof ConversionError) {
      const response = error.toJSON()
      return reply.status(error.getStatusCode()).send(response)
    }

    // Handle multipart errors
    if ('code' in error && error.code === 'FST_PARTS_LIMIT') {
      return reply.status(413).send({
        success: false,
        error: {
          code: 'ERR_FILE_TOO_LARGE',
          message: 'File size exceeds limit',
          suggestion: 'Please upload a smaller file',
        },
      })
    }

    // Handle rate limit errors
    if ('statusCode' in error && error.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'ERR_CONVERSION_FAILED',
          message: 'Too many requests',
          suggestion: 'Please wait before trying again',
        },
      })
    }

    // Generic error
    return reply.status(500).send({
      success: false,
      error: {
        code: 'ERR_CONVERSION_FAILED',
        message: 'An unexpected error occurred',
        suggestion: 'Please try again or contact support',
      },
    })
  })

  // Register conversion module
  await fastify.register(conversionModule)

  logger.info({ config: { ...config, CRYPTO_KEY: '[REDACTED]' } }, 'Application initialized')

  return fastify
}

export default createApp
