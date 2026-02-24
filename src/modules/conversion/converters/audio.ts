import { registerConverter } from './index.js'
import type { PPTXAudioElement, PPTXElement } from '../types/pptx.js'
import type { PPTAudioElement } from '../types/pptist.js'
import type { ConversionContext } from '../../../types/index.js'
import { createEmuConverters } from '../utils/geometry.js'

/**
 * Detect if element is an audio element
 */
function isAudioElement(element: PPTXElement): element is PPTXAudioElement {
  return element.type === 'audio'
}

/**
 * Convert PPTX audio element to PPTist audio element
 */
function convertAudio(element: PPTXAudioElement, context: ConversionContext): PPTAudioElement {
  const { transform, rId, contentType } = element
  const { toPixelX, toPixelY } = createEmuConverters()

  // Get audio data from context
  const media = context.mediaMap.get(rId)
  let src = ''

  if (media) {
    src = `data:${media.mimeType};base64,${media.data}`
  }

  // Extract extension from content type
  const ext = contentType?.split('/')[1] || 'mp3'

  const pptistAudio: PPTAudioElement = {
    id: context.requestId + '_audio_' + rId,
    type: 'audio',
    left: toPixelX(transform.x),
    top: toPixelY(transform.y),
    width: toPixelX(transform.width),
    height: toPixelY(transform.height),
    rotate: transform.rotation || 0,
    fixedRatio: true,
    color: '#666666', // Default audio icon color
    loop: false,
    autoplay: false,
    src,
    ext,
  }

  return pptistAudio
}

/**
 * Register audio converter
 */
export function registerAudioConverter(): void {
  registerConverter(
    (element, context) => convertAudio(element as PPTXAudioElement, context),
    isAudioElement,
    8
  )
}

export default { registerAudioConverter, convertAudio, isAudioElement }
