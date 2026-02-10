/**
 * Request ID Middleware
 *
 * Generates unique request IDs and adds them to requests and responses.
 * Enables distributed tracing of conversion requests.
 *
 * @module middleware/request-id
 */

import { randomUUID } from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Request-ID header name
 */
const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Add request ID middleware
 *
 * @param request - Fastify request
 * @param reply - Fastify reply
 * @param done - Callback function
 */
export function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
): void {
  // Get or generate request ID
  const requestId =
    (request.headers[REQUEST_ID_HEADER] as string) ||
    request.id ||
    randomUUID();

  // Add to request object
  request.id = requestId;

  // Add to response headers
  reply.header(REQUEST_ID_HEADER, requestId);

  // Log request ID
  if (request.log) {
    request.log.info({ requestId }, 'Incoming request');
  }

  done();
}

/**
 * Generate request ID for manual use
 *
 * @returns Random UUID
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Get request ID from request
 *
 * @param request - Fastify request
 * @returns Request ID
 */
export function getRequestId(request: FastifyRequest): string {
  return request.id || 'unknown';
}

export default requestIdMiddleware;
