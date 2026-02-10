/**
 * Conversion Orchestrator
 *
 * Orchestrates the entire PPTX to PPTist conversion process.
 * Coordinates parsing, converting, and assembling the final JSON structure.
 *
 * @module services/conversion/orchestrator
 */

import type { ConversionContext, ElementType } from '../../types/converters';
import type { PPTistSlide, PPTistPresentation } from '../../types/pptist';
import type { ExtractedPPTX } from '../pptx/unzip';
import type { ParsedSlide, ParsedElement } from '../pptx/parser';
import { parseAllSlides } from '../pptx/parser';
import { convertBackground, createDefaultBackground } from './converters/background.js';
import { createTextConverter } from './converters/text.js';
import { createImageConverter } from './converters/image.js';
import { createShapeConverter } from './converters/shape.js';
import { createLineConverter } from './converters/line.js';
import { createChartConverter } from './converters/chart.js';
import { createTableConverter } from './converters/table.js';
import { ConverterRegistry } from './registry.js';
import { logger } from '../../utils/logger';
import { generateSlideId } from '../../utils/id-generator';

/**
 * Conversion orchestrator options
 */
export interface OrchestratorOptions {
  /**
   * Whether to include animations (default: true)
   */
  includeAnimations?: boolean;

  /**
   * Whether to include notes (default: true)
   */
  includeNotes?: boolean;

  /**
   * Whether to preserve element z-index (default: true)
   */
  preserveZIndex?: boolean;

  /**
   * Whether to process groups (default: true)
   */
  processGroups?: boolean;

  /**
   * PPTist target version (default: 'latest')
   */
  targetVersion?: string;
}

/**
 * Default orchestrator options
 */
const DEFAULT_OPTIONS: Required<OrchestratorOptions> = {
  includeAnimations: true,
  includeNotes: true,
  preserveZIndex: true,
  processGroups: true,
  targetVersion: 'latest',
};

/**
 * Conversion orchestrator class
 */
export class ConversionOrchestrator {
  private registry: ConverterRegistry;
  private options: Required<OrchestratorOptions>;

  constructor(options: OrchestratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.registry = new ConverterRegistry();

    // Register all converters
    this.registerDefaultConverters();
  }

  /**
   * Register default element converters
   */
  private registerDefaultConverters(): void {
    this.registry.register(createTextConverter());
    this.registry.register(createImageConverter());
    this.registry.register(createShapeConverter());
    this.registry.register(createLineConverter());
    this.registry.register(createChartConverter());
    this.registry.register(createTableConverter());
  }

  /**
   * Convert extracted PPTX to PPTist presentation
   *
   * @param extracted - Extracted PPTX structure
   * @param context - Conversion context
   * @returns PPTist presentation
   */
  async convert(extracted: ExtractedPPTX, context: ConversionContext): Promise<PPTistPresentation> {
    logger.info('Starting PPTX to PPTist conversion', {
      slideCount: extracted.slides.size,
      mediaCount: extracted.media.size,
    });

    // Parse all slides
    const parsedSlides = parseAllSlides(extracted);

    // Convert slides
    const slides = await this.convertSlides(parsedSlides, context);

    // Build presentation
    const presentation: PPTistPresentation = {
      version: 'latest' as any, // PPTistVersion.LATEST
      width: context.slideSize?.width || 1280,
      height: context.slideSize?.height || 720,
      slides,
    };

    logger.info('Conversion completed', {
      slideCount: slides.length,
      totalElements: slides.reduce((sum, s) => sum + s.elements.length, 0),
    });

    return presentation;
  }

