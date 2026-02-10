/**
 * Element Converter Types
 *
 * Defines the contract for converting PPTX elements to PPTist JSON format.
 * Each converter handles a specific element type (text, image, shape, etc.).
 */

/**
 * Element type enum
 */
export enum ElementType {
  // Text elements
  TEXT = 'text',
  PARAGRAPH = 'paragraph',
  TEXT_BODY = 'textBody',

  // Shape elements
  SHAPE = 'shape',
  RECTANGLE = 'rectangle',
  ROUND_RECTANGLE = 'roundRectangle',
  ELLIPSE = 'ellipse',
  TRIANGLE = 'triangle',
  LINE = 'line',
  POLYLINE = 'polyline',
  CURVE = 'curve',

  // Image elements
  IMAGE = 'image',
  PICTURE = 'picture',

  // Chart elements
  CHART = 'chart',
  GRAPH = 'graph',

  // Table elements
  TABLE = 'table',
  CELL = 'cell',

  // Media elements
  AUDIO = 'audio',
  VIDEO = 'video',

  // Group elements
  GROUP = 'group',

  // Unknown elements
  UNKNOWN = 'unknown',
}

/**
 * PPTist element interface
 */
export interface PPTistElement {
  id: string;
  type: ElementType;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  zIndex?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  [key: string]: unknown;
}

/**
 * Converter context
 */
export interface ConverterContext {
  // PPTist version to target
  version: string;

  // File path for resolving relative resources
  basePath: string;

  // Media files extracted from PPTX
  mediaFiles: Map<string, string>; // filename -> local path

  // Shared styles/theme
  theme?: {
    colorScheme?: Record<string, string>;
    fontScheme?: Record<string, string>;
    formatScheme?: Record<string, unknown>;
  };

  // Parent element (for nested elements)
  parent?: PPTistElement;

  // Custom properties
  custom?: Record<string, unknown>;

  // Slide size
  slideSize?: {
    width: number;
    height: number;
  };

  // Resolve media reference
  resolveMediaReference(ref: string): any;
}

// Alias for backward compatibility
export type ConversionContext = ConverterContext;

/**
 * Conversion result
 */
export interface ConversionResult {
  element: PPTistElement;
  warnings?: string[];
  metadata?: {
    convertedAt: Date;
    converterVersion: string;
    complexity?: number;
  };
}

/**
 * Converter result type
 */
export type ConverterResult = ConversionResult | null;

/**
 * Element converter interface
 */
export interface IElementConverter {
  /**
   * Get the element type this converter handles
   */
  readonly type: ElementType;

  /**
   * Convert a PPTX XML element to PPTist format
   * @param xmlElement - Parsed XML element
   * @param context - Conversion context
   * @returns Converted element or null if not applicable
   */
  convert(xmlElement: unknown, context: ConverterContext): Promise<any>;

  /**
   * Check if this converter can handle the given element
   * @param xmlElement - Parsed XML element
   * @returns True if this converter can handle the element
   */
  canConvert(xmlElement: unknown): boolean | Promise<boolean>;

  /**
   * Get converter priority (higher priority = checked first)
   */
  readonly priority: number;

  /**
   * Get supported PPTist versions
   */
  readonly supportedVersions: string[];
}

/**
 * Converter factory function
 */
export type ConverterFactory = () => IElementConverter | Promise<IElementConverter>;

/**
 * Converter registry interface
 */
export interface IConverterRegistry {
  /**
   * Register a converter
   * @param converter - Converter instance or factory
   */
  register(converter: IElementConverter | ConverterFactory): void;

  /**
   * Unregister a converter by type
   * @param type - Element type
   */
  unregister(type: ElementType): void;

  /**
   * Get a converter for an element type
   * @param type - Element type
   * @returns Converter or null if not found
   */
  getConverter(type: ElementType): IElementConverter | null;

  /**
   * Find a converter that can handle the given XML element
   * @param xmlElement - Parsed XML element
   * @returns Converter or null if none found
   */
  findConverter(xmlElement: unknown): Promise<IElementConverter | null>;

  /**
   * Get all registered converters
   */
  getAllConverters(): IElementConverter[];

  /**
   * Check if an element type is supported
   * @param type - Element type
   */
  isSupported(type: ElementType): boolean;

  /**
   * Get supported element types
   */
  getSupportedTypes(): ElementType[];
}

/**
 * Converter options
 */
export interface ConverterOptions {
  /**
   * Target PPTist version
   */
  version: string;

  /**
   * Strict mode (fail on unknown elements vs. skip with warning)
   */
  strict?: boolean;

  /**
   * Include raw XML in output for debugging
   */
  includeDebugInfo?: boolean;

  /**
   * Custom converters
   */
  customConverters?: IElementConverter[];

  /**
   * Converter-specific options
   */
  [key: string]: unknown;
}

/**
 * Conversion statistics
 */
export interface ConversionStats {
  totalElements: number;
  convertedElements: number;
  skippedElements: number;
  failedElements: number;
  warnings: string[];
  errors: Error[];
  duration: number; // milliseconds
}
