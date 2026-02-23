# Data Model: PPTX to PPTist Conversion

**Feature**: 001-pptist-conversion
**Date**: 2026-02-20

## Overview

This document defines the data structures used in the conversion pipeline:
1. **PPTX Internal Types** - Representing parsed PowerPoint XML
2. **PPTist Output Types** - Matching PPTist frontend expectations
3. **Conversion Context** - Shared state during conversion

---

## Core Entities

### 1. ConversionRequest

Represents an incoming conversion request with metadata.

```typescript
interface ConversionRequest {
  // File information
  fileName: string;
  fileSize: number;
  mimeType: string;

  // Processing state
  status: 'pending' | 'processing' | 'completed' | 'failed';

  // Timing
  startTime: number;
  endTime?: number;

  // Results
  warnings: ConversionWarning[];
  error?: ConversionError;
}
```

### 2. PPTistPresentation (Output)

The root output structure matching PPTist's expected format.

```typescript
interface PPTistPresentation {
  slides: Slide[];
  theme?: SlideTheme;
  media: MediaMap;
  metadata: ConversionMetadata;
  warnings: ConversionWarning[];
}

interface SlideTheme {
  backgroundColor: string;
  themeColors: string[];
  fontColor: string;
  fontName: string;
}

interface MediaMap {
  [mediaId: string]: MediaData;
}

interface MediaData {
  type: 'image' | 'video' | 'audio';
  data: string;  // Base64 encoded
  mimeType: string;
}

interface ConversionMetadata {
  sourceFormat: 'pptx';
  convertedAt: string;
  version: string;
}
```

---

## Slide Elements

### Base Element (Common Properties)

All element types extend this base:

```typescript
interface PPTBaseElement {
  id: string;
  left: number;      // X position in pixels
  top: number;       // Y position in pixels
  width: number;     // Width in pixels
  height: number;    // Height in pixels
  rotate: number;    // Rotation in degrees
  lock?: boolean;
  groupId?: string;
  link?: PPTElementLink;
  name?: string;
}

interface PPTElementLink {
  type: 'web' | 'slide';
  target: string;
}
```

### Text Element

```typescript
interface PPTTextElement extends PPTBaseElement {
  type: 'text';
  content: string;           // HTML string
  defaultFontName: string;
  defaultColor: string;
  outline?: PPTElementOutline;
  fill?: string;
  lineHeight?: number;       // Default: 1.5
  wordSpace?: number;        // Default: 0
  opacity?: number;          // Default: 1
  shadow?: PPTElementShadow;
  paragraphSpace?: number;   // Default: 5
  vertical?: boolean;
  textType?: TextType;
}

type TextType = 'title' | 'subtitle' | 'content' | 'item' | 'itemTitle' |
                'notes' | 'header' | 'footer' | 'partNumber' | 'itemNumber';
```

### Image Element

```typescript
interface PPTImageElement extends PPTBaseElement {
  type: 'image';
  fixedRatio: boolean;
  src: string;               // Media ID reference or base64
  outline?: PPTElementOutline;
  filters?: ImageElementFilters;
  clip?: ImageElementClip;
  flipH?: boolean;
  flipV?: boolean;
  shadow?: PPTElementShadow;
  radius?: number;
  colorMask?: string;
}

interface ImageElementFilters {
  blur?: string;
  brightness?: string;
  contrast?: string;
  grayscale?: string;
  saturate?: string;
  'hue-rotate'?: string;
  sepia?: string;
  invert?: string;
  opacity?: string;
}

interface ImageElementClip {
  range: [[number, number], [number, number]];
  shape: string;
}
```

### Shape Element

```typescript
interface PPTShapeElement extends PPTBaseElement {
  type: 'shape';
  viewBox: [number, number];
  path: string;              // SVG path d attribute
  fixedRatio: boolean;
  fill: string;
  gradient?: Gradient;
  pattern?: string;
  outline?: PPTElementOutline;
  opacity?: number;
  flipH?: boolean;
  flipV?: boolean;
  shadow?: PPTElementShadow;
  special?: boolean;
  text?: ShapeText;
}

interface Gradient {
  type: 'linear' | 'radial';
  colors: GradientColor[];
  rotate: number;
}

interface GradientColor {
  pos: number;
  color: string;
}

interface ShapeText {
  content: string;
  defaultFontName: string;
  defaultColor: string;
  align: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
  wordSpace?: number;
  paragraphSpace?: number;
}
```

### Line Element

```typescript
interface PPTLineElement extends Omit<PPTBaseElement, 'height' | 'rotate'> {
  type: 'line';
  start: [number, number];
  end: [number, number];
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  points: [LinePoint, LinePoint];
  shadow?: PPTElementShadow;
  broken?: [number, number];
  broken2?: [number, number];
  curve?: [number, number];
  cubic?: [[number, number], [number, number]];
}

type LinePoint = '' | 'arrow' | 'dot';
```

### Video Element

