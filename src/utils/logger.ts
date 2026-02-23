import pino from 'pino'
import type { Logger } from 'pino'

let logger: Logger | null = null

export function createLogger(level: string = 'info'): Logger {
  if (logger) return logger

  const isDev = process.env.NODE_ENV !== 'production'

  logger = pino({
    level,
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  })

  return logger
}

export function getLogger(): Logger {
  if (!logger) {
    return createLogger(process.env.LOG_LEVEL || 'info')
  }
  return logger
}

export default getLogger
