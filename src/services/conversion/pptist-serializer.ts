/**
 * PPTist Format Serializer
 *
 * Converts internal presentation data to PPTist-compatible JSON format.
 * This format matches the internal element types (PPTShapeElement, PPTTextElement, etc.)
 * used by the PPTist frontend.
 *
 * @module services/conversion/pptist-serializer
 */

import type { Presentation, Slide } from '../../types/presentations';
import type { ConversionMetadata, ConversionWarning } from '../../models';

/**
 * Default theme values
 */
const DEFAULT_THEME = {
  width: 1280,
  height: 720,
  fontName: '微软雅黑',
  fontColor: '#000000',
};

/**
 * Convert shape element to PPTist format
 */
function convertShapeElement(element: any): any {
  const {
    id,
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    rotate = 0,
    locked = false,
    visible = true,
    fill,
    outline,
    text,
    shape,
  } = element;

  // Build basic shape element
  const pptistShape: any = {
    type: 'shape',
    id: id || `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    left: x,
    top: y,
    width,
    height,
    rotate,
    lock: locked || undefined,
    viewBox: [200, 200],
    path: 'M 0 0 L 200 0 L 200 200 L 0 200 Z', // Default rectangle path
    fixedRatio: false,
    fill: extractFillColor(fill) || '#ffffff',
    outline: outline ? {
      width: outline.width || 1,
      style: outline.style || 'solid',
      color: outline.color || '#000000',
    } : undefined,
  };

  // Add text if present
  if (text && typeof text === 'string') {
    pptistShape.text = {
      content: escapeHtml(text),
      defaultFontName: DEFAULT_THEME.fontName,
      defaultColor: DEFAULT_THEME.fontColor,
      align: 'middle',
    };
  }

  return pptistShape;
}

/**
 * Convert text element to PPTist format
 */
function convertTextElement(element: any): any {
  const {
    id,
    x = 0,
    y = 0,
    width = 100,
    height = 50,
    rotate = 0,
    locked = false,
    visible = true,
    text,
    fill,
    outline,
  } = element;

  return {
    type: 'text',
    id: id || `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    left: x,
    top: y,
    width,
    height,
    rotate,
    lock: locked || undefined,
    content: text ? escapeHtml(text) : '',
    defaultFontName: DEFAULT_THEME.fontName,
    defaultColor: DEFAULT_THEME.fontColor,
    outline: outline ? {
      width: outline.width || 1,
      style: outline.style || 'solid',
      color: outline.color || '#000000',
    } : undefined,
    fill: extractFillColor(fill) || undefined,
    lineHeight: 1.5,
  };
}

/**
 * Convert image element to PPTist format
 */
function convertImageElement(element: any): any {
  const {
    id,
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    rotate = 0,
    locked = false,
    visible = true,
    src = '',
  } = element;

  return {
    type: 'image',
    id: id || `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    left: x,
    top: y,
    width,
    height,
    rotate,
    lock: locked || undefined,
    fixedRatio: true,
    src,
  };
}

/**
 * Convert line element to PPTist format
 */
function convertLineElement(element: any): any {
  const {
    id,
    startX = 0,
    startY = 0,
    endX = 100,
    endY = 100,
    width = 2,
    color = '#000000',
    style = 'solid',
  } = element;

  return {
    type: 'line',
    id: id || `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    left: Math.min(startX, endX),
    top: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
    start: [0, 0],
    end: [endX - startX, endY - startY],
    style,
    color,
    points: ['', ''],
  };
}

/**
 * Extract fill color from fill object
 */
function extractFillColor(fill: any): string | undefined {
  if (!fill) return undefined;

  if (typeof fill === 'string') {
    return fill;
  }

  if (fill.type === 'solid' && fill.color) {
    return fill.color;
  }

  return undefined;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Convert slide element to PPTist format
 */
function convertSlideElement(element: any): any | null {
  if (!element || !element.type) {
    return null;
  }

  switch (element.type) {
    case 'shape':
      return convertShapeElement(element);
    case 'text':
      return convertTextElement(element);
    case 'image':
      return convertImageElement(element);
    case 'line':
      return convertLineElement(element);
    default:
      console.warn(`Unknown element type: ${element.type}`);
      return null;
  }
}

/**
 * Convert slide background to PPTist format
 */
function convertBackground(background: any): any {
  if (!background) {
    return {
      type: 'solid',
      color: '#ffffff',
    };
  }

  if (background.type === 'solid' && background.color) {
    return {
      type: 'solid',
      color: background.color,
    };
  }

  if (background.type === 'gradient') {
    return {
      type: 'gradient',
      gradient: {
        type: background.value?.path === 'line' ? 'linear' : 'radial',
        colors: (background.value?.colors || []).map((c: any) => ({
          ...c,
          pos: parseInt(c.pos) || 0,
        })),
        rotate: (background.value?.rot || 0) + 90,
      },
    };
  }

  if (background.type === 'image') {
    return {
      type: 'image',
      image: {
        src: background.value?.picBase64 || '',
        size: 'cover',
      },
    };
  }

  return {
    type: 'solid',
    color: '#ffffff',
  };
}

/**
 * Convert slide to PPTist format
 */
function convertSlide(slide: Slide): any {
  const elements = (slide.elements || [])
    .map(convertSlideElement)
    .filter((el): el is any => el !== null);

  return {
    id: slide.id,
    elements,
    background: convertBackground(slide.background),
    remark: slide.notes || '',
  };
}

/**
 * Serialize presentation data to PPTist JSON format
 *
 * @param presentation - Presentation data
 * @param metadata - Conversion metadata
 * @param warnings - Conversion warnings
 * @returns PPTist-compatible JSON object
 */
export function serializeToPPTistFormat(
  presentation: Presentation,
  metadata: ConversionMetadata,
  warnings?: ConversionWarning[]
): any {
  // Convert slides
  const slides = (presentation.slides || []).map(convertSlide);

  // Build PPTist format
  const pptistData = {
    slides,
    theme: {
      width: presentation.width || DEFAULT_THEME.width,
      height: presentation.height || DEFAULT_THEME.height,
      fontName: DEFAULT_THEME.fontName,
      fontColor: DEFAULT_THEME.fontColor,
    },
  };

  return pptistData;
}
