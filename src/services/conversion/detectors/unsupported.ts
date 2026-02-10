/**
 * Unsupported Element Detectors
 *
 * Detects and handles unsupported PPTX elements (SmartArt, 3D models, etc.)
 * Provides graceful degradation strategies.
 *
 * @module services/conversion/detectors/unsupported
 */

import { logger } from '../../../utils/logger';
import type { ParsedElement } from '../../pptx/parser';

/**
 * Unsupported element types
 */
export enum UnsupportedElementType {
  SMARTART = 'smartart',
  DIAGRAM = 'diagram',
  CHART_3D = 'chart3d',
  SHAPE_3D = 'shape3d',
  VIDEO = 'video',
  AUDIO = 'audio',
  OLE_OBJECT = 'oleObject',
  ACTIVEX = 'activex',
  INK = 'ink',
}

/**
 * Degradation strategy
 */
export enum DegradationStrategy {
  IGNORE = 'ignore',           // Skip the element entirely
  PLACEHOLDER = 'placeholder', // Replace with placeholder
  IMAGE = 'image',            // Convert to image if possible
  TEXT_ANNOTATION = 'text',   // Add text annotation
  WARN_ONLY = 'warn',         // Keep but add warning
}

/**
 * Unsupported element info
 */
export interface UnsupportedElement {
  type: UnsupportedElementType;
  element: ParsedElement;
  strategy: DegradationStrategy;
  reason: string;
  suggestedAction?: string;
}

/**
 * Detect unsupported elements in parsed slide
 *
 * @param elements - Parsed elements
 * @returns Array of unsupported elements
 */
export function detectUnsupportedElements(elements: ParsedElement[]): UnsupportedElement[] {
  const unsupported: UnsupportedElement[] = [];

  for (const element of elements) {
    // Detect SmartArt
    if (isSmartArtElement(element)) {
      unsupported.push({
        type: UnsupportedElementType.SMARTART,
        element,
        strategy: DegradationStrategy.IMAGE,
        reason: 'SmartArt conversion not supported',
        suggestedAction: 'Convert to image placeholder',
      });
      logger.debug('Detected SmartArt element (will be degraded to image)', {
        id: element.id,
        name: element.name,
      });
    }

    // Detect 3D shapes
    if (is3DShapeElement(element)) {
      unsupported.push({
        type: UnsupportedElementType.SHAPE_3D,
        element,
        strategy: DegradationStrategy.PLACEHOLDER,
        reason: '3D shapes not fully supported',
        suggestedAction: 'Replace with 2D placeholder',
      });
      logger.debug('Detected 3D shape (will be replaced with placeholder)', {
        id: element.id,
        name: element.name,
      });
    }

    // Detect OLE objects
    if (isOLEObjectElement(element)) {
      unsupported.push({
        type: UnsupportedElementType.OLE_OBJECT,
        element,
        strategy: DegradationStrategy.IGNORE,
        reason: 'OLE objects not supported',
        suggestedAction: 'Remove or replace with image',
      });
      logger.debug('Detected OLE object (will be ignored)', {
        id: element.id,
        name: element.name,
      });
    }

    // Detect ActiveX controls
    if (isActiveXElement(element)) {
      unsupported.push({
        type: UnsupportedElementType.ACTIVEX,
        element,
        strategy: DegradationStrategy.IGNORE,
        reason: 'ActiveX controls not supported for security reasons',
        suggestedAction: 'Remove or replace with HTML alternative',
      });
      logger.debug('Detected ActiveX control (will be ignored)', {
        id: element.id,
        name: element.name,
      });
    }

    // Detect embedded video/audio (warn only)
    if (isMediaElement(element)) {
      unsupported.push({
        type: element.type === ElementType.VIDEO
          ? UnsupportedElementType.VIDEO
          : UnsupportedElementType.AUDIO,
        element,
        strategy: DegradationStrategy.WARN_ONLY,
        reason: 'Media files may not be embedded correctly',
        suggestedAction: 'Verify media links after conversion',
      });
      logger.debug('Detected media element (warning added)', {
        id: element.id,
        type: element.type,
      });
    }
  }

  if (unsupported.length > 0) {
    logger.info('Detected unsupported elements', {
      count: unsupported.length,
      types: unsupported.map((u) => u.type),
    });
  }

  return unsupported;
}

/**
 * Apply degradation strategy to unsupported element
 *
 * @param unsupported - Unsupported element info
 * @returns Degraded element or null (if strategy is IGNORE)
 */
export function applyDegradationStrategy(
  unsupported: UnsupportedElement
): Partial<ParsedElement> | null {
  const { element, strategy } = unsupported;

  switch (strategy) {
    case DegradationStrategy.IGNORE:
      // Return null to remove element
      return null;

    case DegradationStrategy.PLACEHOLDER:
      // Convert to placeholder shape
      return {
        id: element.id,
        type: 'shape' as any,
        name: element.name || `${unsupported.type} placeholder`,
        position: element.position,
        size: element.size,
        shapeType: 'rectangle',
        fill: { type: 'solid', color: '#f0f0f0' },
        outline: { width: 1, color: '#cccccc', style: 'dashed' },
        textBox: {
          paragraphs: [{
            text: `[${unsupported.type} not supported]`,
            runs: [{ text: `[${unsupported.type} not supported]` }],
          }],
        },
      } as any;

    case DegradationStrategy.IMAGE:
      // Add metadata indicating this should be an image
      return {
        ...element,
        _degraded: true,
        _degradedFrom: unsupported.type,
        _suggestedAction: unsupported.suggestedAction,
      };

    case DegradationStrategy.TEXT_ANNOTATION:
      // Add text annotation
      return {
        ...element,
        name: `${element.name || 'Element'} (${unsupported.type})`,
        _degraded: true,
        _degradedFrom: unsupported.type,
      };

    case DegradationStrategy.WARN_ONLY:
      // Keep element but mark for warning
      return {
        ...element,
        _unsupported: true,
        _unsupportedType: unsupported.type,
      };

    default:
      return element;
  }
}

/**
 * Check if element is SmartArt
 */
function isSmartArtElement(element: ParsedElement): boolean {
  // SmartArt often has specific shape types or properties
  return (
    element.shapeType?.toLowerCase().includes('smartart') ||
    element.name?.toLowerCase().includes('smartart') ||
    element.type === 'group' // SmartArt is often wrapped in a group
  );
}

/**
 * Check if element is 3D shape
 */
function is3DShapeElement(element: ParsedElement): boolean {
  return (
    element.shapeType?.toLowerCase().includes('3d') ||
    element.name?.toLowerCase().includes('3d')
  );
}

/**
 * Check if element is OLE object
 */
function isOLEObjectElement(element: ParsedElement): boolean {
  const elementType = (element as any).type;
  const elementName = (element.name || '').toLowerCase();
  return (
    elementType === 'oleobject' ||
    elementName.includes('ole object')
  );
}

/**
 * Check if element is ActiveX control
 */
function isActiveXElement(element: ParsedElement): boolean {
  const elementType = (element as any).type;
  const elementName = (element.name || '').toLowerCase();
  return (
    elementType === 'activex' ||
    elementName.includes('activex')
  );
}

/**
 * Check if element is media (video/audio)
 */
function isMediaElement(element: ParsedElement): boolean {
  return element.type === 'video' || element.type === 'audio';
}

/**
 * Import for ElementType
 */
import { ElementType } from '../../../types/converters';
