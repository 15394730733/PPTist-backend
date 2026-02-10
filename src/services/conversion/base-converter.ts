/**
 * Base Element Converter
 *
 * Abstract base class for element converters.
 * Provides common functionality and utility methods.
 */

import type {
  IElementConverter,
  ElementType,
} from '../../types/converters';
import type { ConversionContext } from '../../types/converters';
import { generateId } from '../../utils/file';
import { logger } from '../../utils/logger';

/**
 * Abstract base converter
 */
export abstract class BaseElementConverter<TInput = unknown, TOutput = unknown> implements IElementConverter {
  abstract readonly type: ElementType;
  abstract readonly priority: number;
  abstract readonly supportedVersions: string[];

  /**
   * Convert method to be implemented by subclasses
   */
  abstract convert(
    xmlElement: TInput,
    context: ConversionContext
  ): Promise<TOutput | null>;

  /**
   * Check if this converter can handle the element
   */
  async canConvert(xmlElement: unknown): Promise<boolean> {
    if (!xmlElement || typeof xmlElement !== 'object') {
      return false;
    }

    const element = xmlElement as Record<string, unknown>;

    // Check if element has a type attribute that matches our type
    if ('type' in element && typeof element.type === 'string') {
      return element.type === this.type;
    }

    // Subclasses can override this for more complex logic
    return false;
  }

  /**
   * Check if the given PPTist version is supported
   */
  isVersionSupported(version: string): boolean {
    return this.supportedVersions.includes(version) || this.supportedVersions.includes('latest');
  }
}
