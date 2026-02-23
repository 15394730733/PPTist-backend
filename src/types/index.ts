// Error codes for conversion service
export type ErrorCode =
  | 'ERR_INVALID_FORMAT'
  | 'ERR_FILE_TOO_LARGE'
  | 'ERR_PROTECTED_FILE'
  | 'ERR_CORRUPTED_FILE'
  | 'ERR_EMPTY_FILE'
  | 'ERR_CONVERSION_FAILED'

// Warning codes for non-fatal issues
export type WarningCode =
  | 'WARN_SMARTART_SKIPPED'
  | 'WARN_MACRO_SKIPPED'
  | 'WARN_ACTIVEX_SKIPPED'
  | 'WARN_FONT_FALLBACK'

// Environment configuration schema
export interface EnvConfig {
  PORT: number
  HOST: string
  MAX_FILE_SIZE: number
  CRYPTO_KEY: string
  RATE_LIMIT_MAX: number
  RATE_LIMIT_WINDOW: number
  LOG_LEVEL: string
  DEFAULT_OUTPUT_FORMAT: 'both' | 'json' | 'pptist'
}

// API response types
export interface ErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string
    suggestion?: string
  }
  warnings?: string[]
}

export interface WarningInfo {
  code: WarningCode
  message: string
  count?: number
}

// Conversion context passed through the pipeline
export interface ConversionContext {
  requestId: string
  startTime: number
  warnings: WarningInfo[]
  mediaMap: Map<string, { type: string; data: string; mimeType: string }>
  // 原始 PPTX 幻灯片尺寸（EMU 单位）
  slideSize: {
    width: number   // EMU
    height: number  // EMU
  }
  // 当前处理的幻灯片索引（用于媒体查找的组合键）
  currentSlideIndex: number
}
