import type { PPTXElement } from '../types/pptx.js'
import type { WarningInfo } from '../../../types/index.js'
import { Warnings } from '../../../utils/errors.js'

/**
 * Check if element is an unsupported type
 */
export function isUnsupportedElement(element: PPTXElement): boolean {
  // SmartArt detection
  if (element.type === 'shape') {
    const shapeEl = element as any
    if (shapeEl.shapeType?.toLowerCase().includes('smartart')) {
      return true
    }
  }

  // Add more unsupported element types here
  return false
}

/**
 * Detect unsupported elements in a slide
 */
export function detectUnsupportedElements(
  elements: PPTXElement[]
): { element: PPTXElement; reason: string }[] {
  const unsupported: { element: PPTXElement; reason: string }[] = []

  for (const element of elements) {
    if (element.type === 'shape') {
      const shapeEl = element as any
      if (shapeEl.shapeType?.toLowerCase().includes('smartart')) {
        unsupported.push({
          element,
          reason: 'SmartArt',
        })
      }
    }

    // Add more detection logic here for:
    // - Macros/VBA
    // - ActiveX controls
    // - Embedded objects
  }

  return unsupported
}

/**
 * Generate warnings for unsupported elements
 */
export function generateUnsupportedWarnings(
  unsupportedElements: { element: PPTXElement; reason: string }[]
): WarningInfo[] {
  const warnings: WarningInfo[] = []
  const counts: Map<string, number> = new Map()

  for (const { reason } of unsupportedElements) {
    counts.set(reason, (counts.get(reason) || 0) + 1)
  }

  for (const [reason, count] of counts) {
    switch (reason) {
      case 'SmartArt':
        warnings.push(Warnings.smartArtSkipped(count).toInfo())
        break
      case 'Macro':
        warnings.push(Warnings.macroSkipped(count).toInfo())
        break
      case 'ActiveX':
        warnings.push(Warnings.activeXSkipped(count).toInfo())
        break
      default:
        warnings.push({
          code: 'WARN_SMARTART_SKIPPED', // Default warning
          message: `${reason} elements were skipped`,
          count,
        })
    }
  }

  return warnings
}

/**
 * Check for and report unsupported elements
 */
export function checkAndReportUnsupported(
  elements: PPTXElement[],
  warnings: WarningInfo[]
): PPTXElement[] {
  const unsupported = detectUnsupportedElements(elements)

  if (unsupported.length > 0) {
    const unsupportedWarnings = generateUnsupportedWarnings(unsupported)
    warnings.push(...unsupportedWarnings)

    // Filter out unsupported elements
    const unsupportedIds = new Set(unsupported.map((u) => u.element.id))
    return elements.filter((e) => !unsupportedIds.has(e.id))
  }

  return elements
}

export default {
  isUnsupportedElement,
  detectUnsupportedElements,
  generateUnsupportedWarnings,
  checkAndReportUnsupported,
}
