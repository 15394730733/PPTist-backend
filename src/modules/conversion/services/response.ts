import type { FastifyReply } from 'fastify'
import type { PPTistPresentation } from '../types/pptist.js'
import type { OutputFormat, DualOutputResponse } from '../types/response.js'
import { RESPONSE_HEADERS, parseFormatParam } from '../types/response.js'
import { encryptPresentation } from './encryptor.js'
import { getConfig } from '../../../config/index.js'

/**
 * Format conversion result as dual output (both JSON and encrypted)
 */
export function formatDual(presentation: PPTistPresentation): DualOutputResponse {
  const pptist = encryptPresentation(presentation)

  return {
    json: presentation,
    pptist,
  }
}

/**
 * Format conversion result as JSON only
 */
export function formatJson(presentation: PPTistPresentation): PPTistPresentation {
  return presentation
}

/**
 * Format conversion result as encrypted PPTist only
 */
export function formatPptist(presentation: PPTistPresentation): string {
  return encryptPresentation(presentation)
}

/**
 * Format and send response based on requested format
 */
export function formatResponse(
  presentation: PPTistPresentation,
  format: OutputFormat,
  reply: FastifyReply
): void {
  // Set headers based on format
  const headers = RESPONSE_HEADERS[format]
  for (const [key, value] of Object.entries(headers)) {
    reply.header(key, value)
  }

  switch (format) {
    case 'both': {
      const dual = formatDual(presentation)
      reply.send(dual)
      break
    }

    case 'json': {
      const json = formatJson(presentation)
      reply.send(json)
      break
    }

    case 'pptist':
    default: {
      const pptist = formatPptist(presentation)
      reply.send(pptist)
      break
    }
  }
}

/**
 * Get output format from query parameter or config default
 */
export function getOutputFormat(formatParam: string | undefined): OutputFormat {
  const config = getConfig()

  // If format parameter provided, validate and use it
  if (formatParam) {
    return parseFormatParam(formatParam)
  }

  // Otherwise use default from config
  const defaultFormat = config.DEFAULT_OUTPUT_FORMAT || 'pptist'

  // Validate config default
  if (
    defaultFormat === 'both' ||
    defaultFormat === 'json' ||
    defaultFormat === 'pptist'
  ) {
    return defaultFormat
  }

  // Fallback to pptist for backward compatibility
  return 'pptist'
}

export default {
  formatDual,
  formatJson,
  formatPptist,
  formatResponse,
  getOutputFormat,
}
