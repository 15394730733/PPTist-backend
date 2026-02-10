/**
 * PPTX Type Definitions
 *
 * Defines the PPTX file structure types for conversion.
 */

/**
 * PPTX element base interface
 */
export interface PPTXElement {
  type: string;
  id?: string;
  name?: string;
  [key: string]: any;
}

/**
 * PPTX slide
 */
export interface PPTXSlide {
  id?: string;
  number?: number;
  elements?: PPTXElement[];
  [key: string]: any;
}
