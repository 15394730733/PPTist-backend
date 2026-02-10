import * as pino from 'pino';
import config from 'config';
import { createRedaction, sanitizeError } from './log-sanitizer.js';

const logLevel = config.get<string>('logging.level');
const logFormat = config.get<string>('logging.format');

// Create pino logger with configuration
const logger = pino.pino({
  level: logLevel,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  redact: config.get<string[]>('logging.redact'),
  // Use pretty print in development for better readability
  ...(logFormat === 'pretty' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  // Add redaction for sensitive data
  ...createRedaction(),
});

/**
 * Sanitized error logging
 *
 * @param error - Error to log
 * @param context - Additional context
 */
function logError(error: Error, context?: any): void {
  logger.error({
    ...context,
    error: sanitizeError(error),
  });
}

/**
 * Sanitized request logging
 *
 * @param requestData - Request data to log
 * @param context - Additional context
 */
function logRequest(requestData: any, context?: any): void {
  logger.info({
    ...context,
    ...requestData,
  });
}

export { logger, logError, logRequest };
export default logger;
