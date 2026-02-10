/**
 * OpenTelemetry Tracing Utilities
 *
 * This module provides distributed tracing capabilities for the PPTX conversion service.
 * Tracing is disabled by default and can be enabled via configuration.
 */

import config from 'config';
import logger from './logger.js';

const tracingEnabled = config.get<boolean>('tracing.enabled');

// OpenTelemetry API is optional, only import if tracing is enabled
let trace: typeof import('@opentelemetry/api') | null = null;

if (tracingEnabled) {
  try {
    trace = await import('@opentelemetry/api');
    logger.info('OpenTelemetry tracing initialized');
  } catch (error) {
    logger.warn({ error }, 'Failed to initialize OpenTelemetry, tracing disabled');
    trace = null;
  }
}

/**
 * Get the current tracer or a no-op tracer if tracing is disabled
 */
export function getTracer(name: string): any {
  if (!trace) {
    // Return no-op tracer
    return {
      startActiveSpan<T>(
        _name: string,
        fn: (span: any) => T,
        _context?: any
      ): T {
        return fn(null);
      },
    };
  }

  return trace.trace.getTracer(name);
}

/**
 * Wrap a function with a span
 */
export async function withSpan<T>(
  name: string,
  fn: (span: any) => Promise<T>,
  attributes?: Record<string, string | number>
): Promise<T> {
  const tracer = getTracer('pptx-conversion-service');

  if (!trace || typeof tracer.startActiveSpan !== 'function') {
    // No tracing available, execute function directly
    return fn(null);
  }

  return tracer.startActiveSpan(name, async (span: any) => {
    try {
      if (attributes && span && typeof span === 'object') {
        // Set attributes if span is available
        Object.entries(attributes).forEach(([key, value]) => {
          if (span && 'setAttribute' in span && typeof span.setAttribute === 'function') {
            span.setAttribute(key, value);
          }
        });
      }

      const result = await fn(span);
      return result;
    } catch (error) {
      if (span && typeof span === 'object' && 'recordException' in span && typeof span.recordException === 'function') {
        span.recordException(error);
      }
      throw error;
    } finally {
      if (span && typeof span === 'object' && 'end' in span && typeof span.end === 'function') {
        span.end();
      }
    }
  });
}

/**
 * Create a child span manually (simplified version)
 */
export function createSpan(_name: string, _parentSpan?: any): any {
  // Simplified implementation - returns null for now
  return null;
}

export default {
  getTracer,
  withSpan,
  createSpan,
};
