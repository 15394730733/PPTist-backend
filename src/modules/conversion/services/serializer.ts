import type { Slide, PPTistPresentation, MediaMap } from '../types/pptist.js'
import type { ConversionContext } from '../../../types/index.js'

const VERSION = '1.0.0'

/**
 * Serialize slides to PPTist presentation format
 */
export function serializePresentation(
  slides: Slide[],
  context: ConversionContext,
  warnings: string[] = []
): PPTistPresentation {
  // Build media map from context
  const media: MediaMap = {}
  for (const [id, data] of context.mediaMap) {
    media[id] = {
      type: data.type as 'image' | 'video' | 'audio',
      data: data.data,
      mimeType: data.mimeType,
    }
  }

  // Extract warning strings
  const warningStrings =
    warnings.length > 0
      ? warnings
      : context.warnings.map((w) => `${w.code}: ${w.message}`)

  const presentation: PPTistPresentation = {
    slides,
    media,
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
  mediaCount: number
  warningCount: number
} {
  let elementCount = 0
  for (const slide of presentation.slides) {
    elementCount += slide.elements.length
  }

  return {
    slideCount: presentation.slides.length,
    elementCount,
    mediaCount: Object.keys(presentation.media).length,
    warningCount: presentation.warnings.length,
  }
}

export default {
  serializePresentation,
  toJson,
  getStats,
}
