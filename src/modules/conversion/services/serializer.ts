import type { Slide, PPTistPresentation } from '../types/pptist.js'
import type { ConversionContext } from '../../../types/index.js'

const VERSION = '1.0.0'

/**
 * EMU 到像素的标准转换比例（基于 96 DPI）
 */
const EMU_TO_PIXEL = 1 / 9525

/**
 * Serialize slides to PPTist presentation format
 */
export function serializePresentation(
  slides: Slide[],
  context: ConversionContext,
  warnings: string[] = []
): PPTistPresentation {
  // Extract warning strings
  const warningStrings =
    warnings.length > 0
      ? warnings
      : context.warnings.map((w) => `${w.code}: ${w.message}`)

  const presentation: PPTistPresentation = {
    slides,
    size: {
      width: Math.round(context.slideSize.width * EMU_TO_PIXEL),
      height: Math.round(context.slideSize.height * EMU_TO_PIXEL),
    },
    metadata: {
      sourceFormat: 'pptx',
      convertedAt: new Date().toISOString(),
      version: VERSION,
    },
    warnings: warningStrings,
  }

  return presentation
}

/**
 * Convert presentation to JSON string
 */
export function toJson(presentation: PPTistPresentation): string {
  return JSON.stringify(presentation, null, 0)
}

/**
 * Calculate presentation statistics
 */
export function getStats(presentation: PPTistPresentation): {
  slideCount: number
  elementCount: number
  warningCount: number
  size: { width: number; height: number }
} {
  let elementCount = 0
  for (const slide of presentation.slides) {
    elementCount += slide.elements.length
  }

  return {
    slideCount: presentation.slides.length,
    elementCount,
    warningCount: presentation.warnings.length,
    size: presentation.size,
  }
}

export default {
  serializePresentation,
  toJson,
  getStats,
}
