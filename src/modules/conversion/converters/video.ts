import { registerConverter } from './index.js'
import type { PPTXVideoElement, PPTXElement } from '../types/pptx.js'
import type { PPTVideoElement } from '../types/pptist.js'
import type { ConversionContext } from '../../../types/index.js'
import { createEmuConverters } from '../utils/geometry.js'

/**
 * Detect if element is a video element
 */
function isVideoElement(element: PPTXElement): element is PPTXVideoElement {
  return element.type === 'video'
}

/**
 * Convert PPTX video element to PPTist video element
 */
function convertVideo(element: PPTXVideoElement, context: ConversionContext): PPTVideoElement {
  const { transform, rId, contentType, posterRId } = element
  const { toPixelX, toPixelY } = createEmuConverters(context.slideSize)

  // Get video data from context
  const media = context.mediaMap.get(rId)
  let src = ''

  if (media) {
    src = `data:${media.mimeType};base64,${media.data}`
  }

  // Get poster image if available
  let poster: string | undefined
  if (posterRId) {
    const posterMedia = context.mediaMap.get(posterRId)
    if (posterMedia) {
      poster = `data:${posterMedia.mimeType};base64,${posterMedia.data}`
    }
  }

  // Extract extension from content type
  const ext = contentType?.split('/')[1] || 'mp4'

  const pptistVideo: PPTVideoElement = {
    id: context.requestId + '_video_' + rId,
    type: 'video',
    left: toPixelX(transform.x),
    top: toPixelY(transform.y),
    width: toPixelX(transform.width),
    height: toPixelY(transform.height),
    rotate: transform.rotation || 0,
    src,
    autoplay: false,
    poster,
    ext,
  }

  return pptistVideo
}

/**
 * Register video converter
 */
export function registerVideoConverter(): void {
  registerConverter(
    (element, context) => convertVideo(element as PPTXVideoElement, context),
    isVideoElement,
    8
  )
}

export default { registerVideoConverter, convertVideo, isVideoElement }
