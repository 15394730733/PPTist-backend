/**
 * Converter Registry
 *
 * Manages element converters and handles converter selection
 * based on element types and PPTist versions.
 */

import type {
  IElementConverter,
  IConverterRegistry,
  ConverterFactory,
  ElementType,
  ConverterContext,
} from '../../types/converters';
import logger from '../../utils/logger';
import { ElementType as ET } from '../../types/converters';

/**
 * Converter registry implementation
 */
export class ConverterRegistry implements IConverterRegistry {
  private converters: Map<ElementType, IElementConverter> = new Map();
  private factories: Map<ElementType, ConverterFactory> = new Map();
  private lazyConverters: Set<ElementType> = new Set();

  /**
   * Register a converter or converter factory
   */
  register(converterOrFactory: IElementConverter | ConverterFactory): void {
    // Check if it's a factory function
    if (typeof converterOrFactory === 'function') {
      // Factory function - we'll instantiate it lazily
      // For now, we need to get the type somehow
      // This is a limitation - factories should be used differently
      logger.warn('Factory functions should be instantiated before registration');
      return;
    }

    const converter = converterOrFactory as IElementConverter;
    this.converters.set(converter.type, converter);
    logger.debug({ type: converter.type }, 'Registered converter');
  }

  /**
   * Register a factory for lazy instantiation
   */
  registerFactory(type: ElementType, factory: ConverterFactory): void {
    this.factories.set(type, factory);
    this.lazyConverters.add(type);
    logger.debug({ type }, 'Registered converter factory');
  }

  /**
   * Unregister a converter by type
   */
  unregister(type: ElementType): void {
    this.converters.delete(type);
    this.factories.delete(type);
    this.lazyConverters.delete(type);
    logger.debug({ type }, 'Unregistered converter');
  }

  /**
   * Get a converter for an element type
   */
  getConverter(type: ElementType): IElementConverter | null {
    // Check if converter is already instantiated
    let converter = this.converters.get(type);

    // If not, check if there's a factory (sync only for now)
    if (!converter && this.lazyConverters.has(type)) {
      const factory = this.factories.get(type);
      if (factory) {
        try {
          const converterResult = factory();
          // For now, only handle synchronous factories
          if (converterResult && !(converterResult instanceof Promise)) {
            converter = converterResult;
            this.converters.set(type, converter);
            this.lazyConverters.delete(type);
            logger.debug({ type }, 'Instantiated converter from factory');
          }
        } catch (error) {
          logger.error({ type, error }, 'Failed to instantiate converter');
        }
      }
    }

    return converter || null;
  }

  /**
   * Find a converter that can handle the given XML element
   */
  async findConverter(xmlElement: unknown): Promise<IElementConverter | null> {
    // Try converters in priority order
    const sortedConverters = Array.from(this.converters.values()).sort(
      (a, b) => b.priority - a.priority
    );

    for (const converter of sortedConverters) {
      try {
        const canConvert = await converter.canConvert(xmlElement);
        if (canConvert) {
          return converter;
        }
      } catch (error) {
        logger.warn(
          { type: converter.type, error },
          'Error checking if converter can handle element'
        );
      }
    }

    return null;
  }

  /**
   * Get all registered converters
   */
  getAllConverters(): IElementConverter[] {
    return Array.from(this.converters.values());
  }

  /**
   * Check if an element type is supported
   */
  isSupported(type: ElementType): boolean {
    return (
      this.converters.has(type) ||
      this.lazyConverters.has(type) ||
      this.factories.has(type)
    );
  }

  /**
   * Get supported element types
   */
  getSupportedTypes(): ElementType[] {
    const types = new Set<ElementType>();

    for (const type of this.converters.keys()) {
      types.add(type);
    }

    for (const type of this.lazyConverters) {
      types.add(type);
    }

    for (const type of this.factories.keys()) {
      types.add(type);
    }

    return Array.from(types);
  }

  /**
   * Clear all converters
   */
  clear(): void {
    this.converters.clear();
    this.factories.clear();
    this.lazyConverters.clear();
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalConverters: number;
    lazyFactories: number;
    supportedTypes: number;
    typesByPriority: Array<{ type: ElementType; priority: number }>;
  } {
    const typesByPriority = Array.from(this.converters.values()).map((c) => ({
      type: c.type,
      priority: c.priority,
    }));

    typesByPriority.sort((a, b) => b.priority - a.priority);

    return {
      totalConverters: this.converters.size,
      lazyFactories: this.lazyConverters.size,
      supportedTypes: this.getSupportedTypes().length,
      typesByPriority,
    };
  }
}

/**
 * Global converter registry instance
 */
export const converterRegistry = new ConverterRegistry();

/**
 * Get the global converter registry
 */
export function getConverterRegistry(): ConverterRegistry {
  return converterRegistry;
}

/**
 * Register a converter with the global registry
 */
export function registerConverter(
  converter: IElementConverter | ConverterFactory
): void {
  converterRegistry.register(converter);
}

/**
 * Register multiple converters
 */
export function registerConverters(
  converters: Array<IElementConverter | ConverterFactory>
): void {
  for (const converter of converters) {
    registerConverter(converter);
  }
}

export default {
  ConverterRegistry,
  converterRegistry,
  getConverterRegistry,
  registerConverter,
  registerConverters,
};
