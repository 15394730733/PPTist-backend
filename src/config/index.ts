import config from 'config';
import { z } from 'zod';

/**
 * Configuration Schema Validation
 */
const configSchema = z.object({
  server: z.object({
    port: z.number().int().min(1).max(65535),
    host: z.string(),
    cors: z.object({
      enabled: z.boolean(),
      origin: z.union([z.string(), z.array(z.string())]),
    }),
  }),
  upload: z.object({
    maxSize: z.number().int().positive(),
    tempDir: z.string(),
    allowedMimeTypes: z.array(z.string()),
  }),
  queue: z.object({
    type: z.enum(['memory', 'redis']),
    concurrency: z.number().int().min(1).max(100),
    retention: z.number().int().positive(), // hours
    redis: z.object({
      host: z.string(),
      port: z.number().int().min(1).max(65535),
      db: z.number().int().min(0),
      password: z.string().nullable(),
    }),
  }),
  storage: z.object({
    type: z.enum(['local', 's3']),
    local: z.object({
      path: z.string(),
    }),
    s3: z.object({
      bucket: z.string().nullable(),
      region: z.string().nullable(),
      accessKeyId: z.string().nullable(),
      secretAccessKey: z.string().nullable(),
    }),
  }),
  pptist: z.object({
    defaultVersion: z.string(),
    supportedVersions: z.array(z.string()),
  }),
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
    format: z.enum(['json', 'pretty']),
    redact: z.array(z.string()),
  }),
  metrics: z.object({
    enabled: z.boolean(),
    port: z.number().int().min(1).max(65535),
    path: z.string(),
  }),
  tracing: z.object({
    enabled: z.boolean(),
    exporter: z.enum(['otlp', 'jaeger', 'zipkin']),
    endpoint: z.string(),
    serviceName: z.string(),
  }),
  security: z.object({
    helmet: z.object({
      enabled: z.boolean(),
    }),
    rateLimit: z.object({
      enabled: z.boolean(),
      max: z.number().int().positive(),
      windowMs: z.number().int().positive(),
    }),
  }),
});

// Type for validated config
export type AppConfig = z.infer<typeof configSchema>;

/**
 * Validate and export typed configuration
 */
function loadConfig(): AppConfig {
  try {
    const rawConfig = {
      server: config.get('server'),
      upload: config.get('upload'),
      queue: config.get('queue'),
      storage: config.get('storage'),
      pptist: config.get('pptist'),
      logging: config.get('logging'),
      metrics: config.get('metrics'),
      tracing: config.get('tracing'),
      security: config.get('security'),
    };

    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid configuration:');
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        const received = err.code === 'invalid_type' ? `expected ${err.expected}, received ${err.received}` : 'validation failed';
        console.error(`  - ${path}: ${err.message} (${received})`);
      });
      throw new Error('Configuration validation failed');
    }
    throw error;
  }
}

// Export validated configuration
// export const appConfig = loadConfig();

// Convenience getters
// export const getServerConfig = () => appConfig.server;
// export const getUploadConfig = () => appConfig.upload;
// export const getQueueConfig = () => appConfig.queue;
// export const getStorageConfig = () => appConfig.storage;
// export const getPPTistConfig = () => appConfig.pptist;
// export const getLoggingConfig = () => appConfig.logging;
// export const getMetricsConfig = () => appConfig.metrics;
// export const getTracingConfig = () => appConfig.tracing;
// export const getSecurityConfig = () => appConfig.security;

export default {
  // appConfig,
  loadConfig,
  // getServerConfig,
  // getUploadConfig,
  // getQueueConfig,
  // getStorageConfig,
  // getPPTistConfig,
  // getLoggingConfig,
  // getMetricsConfig,
  // getTracingConfig,
  // getSecurityConfig,
};
