import type { ErrorCode, WarningCode, ErrorResponse, WarningInfo } from '../types/index.js'

/**
 * Custom error class for conversion errors
 */
export class ConversionError extends Error {
  public readonly code: ErrorCode
  public readonly suggestion?: string

  constructor(code: ErrorCode, message: string, suggestion?: string) {
    super(message)
    this.name = 'ConversionError'
    this.code = code
    this.suggestion = suggestion
  }

  /**
   * Convert error to API response format
   */
  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        suggestion: this.suggestion,
      },
    }
  }

  /**
   * Create error with HTTP status code mapping
   */
  getStatusCode(): number {
    const statusMap: Record<ErrorCode, number> = {
      ERR_INVALID_FORMAT: 400,
      ERR_FILE_TOO_LARGE: 413,
      ERR_PROTECTED_FILE: 400,
      ERR_CORRUPTED_FILE: 400,
      ERR_EMPTY_FILE: 400,
      ERR_CONVERSION_FAILED: 500,
    }
    return statusMap[this.code]
  }
}

/**
 * Warning class for non-fatal conversion issues
 */
export class ConversionWarning {
  public readonly code: WarningCode
  public readonly message: string
  public readonly count?: number

  constructor(code: WarningCode, message: string, count?: number) {
    this.code = code
    this.message = message
    this.count = count
  }

  /**
   * Convert to string format for API response
   */
  toString(): string {
    if (this.count !== undefined) {
      return `${this.code}: ${this.message} (${this.count} instances)`
    }
    return `${this.code}: ${this.message}`
  }

  /**
   * Convert to info object
   */
  toInfo(): WarningInfo {
    return {
      code: this.code,
      message: this.message,
      count: this.count,
    }
  }
}

// Pre-defined error factories
export const Errors = {
  invalidFormat: (detail?: string) =>
    new ConversionError(
      'ERR_INVALID_FORMAT',
      detail || 'File is not a valid PPTX',
      'Please upload a PowerPoint (.pptx) file'
    ),

  fileTooLarge: (maxSize: string = '50MB') =>
    new ConversionError(
      'ERR_FILE_TOO_LARGE',
      `File exceeds ${maxSize} limit`,
      'Please compress your presentation or reduce media content'
    ),

  protectedFile: () =>
    new ConversionError(
      'ERR_PROTECTED_FILE',
      'Password-protected files are not supported',
      'Please remove password protection and try again'
    ),

  corruptedFile: () =>
    new ConversionError(
      'ERR_CORRUPTED_FILE',
      'File is corrupted or unreadable',
      'Please verify the file can be opened in PowerPoint'
    ),

  emptyFile: () =>
    new ConversionError(
      'ERR_EMPTY_FILE',
      'File is empty or contains no slides',
      'Please upload a presentation with at least one slide'
    ),

  conversionFailed: (detail?: string) =>
    new ConversionError(
      'ERR_CONVERSION_FAILED',
      detail || 'An unexpected error occurred during conversion',
      'Please try again or contact support if the problem persists'
    ),
}

// Pre-defined warning factories
export const Warnings = {
  smartArtSkipped: (count?: number) =>
    new ConversionWarning(
      'WARN_SMARTART_SKIPPED',
      'SmartArt elements were skipped',
      count
    ),

  macroSkipped: (count?: number) =>
    new ConversionWarning(
      'WARN_MACRO_SKIPPED',
      'Macro/VBA elements were skipped',
      count
    ),

  activeXSkipped: (count?: number) =>
    new ConversionWarning(
      'WARN_ACTIVEX_SKIPPED',
      'ActiveX controls were skipped',
      count
    ),

  fontFallback: (count?: number) =>
    new ConversionWarning(
      'WARN_FONT_FALLBACK',
      'Some fonts were replaced with system defaults',
      count
    ),
}
