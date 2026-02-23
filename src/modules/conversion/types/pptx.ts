// PPTX internal types representing parsed XML structure

// XML namespace constants
export const PPTX_NAMESPACES = {
  PRESENTATION: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  DRAWINGML: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  RELATIONSHIPS: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
} as const

// Position and size in EMU (English Metric Units)
export interface PPTXPosition {
  x: number // EMU
  y: number // EMU
}

export interface PPTXSize {
  width: number // EMU
  height: number // EMU
}

// Transform (position + size + rotation)
export interface PPTXTransform {
  x: number
  y: number
  width: number
  height: number
  rotation?: number // degrees
}

// Text run (a segment of text with formatting)
export interface PPTXTextRun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  fontSize?: number // in points
  fontName?: string
  color?: string // hex color
}

// Paragraph
export interface PPTXParagraph {
  runs: PPTXTextRun[]
  align?: 'left' | 'center' | 'right' | 'justify'
  bullet?: boolean
  level?: number // indentation level
}

// Base element
export interface PPTXBaseElement {
  id: string
  transform: PPTXTransform
  name?: string
}

// Text element
export interface PPTXTextElement extends PPTXBaseElement {
  type: 'text'
  paragraphs: PPTXParagraph[]
  verticalAlign?: 'top' | 'middle' | 'bottom'
}

// Image element
export interface PPTXImageElement extends PPTXBaseElement {
  type: 'image'
  rId: string // relationship ID to find media
  contentType?: string
}

// Video element
export interface PPTXVideoElement extends PPTXBaseElement {
  type: 'video'
  rId: string
  contentType?: string
  posterRId?: string // thumbnail image
}

// Audio element
export interface PPTXAudioElement extends PPTXBaseElement {
  type: 'audio'
  rId: string
  contentType?: string
}

// Shape element
export interface PPTXShapeElement extends PPTXBaseElement {
  type: 'shape'
  shapeType?: string // e.g., 'rect', 'ellipse'
  adj?: number // 形状调整值 (0-100000)，用于 roundRect 等形状的圆角控制
  path?: string // SVG path data
  viewBox?: [number, number]
  fill?: string // hex color
  fillOpacity?: number // 0-1 range
  outline?: {
    color?: string
    width?: number
    style?: 'solid' | 'dashed' | 'dotted'
  }
  paragraphs?: PPTXParagraph[] // shape can contain text
}

// Line element
export interface PPTXLineElement extends PPTXBaseElement {
  type: 'line'
  startX: number
  startY: number
  endX: number
  endY: number
  color?: string
  width?: number
  style?: 'solid' | 'dashed' | 'dotted'
  headEnd?: 'none' | 'arrow' | 'dot'
  tailEnd?: 'none' | 'arrow' | 'dot'
}

// Table cell
export interface PPTXTableCell {
  text: string
  rowSpan?: number
  colSpan?: number
  formatting?: {
    bold?: boolean
    italic?: boolean
    fontSize?: number
    color?: string
    backgroundColor?: string
    align?: 'left' | 'center' | 'right'
  }
}

// Table element
export interface PPTXTableElement extends PPTXBaseElement {
  type: 'table'
  rows: PPTXTableCell[][]
}

// Chart element
export interface PPTXChartElement extends PPTXBaseElement {
  type: 'chart'
  chartType: 'bar' | 'column' | 'line' | 'pie' | 'area' | 'scatter' | 'radar'
  rId: string // reference to chart data
}

// LaTeX element (from embedded objects)
export interface PPTXLatexElement extends PPTXBaseElement {
  type: 'latex'
  latex: string
  path?: string // SVG path
}

// Union type for all elements
export type PPTXElement =
  | PPTXTextElement
  | PPTXImageElement
  | PPTXVideoElement
  | PPTXAudioElement
  | PPTXShapeElement
  | PPTXLineElement
  | PPTXTableElement
  | PPTXChartElement
  | PPTXLatexElement

// Slide
export interface PPTXSlide {
  id: string
  elements: PPTXElement[]
  background?: {
    type: 'solid' | 'image' | 'gradient'
    color?: string
    imageRId?: string
    gradient?: {
      type: 'linear' | 'radial'
      colors: { pos: number; color: string }[]
      angle?: number
    }
  }
  notes?: string
}

// Presentation
export interface PPTXPresentation {
  slides: PPTXSlide[]
  slideSize: {
    width: number // EMU
    height: number // EMU
  }
  media: Map<string, { data: Buffer; contentType: string }>
  // 每个幻灯片独立的 rId -> media 映射（避免不同幻灯片 rId 冲突）
  slideMediaMaps: Map<string, { data: Buffer; contentType: string }>[]
}

// Relationship (for resolving media references)
export interface PPTXRelationship {
  id: string
  type: string
  target: string
}
