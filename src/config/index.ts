import { z } from 'zod'
import type { EnvConfig } from '../types/index.js'

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  MAX_FILE_SIZE: z.coerce.number().default(52428800), // 50MB
  CRYPTO_KEY: z.string().default('pptist'),
  RATE_LIMIT_MAX: z.coerce.number().default(10),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000), // 1 minute
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DEFAULT_OUTPUT_FORMAT: z.enum(['both', 'json', 'pptist']).default('pptist'),
})

function loadConfig(): EnvConfig {
  const env = {
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
    CRYPTO_KEY: process.env.CRYPTO_KEY,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
    LOG_LEVEL: process.env.LOG_LEVEL,
    DEFAULT_OUTPUT_FORMAT: process.env.DEFAULT_OUTPUT_FORMAT,
  }

  const result = envSchema.safeParse(env)

  if (!result.success) {
    console.error('Invalid environment configuration:')
    console.error(result.error.format())
    process.exit(1)
  }

  return result.data
}

// Singleton config instance
let config: EnvConfig | null = null

export function getConfig(): EnvConfig {
  if (!config) {
    config = loadConfig()
  }
  return config
}

export function resetConfig(): void {
  config = null
}

// Export individual config values for convenience
export const configValues = {
  get port() {
    return getConfig().PORT
  },
  get host() {
    return getConfig().HOST
  },
  get maxFileSize() {
    return getConfig().MAX_FILE_SIZE
  },
  get cryptoKey() {
    return getConfig().CRYPTO_KEY
  },
  get rateLimitMax() {
    return getConfig().RATE_LIMIT_MAX
  },
  get rateLimitWindow() {
    return getConfig().RATE_LIMIT_WINDOW
  },
  get logLevel() {
    return getConfig().LOG_LEVEL
  },
}

export default getConfig
