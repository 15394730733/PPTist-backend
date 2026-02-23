import type { PPTXElement } from '../types/pptx.js'
import type { PPTElement } from '../types/pptist.js'
import type { ConversionContext } from '../../../types/index.js'

/**
 * Converter function type
 * Converts a PPTX element to PPTist element(s)
 */
export type ElementConverter = (
  element: PPTXElement,
  context: ConversionContext
) => PPTElement | PPTElement[] | null

/**
 * Element type detector function type
 * Determines the PPTX element type
 */
export type ElementTypeDetector = (element: PPTXElement) => boolean

/**
 * Converter registry entry
 */
interface ConverterEntry {
  converter: ElementConverter
  detector: ElementTypeDetector
  priority: number // Higher priority converters are checked first
}

// Global converter registry
const converters: ConverterEntry[] = []

/**
 * Register a new element converter
 * @param converter - The converter function
 * @param detector - Function to detect if this converter applies
 * @param priority - Priority (higher = checked first)
 */
export function registerConverter(
  converter: ElementConverter,
  detector: ElementTypeDetector,
  priority: number = 0
): void {
  converters.push({ converter, detector, priority })
  // Sort by priority descending
  converters.sort((a, b) => b.priority - a.priority)
}

/**
 * Get the appropriate converter for an element
 * @param element - PPTX element to convert
 * @returns The matching converter or null
 */
export function getConverter(element: PPTXElement): ElementConverter | null {
  for (const entry of converters) {
    if (entry.detector(element)) {
      return entry.converter
    }
  }
  return null
}

/**
 * Convert an element using the registered converters
 * @param element - PPTX element to convert
 * @param context - Conversion context
 * @returns Converted PPTist element(s) or null
 */
export function convertElement(
  element: PPTXElement,
  context: ConversionContext
): PPTElement | PPTElement[] | null {
  const converter = getConverter(element)
  if (!converter) {
    return null
  }
  return converter(element, context)
}

/**
 * Get all registered converters
 */
export function getRegisteredConverters(): ConverterEntry[] {
  return [...converters]
}

/**
 * Clear all registered converters (useful for testing)
 */
export function clearConverters(): void {
  converters.length = 0
}

// Re-export converter utilities
export { registerTextConverter } from './text.js'
export { registerShapeConverter } from './shape.js'
export { registerImageConverter } from './image.js'
export { registerLineConverter } from './line.js'
export { registerVideoConverter } from './video.js'
export { registerAudioConverter } from './audio.js'
export { registerTableConverter } from './table.js'
export { registerChartConverter } from './chart.js'
export { registerLatexConverter } from './latex.js'
