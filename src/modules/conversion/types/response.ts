import type { PPTistPresentation } from './pptist.js'

/**
 * Output format options
 */
export type OutputFormat = 'both' | 'json' | 'pptist'

/**
 * Dual output response - contains both JSON and encrypted formats
 */
export interface DualOutputResponse {
  json: PPTistPresentation
  pptist: string // AES encrypted string
}

/**
 * Response types based on format
 */
export type ConversionResponse =
  | DualOutputResponse    // format=both
  | PPTistPresentation   // format=json
  | string               // format=pptist (encrypted string)

/**
 * Response format configuration
 */
export interface ResponseFormatConfig {
  format: OutputFormat
  filename: string
}

/**
 * HTTP response headers by format
 */
export const RESPONSE_HEADERS: Record<OutputFormat, Record<string, string>> = {
  both: {
    'Content-Type': 'application/json; charset=utf-8',
  },
  json: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': 'attachment; filename="pptist-Conversion.json"',
  },
  pptist: {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': 'attachment; filename="pptist-Conversion.pptist"',
  },
}

/**
 * Type guard for dual output response
 */
export function isDualOutput(response: unknown): response is DualOutputResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'json' in response &&
    'pptist' in response
  )
}

/**
 * Type guard for single JSON response
 */
export function isSingleJson(response: unknown): response is PPTistPresentation {
  return (
    typeof response === 'object' &&
    response !== null &&
    'slides' in response &&
    !('pptist' in response)
  )
}

/**
 * Parse and validate format parameter
 */
export function parseFormatParam(format: string | undefined): OutputFormat {
  if (!format) return 'pptist' // Default for backward compatibility

  const normalized = format.toLowerCase().trim()

  if (normalized === 'both' || normalized === 'json' || normalized === 'pptist') {
    return normalized
  }

  return 'pptist' // Invalid format defaults to pptist for backward compatibility
}
