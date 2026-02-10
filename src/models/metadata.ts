/**
 * Conversion Metadata Model
 */

export interface ConversionMetadata {
  sourceFilename: string;
  sourceFormat: string;
  targetFormat: string;
  slideCount: number;
  elementCount: number;
  totalElements: number;
  processingDuration: number;
  fileSize: number;
  jsonSize: number;
  hasMedia: boolean;
  mediaCount: number;
  hasEncrypted: boolean;
  hasMacros: boolean;
  conversionDate: string;
  pptistVersion: string;
  elementCounts?: Record<string, number>;
  elementCountsBySlide?: Array<{ slideId: string; count: number }>;

  // Legacy fields for backward compatibility
  processingTime?: number;
  conversionWarnings?: number;
}

/**
 * Create conversion metadata object
 */
export function createConversionMetadata(options: {
  elements: Array<{ type: string; id: string }>;
  slideCount: number;
  processingTime: number;
  fileSize: number;
  warnings?: any[];
}): ConversionMetadata {
  // Count elements by type
  const elementCounts: Record<string, number> = {
    text: 0,
    image: 0,
    shape: 0,
    line: 0,
    chart: 0,
    table: 0,
    video: 0,
    audio: 0,
  };

  for (const element of options.elements) {
    const type = element.type;
    if (type in elementCounts) {
      elementCounts[type]++;
    } else {
      elementCounts[type] = (elementCounts[type] || 0) + 1;
    }
  }

  const totalElements = options.elements.length;

  return {
    sourceFilename: '',
    sourceFormat: 'pptx',
    targetFormat: 'pptist',
    slideCount: options.slideCount,
    elementCount: totalElements,
    totalElements,
    processingDuration: options.processingTime,
    fileSize: options.fileSize,
    jsonSize: 0,
    hasMedia: elementCounts.image > 0 || elementCounts.video > 0 || elementCounts.audio > 0,
    mediaCount: elementCounts.image + elementCounts.video + elementCounts.audio,
    hasEncrypted: false,
    hasMacros: false,
    conversionDate: new Date().toISOString(),
    pptistVersion: '1.0.0',
    elementCounts,
    elementCountsBySlide: [],

    // Legacy fields
    processingTime: options.processingTime,
    conversionWarnings: options.warnings?.length || 0,
  };
}
