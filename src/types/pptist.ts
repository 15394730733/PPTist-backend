/**
 * PPTist Type Definitions
 *
 * Defines the PPTist JSON structure for different versions.
 * This allows the converter to output JSON compatible with specific PPTist versions.
 */

/**
 * PPTist version enum
 */
export enum PPTistVersion {
  V4X = '4.x',
  LATEST = 'latest',
}

/**
 * Common PPTist element properties
 */
export interface BaseElement {
  id: string;
  type: string;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  zIndex?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotate?: number;
}

/**
 * Position and size
 */
export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
}

/**
 * Fill style
 */
export interface Fill {
  type?: 'solid' | 'gradient' | 'pattern' | 'image';
  color?: string;
  opacity?: number;
  gradient?: {
    type: 'linear' | 'radial';
    angle?: number;
    stops: Array<{
      offset: number;
      color: string;
      opacity?: number;
    }>;
  };
}

/**
 * Border/Stroke style
 */
export interface Stroke {
  width?: number;
  color?: string;
  type?: 'solid' | 'dashed' | 'dotted';
  dashArray?: number[];
}

/**
 * Shadow style
 */
export interface Shadow {
  enabled?: boolean;
  color?: string;
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  opacity?: number;
}

/**
 * Text element (PPTist 4.x)
 */
export interface TextElement extends BaseElement {
  type: 'text';
  content?: string;
  defaultValue?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
  letterSpacing?: number;
  fill?: any;
  stroke?: any;
  shadow?: any;
  glow?: any;
  [key: string]: any;
}

/**
 * Image element (PPTist 4.x)
 */
export interface ImageElement extends BaseElement {
  type: 'image';
  src: string; // URL or base64
  width?: number;
  height?: number;
  flip?: any;
  crop?: any;
  fill?: any;
  stroke?: any;
  shadow?: any;
  reflection?: any;
  glow?: any;
  blur?: any;
  clipPath?: string;
  [key: string]: any;
}

/**
 * Shape element (PPTist 4.x)
 */
export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape?: any;
  text?: string;
  fill?: any;
  outline?: any;
  shadow?: any;
  reflection?: any;
  glow?: any;
  blur?: any;
  viewBox?: string;
  path?: string;
  [key: string]: any;
}

/**
 * Chart element (PPTist 4.x)
 */
export interface ChartElement extends BaseElement {
  type: 'chart';
  fill?: any;
  data?: any;
  options?: any;
  [key: string]: any;
}

/**
 * Table element (PPTist 4.x)
 */
export interface TableElement extends BaseElement {
  type: 'table';
  rowCount?: number;
  colCount?: number;
  data?: any;
  fill?: any;
  outline?: any;
  [key: string]: any;
}

/**
 * Line element (PPTist 4.x)
 */
export interface LineElement extends BaseElement {
  type: 'line';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  stroke?: any;
  style?: any;
  [key: string]: any;
}

/**
 * Video element (PPTist 4.x)
 */
export interface VideoElement extends BaseElement {
  type: 'video';
  src: string; // URL or base64
  width: number;
  height: number;
  autoplay?: boolean;
  loop?: boolean;
  controls?: boolean;
  poster?: string;
}

/**
 * PPTAnimation type
 */
export interface PPTAnimation {
  type?: AnimationType;
  trigger?: AnimationTrigger;
  duration?: number;
  delay?: number;
  [key: string]: any;
}

/**
 * Animation type enum
 */
export type AnimationType =
  | 'enter'
  | 'exit'
  | 'emphasis'
  | 'path'
  | 'in'
  | 'out'
  | 'attention';

/**
 * Animation trigger enum
 */
export type AnimationTrigger =
  | 'onClick'
  | 'afterPrevious'
  | 'withPrevious'
  | 'none'
  | 'click'
  | 'meantime'
  | 'auto';

/**
 * Turning mode enum
 */
export type TurningMode =
  | 'none'
  | 'fade'
  | 'push'
  | 'wipe'
  | 'split'
  | 'uncover'
  | 'cover'
  | 'slideY3D'
  | 'slideX3D'
  | 'slideY'
  | 'slideX'
  | 'scaleX'
  | 'scaleY'
  | 'rotate'
  | 'scale'
  | 'scaleReverse';

/**
 * Audio element (PPTist 4.x)
 */
export interface AudioElement extends BaseElement {
  type: 'audio';
  src: string; // URL or base64
  autoplay?: boolean;
  loop?: boolean;
  controls?: boolean;
}

/**
 * Slide (PPTist 4.x)
 */
export interface Slide {
  id: string;
  elements: PPTistElement[];
  background?: {
    type?: 'solid' | 'gradient' | 'image';
    color?: string;
    src?: string;
    gradientColors?: any;
    gradientAngle?: number;
    gradientPosition?: number;
    image?: any;
  };
  notes?: string;
  turningMode?: number;
}

/**
 * PPTist element union type
 */
export type PPTistElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | ChartElement
  | TableElement
  | LineElement
  | VideoElement
  | AudioElement;

/**
 * PPTist presentation (4.x version)
 */
export interface PPTistPresentation {
  version: PPTistVersion;
  width: number;
  height: number;
  slides: PPTistSlide[];
  metadata?: {
    title?: string;
    author?: string;
    createdAt?: string;
    modifiedAt?: string;
    [key: string]: unknown;
  };
}

// Alias for Slide type for consistency
export type PPTistSlide = Slide;

/**
 * Type guard for text elements
 */
export function isTextElement(element: PPTistElement): element is TextElement {
  return element.type === 'text';
}

/**
 * Type guard for image elements
 */
export function isImageElement(element: PPTistElement): element is ImageElement {
  return element.type === 'image';
}

/**
 * Type guard for shape elements
 */
export function isShapeElement(element: PPTistElement): element is ShapeElement {
  return element.type === 'shape';
}

/**
 * Type guard for chart elements
 */
export function isChartElement(element: PPTistElement): element is ChartElement {
  return element.type === 'chart';
}

/**
 * Type guard for table elements
 */
export function isTableElement(element: PPTistElement): element is TableElement {
  return element.type === 'table';
}

/**
 * Type guard for video elements
 */
export function isVideoElement(element: PPTistElement): element is VideoElement {
  return element.type === 'video';
}

/**
 * Type guard for audio elements
 */
export function isAudioElement(element: PPTistElement): element is AudioElement {
  return element.type === 'audio';
}