```typescript
interface PPTVideoElement extends PPTBaseElement {
  type: 'video';
  src: string;               // Media ID reference or base64
  autoplay: boolean;
  poster?: string;
  ext?: string;
}
```

### Chart Element

```typescript
interface PPTChartElement extends PPTBaseElement {
  type: 'chart';
  fill?: string;
  chartType: 'bar' | 'column' | 'line' | 'pie' | 'ring' | 'area' | 'radar' | 'scatter';
  data: ChartData;
  options?: ChartOptions;
  outline?: PPTElementOutline;
  themeColors: string[];
  textColor?: string;
  lineColor?: string;
}

interface ChartData {
  labels: string[];
  legends: string[];
  series: number[][];
}

interface ChartOptions {
  lineSmooth?: boolean;
  stack?: boolean;
}
```

### Table Element

```typescript
interface PPTTableElement extends PPTBaseElement {
  type: 'table';
  outline: PPTElementOutline;
  theme?: TableTheme;
  colWidths: number[];
  cellMinHeight: number;
  data: TableCell[][];
}

interface TableCell {
  id: string;
  colspan: number;
  rowspan: number;
  text: string;
  style?: TableCellStyle;
}

interface TableCellStyle {
  bold?: boolean;
  em?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  backcolor?: string;
  fontsize?: string;
  fontname?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
}

interface TableTheme {
  color: string;
  rowHeader: boolean;
  rowFooter: boolean;
  colHeader: boolean;
  colFooter: boolean;
}
```

---

## Supporting Types

### Slide

```typescript
interface Slide {
  id: string;
  elements: PPTElement[];
  notes?: Note[];
  remark?: string;
  background?: SlideBackground;
  animations?: PPTAnimation[];
  turningMode?: TurningMode;
  sectionTag?: SectionTag;
  type?: SlideType;
}

interface SlideBackground {
  type: 'solid' | 'image' | 'gradient';
  color?: string;
  image?: { src: string; size: 'cover' | 'contain' | 'repeat' };
  gradient?: Gradient;
}

type TurningMode = 'no' | 'fade' | 'slideX' | 'slideY' | 'random' |
                   'slideX3D' | 'slideY3D' | 'rotate' | 'scaleY' |
                   'scaleX' | 'scale' | 'scaleReverse';

type SlideType = 'cover' | 'contents' | 'transition' | 'content' | 'end';
```

### Common Style Types

```typescript
interface PPTElementOutline {
  style?: 'solid' | 'dashed' | 'dotted';
  width?: number;
  color?: string;
}

interface PPTElementShadow {
  h: number;      // Horizontal offset
  v: number;      // Vertical offset
  blur: number;   // Blur radius
  color: string;
}
```

### Error & Warning Types

```typescript
interface ConversionError {
  code: ErrorCode;
  message: string;
  suggestion?: string;
}

type ErrorCode =
  | 'ERR_INVALID_FORMAT'
  | 'ERR_FILE_TOO_LARGE'
  | 'ERR_PROTECTED_FILE'
  | 'ERR_CORRUPTED_FILE'
  | 'ERR_EMPTY_FILE'
  | 'ERR_CONVERSION_FAILED';

interface ConversionWarning {
  code: WarningCode;
  message: string;
  count?: number;
}

type WarningCode =
  | 'WARN_SMARTART_SKIPPED'
  | 'WARN_MACRO_SKIPPED'
  | 'WARN_ACTIVEX_SKIPPED'
  | 'WARN_FONT_FALLBACK';
```

---

## Union Types

```typescript
type PPTElement =
  | PPTTextElement
  | PPTImageElement
  | PPTShapeElement
  | PPTLineElement
  | PPTChartElement
  | PPTTableElement
  | PPTVideoElement;
```

---

## Entity Relationships

```
ConversionRequest
    │
    ▼
PPTistPresentation
    ├── Slide[] (1:N)
    │       ├── PPTElement[] (1:N)
    │       │       ├── Text
    │       │       ├── Image ──────► MediaMap
    │       │       ├── Shape
    │       │       ├── Line
    │       │       ├── Chart
    │       │       ├── Table
    │       │       └── Video ──────► MediaMap
    │       ├── Background
    │       └── Animation[] (1:N)
    ├── Theme
    ├── MediaMap (1:1)
    ├── Metadata
    └── Warning[] (0:N)
```

---

## Validation Rules

### Slide
- `id`: Required, unique string
- `elements`: Required array, can be empty
- `background`: Optional, must have `type` field

### BaseElement
- `id`: Required, unique within slide
- `left`, `top`, `width`, `height`: Required, non-negative
- `rotate`: Required, -360 to 360

### Text Element
- `content`: Required, HTML string
- `defaultFontName`: Required, default: 'Arial'
- `defaultColor`: Required, hex color

### Image/Video Element
- `src`: Required, media ID or base64 data URL
- Must reference valid entry in MediaMap

---

## Type Source

These types are derived from:
- `/PPTist/src/types/slides.ts` - PPTist frontend type definitions
- Office Open XML specification - PPTX structure reference