  /**
   * Convert parsed slides to PPTist slides
   */
  private async convertSlides(
    parsedSlides: ParsedSlide[],
    context: ConversionContext
  ): Promise<PPTistSlide[]> {
    const slides: PPTistSlide[] = [];

    for (const parsedSlide of parsedSlides) {
      try {
        const slide = await this.convertSlide(parsedSlide, context);
        slides.push(slide);
      } catch (error) {
        logger.error(`Failed to convert slide ${parsedSlide.index}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with other slides
      }
    }

    return slides;
  }

  /**
   * Convert single parsed slide to PPTist slide
   */
  private async convertSlide(parsedSlide: ParsedSlide, context: ConversionContext): Promise<PPTistSlide> {
    logger.debug(`Converting slide ${parsedSlide.index}`, {
      elementCount: parsedSlide.elements.length,
    });

    const slide: PPTistSlide = {
      id: generateSlideId(parsedSlide.index),
      elements: [],
    };

    // Convert background
    if (parsedSlide.background) {
      slide.background = convertBackground(parsedSlide.background, context);
    } else {
      slide.background = createDefaultBackground();
    }

    // Convert elements
    if (this.options.processGroups) {
      slide.elements = await this.convertElementsWithGroups(parsedSlide.elements, context);
    } else {
      slide.elements = await this.convertElements(parsedSlide.elements, context);
    }

    // Sort by z-index if enabled
    if (this.options.preserveZIndex) {
      this.sortElementsByZIndex(slide.elements);
    }

    // Extract animations if enabled
    if (this.options.includeAnimations && parsedSlide.transition) {
      slide.turningMode = this.convertTransition(parsedSlide.transition);
    }

    // Extract notes if enabled
    if (this.options.includeNotes && parsedSlide.notes) {
      slide.notes = parsedSlide.notes;
    }

    return slide;
  }

  /**
   * Convert elements (without group processing)
   */
  private async convertElements(elements: any[], context: ConversionContext): Promise<any[]> {
    const converted: any[] = [];

    for (const element of elements) {
      try {
        const pptistElement = await this.convertElement(element, context);
        if (pptistElement) {
          converted.push(pptistElement);
        }
      } catch (error) {
        logger.error('Failed to convert element', {
          id: element.id,
          type: element.type,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with other elements
      }
    }

    return converted;
  }

  /**
   * Convert elements with group processing
   */
  private async convertElementsWithGroups(elements: ParsedElement[], context: ConversionContext): Promise<any[]> {
    const converted: any[] = [];

    for (const element of elements) {
      try {
        if (element.type === 'group') {
          // Process group elements
          const groupElement = this.convertGroup(element, context);
          if (groupElement) {
            converted.push(groupElement);
          }
        } else {
          // Convert individual element
          const pptistElement = await this.convertElement(element, context);
          if (pptistElement) {
            converted.push(pptistElement);
          }
        }
      } catch (error) {
        logger.error('Failed to convert element', {
          id: element.id,
          type: element.type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return converted;
  }

  /**
   * Convert group element
   */
  private async convertGroup(group: any, context: ConversionContext): Promise<any> {
    logger.debug('Converting group element', {
      id: group.id,
      childCount: group.elements?.length || 0,
    });

    // Convert child elements
    const convertedChildren = await this.convertElements(group.elements || [], context);

    // In PPTist, groups are flattened - child elements are placed directly
    // with groupId referencing the parent
    const groupId = group.id;

    // Assign groupId to all children
    for (const child of convertedChildren) {
      child.groupId = groupId;
    }

    // Return flattened children (PPTist doesn't have explicit group containers)
    return convertedChildren;
  }

  /**
   * Convert single element using registered converter
   */
  private async convertElement(element: ParsedElement, context: ConversionContext): Promise<any> {
    const converter = this.registry.getConverter(element.type as ElementType);

    if (!converter) {
      logger.warn(`No converter found for element type: ${element.type}`, {
        elementId: element.id,
      });
      return null;
    }

    return converter.convert(element, context);
  }

  /**
   * Sort elements by z-index
   */
  private sortElementsByZIndex(elements: any[]): void {
    elements.sort((a, b) => {
      const zIndexA = a.zIndex ?? 0;
      const zIndexB = b.zIndex ?? 0;
      return zIndexA - zIndexB;
    });
  }

  /**
   * Convert slide transition to turning mode
   */
  private convertTransition(transition: any): number {
    // Map transition types to PPTist turning modes
    const transitionMap: Record<string, number> = {
      none: 0,
      fade: 1,
      push: 2,
      wipe: 3,
      split: 4,
      uncover: 5,
      cover: 6,
    };

    const type = transition.type || 'none';
    return transitionMap[type] ?? 0;
  }
}

/**
 * Create conversion orchestrator with options
 */
export function createOrchestrator(options?: OrchestratorOptions): ConversionOrchestrator {
  return new ConversionOrchestrator(options);
}

/**
 * Convert PPTX to PPTist (convenience function)
 *
 * @param extracted - Extracted PPTX structure
 * @param context - Conversion context
 * @param options - Orchestrator options
 * @returns PPTist presentation
 */
export async function convertPPTXtoPPTist(
  extracted: ExtractedPPTX,
  context: ConversionContext,
  options?: OrchestratorOptions
): Promise<PPTistPresentation> {
  const orchestrator = createOrchestrator(options);
  return await orchestrator.convert(extracted, context);
}
