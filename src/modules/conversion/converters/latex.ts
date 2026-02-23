import { registerConverter } from './index.js'
import type { PPTXLatexElement, PPTXElement } from '../types/pptx.js'
import type { PPTLatexElement } from '../types/pptist.js'
import type { ConversionContext } from '../../../types/index.js'
import { v4 as uuidv4 } from 'uuid'
import { createEmuConverters } from '../utils/geometry.js'

/**
 * Detect if element is a latex element
 */
function isLatexElement(element: PPTXElement): element is PPTXLatexElement {
  return element.type === 'latex'
}

/**
 * Convert PPTX latex element to PPTist latex element
 * Note: PPTX stores LaTeX as embedded OLE objects or MathML
 * This converter handles basic conversion
 */
function convertLatex(element: PPTXLatexElement, context: ConversionContext): PPTLatexElement | null {
  const { transform, latex, path } = element
  const { toPixelX, toPixelY } = createEmuConverters(context.slideSize)

  // If no latex content or path, skip this element
  if (!latex && !path) {
    return null
  }

  const pptistLatex: PPTLatexElement = {
    id: uuidv4(),
    type: 'latex',
    left: toPixelX(transform.x),
    top: toPixelY(transform.y),
    width: toPixelX(transform.width),
    height: toPixelY(transform.height),
    rotate: transform.rotation || 0,
    latex: latex || '',
    path: path || '',
    color: '000000',
    strokeWidth: 1,
    viewBox: [1000, 1000],
    fixedRatio: true,
  }

  return pptistLatex
}

/**
 * Register latex converter
 */
export function registerLatexConverter(): void {
  registerConverter(
    (element, context) => convertLatex(element as PPTXLatexElement, context),
    isLatexElement,
    5
  )
}

export default { registerLatexConverter, convertLatex, isLatexElement }
