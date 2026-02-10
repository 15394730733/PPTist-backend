/**
 * Background Converter
 *
 * Converts PPTX slide backgrounds to PPTist slide backgrounds.
 * Handles solid colors, gradients, and image backgrounds.
 *
 * @module services/conversion/converters/background
 */

import type { ConversionContext } from '../../../types/converters';
import type { SlideBackground } from '../../../services/pptx/parser';
import type { Slide } from '../../../types/pptist';
import { logger } from '../../../utils/logger';

type PPTistSlideBackground = NonNullable<Slide['background']>;

/**
 * Convert PPTX slide background to PPTist background
 *
 * @param background - PPTX slide background
 * @param context - Conversion context
 * @returns PPTist slide background
 */
export function convertBackground(
  background: SlideBackground | undefined,
  context: ConversionContext
): PPTistSlideBackground | undefined {
  if (!background) return undefined;

  logger.debug('Converting slide background', {
    type: background.type,
  });

  if (background.type === 'solid' && background.color) {
    return {
      type: 'solid',
      color: background.color,
    };
  }

  if (background.type === 'gradient' && background.gradientColors) {
    return {
      type: 'gradient',
      gradientColors: background.gradientColors,
      gradientAngle: 90,
      gradientPosition: 0,
    };
  }

  if (background.type === 'image' && background.imageRef) {
    const resolvedImage = context.resolveMediaReference(background.imageRef);

    if (resolvedImage) {
      return {
        type: 'image',
        image: resolvedImage,
      };
    }

    logger.warn('Failed to resolve background image', {
      imageRef: background.imageRef,
    });
  }

  return undefined;
}

/**
 * Create default background (white)
 *
 * @returns Default white background
 */
export function createDefaultBackground(): PPTistSlideBackground {
  return {
    type: 'solid',
    color: '#FFFFFF',
  };
}
