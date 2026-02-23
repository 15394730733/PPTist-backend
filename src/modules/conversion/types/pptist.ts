// PPTist output types - matching PPTist frontend expectations
// Based on /PPTist/src/types/slides.ts

// Element types
export type PPTistElementType = 'text' | 'image' | 'shape' | 'line' | 'chart' | 'table' | 'latex' | 'video' | 'audio'

// Line style
export type LineStyleType = 'solid' | 'dashed' | 'dotted'

// Gradient
export interface Gradient {
  type: 'linear' | 'radial'
  colors: GradientColor[]
  rotate: number
}

export interface GradientColor {
  pos: number
  color: string
}

// Shadow
export interface PPTElementShadow {
  h: number
  v: number
  blur: number
  color: string
}

// Outline (border)
export interface PPTElementOutline {
  style?: LineStyleType
  width?: number
  color?: string
}

// Link
export type ElementLinkType = 'web' | 'slide'

export interface PPTElementLink {
  type: ElementLinkType
  target: string
}

// Base element
export interface PPTBaseElement {
  id: string
  left: number
  top: number
  lock?: boolean
  groupId?: string
  width: number
  height: number
  rotate: number
  link?: PPTElementLink
  name?: string
}

// Text element
export type TextType = 'title' | 'subtitle' | 'content' | 'item' | 'itemTitle' | 'notes' | 'header' | 'footer' | 'partNumber' | 'itemNumber'

export interface PPTTextElement extends PPTBaseElement {
  type: 'text'
  content: string // HTML string
  defaultFontName: string
  defaultColor: string
  outline?: PPTElementOutline
  fill?: string
  lineHeight?: number
  wordSpace?: number
  opacity?: number
  shadow?: PPTElementShadow
  paragraphSpace?: number
  vertical?: boolean
  textType?: TextType
}

// Image element
export interface ImageElementFilters {
  blur?: string
  brightness?: string
  contrast?: string
  grayscale?: string
  saturate?: string
  'hue-rotate'?: string
  sepia?: string
  invert?: string
  opacity?: string
}

export interface ImageElementClip {
  range: [[number, number], [number, number]]
  shape: string
}

export type ImageType = 'pageFigure' | 'itemFigure' | 'background'

export interface PPTImageElement extends PPTBaseElement {
  type: 'image'
  fixedRatio: boolean
  src: string
  outline?: PPTElementOutline
  filters?: ImageElementFilters
  clip?: ImageElementClip
  flipH?: boolean
  flipV?: boolean
  shadow?: PPTElementShadow
  radius?: number
  colorMask?: string
  imageType?: ImageType
}

// Shape element
export type ShapeTextAlign = 'top' | 'middle' | 'bottom'

export interface ShapeText {
  content: string
  defaultFontName: string
  defaultColor: string
  align: ShapeTextAlign
  lineHeight?: number
  wordSpace?: number
  paragraphSpace?: number
  type?: TextType
}

export interface PPTShapeElement extends PPTBaseElement {
  type: 'shape'
  viewBox: [number, number]
  path: string
  fixedRatio: boolean
  fill: string
  fillOpacity?: number // 0-1 range
  gradient?: Gradient
  pattern?: string
  outline?: PPTElementOutline
  opacity?: number
  flipH?: boolean
  flipV?: boolean
  shadow?: PPTElementShadow
  special?: boolean
  text?: ShapeText
}

// Line element
export type LinePoint = '' | 'arrow' | 'dot'

export interface PPTLineElement extends Omit<PPTBaseElement, 'height' | 'rotate'> {
  type: 'line'
  start: [number, number]
  end: [number, number]
  style: LineStyleType
  color: string
  points: [LinePoint, LinePoint]
  shadow?: PPTElementShadow
  broken?: [number, number]
  broken2?: [number, number]
  curve?: [number, number]
  cubic?: [[number, number], [number, number]]
}

// Chart element
export type ChartType = 'bar' | 'column' | 'line' | 'pie' | 'ring' | 'area' | 'radar' | 'scatter'

export interface ChartData {
  labels: string[]
  legends: string[]
  series: number[][]
}

export interface ChartOptions {
  lineSmooth?: boolean
  stack?: boolean
}

