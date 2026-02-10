/**
 * Metadata Collector
 *
 * Collects metadata about the conversion process and result.
 *
 * @module services/conversion/collector
 */

import type { PPTistPresentation } from '../../types/pptist';
import type { ConversionMetadata } from '../../models/metadata';
import type { ExtractedPPTX } from '../pptx/unzip';
import { logger } from '../../utils/logger';

/**
 * Collect metadata from conversion result
 *
 * @param presentation - PPTist presentation
 * @param extracted - Extracted PPTX structure
 * @param sourceFilename - Original source filename
 * @param startTime - Conversion start time (optional)
 * @returns Conversion metadata
 */
export function collectMetadata(
  presentation: PPTistPresentation,
  extracted: ExtractedPPTX,
  sourceFilename: string = '',
  startTime?: Date
): ConversionMetadata {
  const endTime = new Date();
  const processingTimeMs = startTime ? endTime.getTime() - startTime.getTime() : 0;

  const metadata: ConversionMetadata = {
    sourceFilename,
    sourceFormat: 'pptx',
    targetFormat: 'pptist',
    slideCount: presentation.slides.length,
    elementCount: 0,
    totalElements: 0,
    processingDuration: processingTimeMs,
    processingTime: processingTimeMs, // Legacy field
    fileSize: extracted.metadata.totalSlides * 10000, // 估算文件大小
    jsonSize: 0,
    hasMedia: extracted.metadata.totalMedia > 0,
    mediaCount: extracted.metadata.totalMedia,
    hasEncrypted: extracted.metadata.hasEncrypted,
    hasMacros: extracted.metadata.hasMacros,
    conversionDate: new Date().toISOString(),
    pptistVersion: '1.0.0',
  };

  // Count elements by type
  const elementCounts = countElementsByType(presentation);
  metadata.totalElements = Object.values(elementCounts).reduce((sum, count) => sum + count, 0);
  metadata.elementCounts = elementCounts;

  // Count elements per slide
  metadata.elementCountsBySlide = presentation.slides.map((slide) => ({
    slideId: slide.id,
    count: slide.elements.length,
  }));

  logger.debug('Metadata collected', {
    slideCount: metadata.slideCount,
    totalElements: metadata.totalElements,
  });

  return metadata;
}

/**
 * Count elements by type
 */
function countElementsByType(presentation: PPTistPresentation): Record<string, number> {
  const counts: Record<string, number> = {
    text: 0,
    image: 0,
    shape: 0,
    line: 0,
    chart: 0,
    table: 0,
    video: 0,
    audio: 0,
    group: 0,
    other: 0,
  };

  for (const slide of presentation.slides) {
    for (const element of slide.elements) {
      const type = element.type;

      if (counts.hasOwnProperty(type)) {
        counts[type]++;
      } else {
        counts.other++;
      }
    }
  }

  return counts;
}

/**
 * Calculate processing duration
 *
 * @param startTime - Start time
 * @param endTime - End time
 * @returns Duration in milliseconds
 */
export function calculateProcessingDuration(
  startTime: Date,
  endTime: Date
): number {
  return endTime.getTime() - startTime.getTime();
}

/**
 * Estimate JSON size
 *
 * @param data - Data to size
 * @returns Size in bytes
 */
export function estimateJSONSize(data: any): number {
  return JSON.stringify(data).length;
}
