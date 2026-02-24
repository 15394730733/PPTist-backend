import { registerConverter } from './index.js'
import type { PPTXImageElement, PPTXElement } from '../types/pptx.js'
import type { PPTImageElement } from '../types/pptist.js'
import type { ConversionContext } from '../../../types/index.js'
import { createEmuConverters } from '../utils/geometry.js'

/**
 * Detect if element is an image element
 */
function isImageElement(element: PPTXElement): element is PPTXImageElement {
  return element.type === 'image'
}

/**
 * Convert PPTX image element to PPTist image element
 */
function convertImage(element: PPTXImageElement, context: ConversionContext): PPTImageElement {
  const { transform, rId } = element
  const { toPixelX, toPixelY } = createEmuConverters()

  // 使用 slideIndex_rId 组合键查找媒体（避免不同幻灯片 rId 冲突）
  const mediaKey = `${context.currentSlideIndex}_${rId}`
  const media = context.mediaMap.get(mediaKey)
  let src = ''

  if (media) {
    // Create data URL
    src = `data:${media.mimeType};base64,${media.data}`
  }

  const pptistImage: PPTImageElement = {
    id: context.requestId + '_img_' + mediaKey,
    type: 'image',
    left: toPixelX(transform.x),
    top: toPixelY(transform.y),
    width: toPixelX(transform.width),
    height: toPixelY(transform.height),
    rotate: transform.rotation || 0,
    fixedRatio: true,
    src,
    outline: { style: 'solid', width: 0, color: 'transparent' },
  }

  return pptistImage
}

/**
 * Register image converter
 */
export function registerImageConverter(): void {
  registerConverter(
    (element, context) => convertImage(element as PPTXImageElement, context),
    isImageElement,
    8 // High priority
  )
}

export default { registerImageConverter, convertImage, isImageElement }