export interface PPTChartElement extends PPTBaseElement {
  type: 'chart'
  fill?: string
  chartType: ChartType
  data: ChartData
  options?: ChartOptions
  outline?: PPTElementOutline
  themeColors: string[]
  textColor?: string
  lineColor?: string
}

// Table element
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export interface TableCellStyle {
  bold?: boolean
  em?: boolean
  underline?: boolean
  strikethrough?: boolean
  color?: string
  backcolor?: string
  fontsize?: string
  fontname?: string
  align?: TextAlign
}

export interface TableCell {
  id: string
  colspan: number
  rowspan: number
  text: string
  style?: TableCellStyle
}

export interface TableTheme {
  color: string
  rowHeader: boolean
  rowFooter: boolean
  colHeader: boolean
  colFooter: boolean
}

export interface PPTTableElement extends PPTBaseElement {
  type: 'table'
  outline: PPTElementOutline
  theme?: TableTheme
  colWidths: number[]
  cellMinHeight: number
  data: TableCell[][]
}

// LaTeX element
export interface PPTLatexElement extends PPTBaseElement {
  type: 'latex'
  latex: string
  path: string
  color: string
  strokeWidth: number
  viewBox: [number, number]
  fixedRatio: boolean
}

// Video element
export interface PPTVideoElement extends PPTBaseElement {
  type: 'video'
  src: string
  autoplay: boolean
  poster?: string
  ext?: string
}

// Audio element
export interface PPTAudioElement extends PPTBaseElement {
  type: 'audio'
  fixedRatio: boolean
  color: string
  loop: boolean
  autoplay: boolean
  src: string
  ext?: string
}

// Union type for all elements
export type PPTElement =
  | PPTTextElement
  | PPTImageElement
  | PPTShapeElement
  | PPTLineElement
  | PPTChartElement
  | PPTTableElement
  | PPTLatexElement
  | PPTVideoElement
  | PPTAudioElement

// Animation
export type AnimationType = 'in' | 'out' | 'attention'
export type AnimationTrigger = 'click' | 'meantime' | 'auto'

export interface PPTAnimation {
  id: string
  elId: string
  effect: string
  type: AnimationType
  duration: number
  trigger: AnimationTrigger
}

// Slide background
export type SlideBackgroundType = 'solid' | 'image' | 'gradient'
export type SlideBackgroundImageSize = 'cover' | 'contain' | 'repeat'

export interface SlideBackgroundImage {
  src: string
  size: SlideBackgroundImageSize
}

export interface SlideBackground {
  type: SlideBackgroundType
  color?: string
  image?: SlideBackgroundImage
  gradient?: Gradient
}

// Slide types
export type TurningMode = 'no' | 'fade' | 'slideX' | 'slideY' | 'random' | 'slideX3D' | 'slideY3D' | 'rotate' | 'scaleY' | 'scaleX' | 'scale' | 'scaleReverse'
export type SlideType = 'cover' | 'contents' | 'transition' | 'content' | 'end'

// Note
export interface NoteReply {
  id: string
  content: string
  time: number
  user: string
}

export interface Note {
  id: string
  content: string
  time: number
  user: string
  elId?: string
  replies?: NoteReply[]
}

// Section tag
export interface SectionTag {
  id: string
  title?: string
}

// Slide
export interface Slide {
  id: string
  elements: PPTElement[]
  notes?: Note[]
  remark?: string
  background?: SlideBackground
  animations?: PPTAnimation[]
  turningMode?: TurningMode
  sectionTag?: SectionTag
  type?: SlideType
}

// Theme
export interface SlideTheme {
  backgroundColor: string
  themeColors: string[]
  fontColor: string
  fontName: string
  outline: PPTElementOutline
  shadow: PPTElementShadow
}

// Media map
export interface MediaData {
  type: 'image' | 'video' | 'audio'
  data: string // base64
  mimeType: string
}

export interface MediaMap {
  [mediaId: string]: MediaData
}

// Output presentation
export interface PPTistPresentation {
  slides: Slide[]
  theme?: SlideTheme
  media: MediaMap
  metadata: {
    sourceFormat: 'pptx'
    convertedAt: string
    version: string
  }
  warnings: string[]
}
