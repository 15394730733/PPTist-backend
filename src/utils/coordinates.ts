/**
 * Coordinate Conversion Utilities
 *
 * Converts between PPTX EMU (English Metric Units) and pixels/points.
 * PPTX uses EMU (1 inch = 914400 EMU, 1 cm = 360000 EMU).
 *
 * @module utils/coordinates
 */

/**
 * EMU (English Metric Unit) constants
 */
export const EMU_PER_INCH = 914400;
export const EMU_PER_CENTIMETER = 360000;
export const EMU_PER_POINT = 12700;
export const EMU_PER_PIXEL = 9525; // At 96 DPI

/**
 * Standard DPI for screen display
 */
export const DEFAULT_DPI = 96;

/**
 * PPTX slide size defaults (in EMU)
 */
export const DEFAULT_SLIDE_WIDTH = 9144000; // 10 inches
export const DEFAULT_SLIDE_HEIGHT = 6858000; // 7.5 inches

/**
 * Standard slide sizes (in pixels)
 */
export const STANDARD_SIZES = {
  '4:3': { width: 960, height: 720 },
  '16:9': { width: 1280, height: 720 },
  '16:10': { width: 1280, height: 800 },
  'A4': { width: 794, height: 1123 },
  'Letter': { width: 816, height: 1056 },
} as const;

/**
 * Point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Size in 2D space
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Rectangle in 2D space
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Conversion options
 */
export interface ConversionOptions {
  /**
   * Target DPI (default: 96)
   */
  dpi?: number;

  /**
   * Rounding precision (default: 2 decimal places)
   */
  precision?: number;

  /**
   * Whether to use float or integer (default: false for integer)
   */
  useFloat?: boolean;
}

/**
 * Default conversion options
 */
const DEFAULT_OPTIONS: Required<ConversionOptions> = {
  dpi: DEFAULT_DPI,
  precision: 2,
  useFloat: false,
};

/**
 * Convert EMU to pixels
 *
 * @param emu - Value in EMU
 * @param options - Conversion options
 * @returns Value in pixels
 */
export function emuToPixels(emu: number, options: ConversionOptions = {}): number {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const pixels = emu / (EMU_PER_INCH / opts.dpi);
  return opts.useFloat ? pixels : Math.round(pixels);
}

/**
 * Convert pixels to EMU
 *
 * @param pixels - Value in pixels
 * @param options - Conversion options
 * @returns Value in EMU
 */
export function pixelsToEmu(pixels: number, options: ConversionOptions = {}): number {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return Math.round(pixels * (EMU_PER_INCH / opts.dpi));
}

/**
 * Convert EMU to points (1/72 inch)
 *
 * @param emu - Value in EMU
 * @returns Value in points
 */
export function emuToPoints(emu: number): number {
  return emu / EMU_PER_POINT;
}

/**
 * Convert points to EMU
 *
 * @param points - Value in points
 * @returns Value in EMU
 */
export function pointsToEmu(points: number): number {
  return Math.round(points * EMU_PER_POINT);
}

/**
 * Convert EMU to inches
 *
 * @param emu - Value in EMU
 * @returns Value in inches
 */
export function emuToInches(emu: number): number {
  return emu / EMU_PER_INCH;
}

/**
 * Convert inches to EMU
 *
 * @param inches - Value in inches
 * @returns Value in EMU
 */
export function inchesToEmu(inches: number): number {
  return Math.round(inches * EMU_PER_INCH);
}

/**
 * Convert EMU to centimeters
 *
 * @param emu - Value in EMU
 * @returns Value in centimeters
 */
export function emuToCentimeters(emu: number): number {
  return emu / EMU_PER_CENTIMETER;
}

/**
 * Convert centimeters to EMU
 *
 * @param cm - Value in centimeters
 * @returns Value in EMU
 */
export function centimetersToEmu(cm: number): number {
  return Math.round(cm * EMU_PER_CENTIMETER);
}

/**
 * Convert point (x, y) from EMU to pixels
 *
 * @param point - Point in EMU
 * @param options - Conversion options
 * @returns Point in pixels
 */
export function convertPointEmuToPixels(
  point: Point,
  options: ConversionOptions = {}
): Point {
  return {
    x: emuToPixels(point.x, options),
    y: emuToPixels(point.y, options),
  };
}

/**
 * Convert point (x, y) from pixels to EMU
 *
 * @param point - Point in pixels
 * @param options - Conversion options
 * @returns Point in EMU
 */
export function convertPointPixelsToEmu(
  point: Point,
  options: ConversionOptions = {}
): Point {
  return {
    x: pixelsToEmu(point.x, options),
    y: pixelsToEmu(point.y, options),
  };
}

/**
 * Convert size (width, height) from EMU to pixels
 *
 * @param size - Size in EMU
 * @param options - Conversion options
 * @returns Size in pixels
 */
export function convertSizeEmuToPixels(
  size: Size,
  options: ConversionOptions = {}
): Size {
  return {
    width: emuToPixels(size.width, options),
    height: emuToPixels(size.height, options),
  };
}

/**
 * Convert size (width, height) from pixels to EMU
 *
 * @param size - Size in pixels
 * @param options - Conversion options
 * @returns Size in EMU
 */
export function convertSizePixelsToEmu(
  size: Size,
  options: ConversionOptions = {}
): Size {
  return {
    width: pixelsToEmu(size.width, options),
    height: pixelsToEmu(size.height, options),
  };
}

/**
 * Convert rectangle (x, y, width, height) from EMU to pixels
 *
 * @param rect - Rectangle in EMU
 * @param options - Conversion options
 * @returns Rectangle in pixels
 */
export function convertRectangleEmuToPixels(
  rect: Rectangle,
  options: ConversionOptions = {}
): Rectangle {
  return {
    x: emuToPixels(rect.x, options),
    y: emuToPixels(rect.y, options),
    width: emuToPixels(rect.width, options),
    height: emuToPixels(rect.height, options),
  };
}

/**
 * Convert rectangle (x, y, width, height) from pixels to EMU
 *
 * @param rect - Rectangle in pixels
 * @param options - Conversion options
 * @returns Rectangle in EMU
 */
export function convertRectanglePixelsToEmu(
  rect: Rectangle,
  options: ConversionOptions = {}
): Rectangle {
  return {
    x: pixelsToEmu(rect.x, options),
    y: pixelsToEmu(rect.y, options),
    width: pixelsToEmu(rect.width, options),
    height: pixelsToEmu(rect.height, options),
  };
}

/**
 * Calculate aspect ratio from size
 *
 * @param size - Size
 * @returns Aspect ratio (width / height)
 */
export function calculateAspectRatio(size: Size): number {
  if (size.height === 0) return 1;
  return size.width / size.height;
}

/**
 * Detect standard size from dimensions
 *
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns Standard size name or 'custom'
 */
export function detectStandardSize(width: number, height: number): string {
  const ratio = calculateAspectRatio({ width, height });

  // Check against standard sizes with some tolerance
  const tolerance = 0.05;

  for (const [name, size] of Object.entries(STANDARD_SIZES)) {
    const standardRatio = calculateAspectRatio(size);
    if (Math.abs(ratio - standardRatio) < tolerance) {
      return name;
    }
  }

  return 'custom';
}

/**
 * Scale size to fit within bounds while maintaining aspect ratio
 *
 * @param size - Original size
 * @param maxSize - Maximum size
 * @returns Scaled size
 */
export function scaleToFit(size: Size, maxSize: Size): Size {
  const scaleX = maxSize.width / size.width;
  const scaleY = maxSize.height / size.height;
  const scale = Math.min(scaleX, scaleY, 1); // Never scale up

  return {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  };
}

/**
 * Scale size to fill bounds while maintaining aspect ratio
 *
 * @param size - Original size
 * @param minSize - Minimum size
 * @returns Scaled size
 */
export function scaleToFill(size: Size, minSize: Size): Size {
  const scaleX = minSize.width / size.width;
  const scaleY = minSize.height / size.height;
  const scale = Math.max(scaleX, scaleY); // Scale up or down

  return {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  };
}

/**
 * Convert font size from points to pixels
 *
 * @param points - Font size in points
 * @returns Font size in pixels
 */
export function fontSizePointsToPixels(points: number): number {
  // Points are already 1/72 inch, just need to convert to pixels at target DPI
  return Math.round((points / 72) * DEFAULT_DPI);
}

/**
 * Convert font size from pixels to points
 *
 * @param pixels - Font size in pixels
 * @returns Font size in points
 */
export function fontSizePixelsToPoints(pixels: number): number {
  return Math.round((pixels / DEFAULT_DPI) * 72);
}

/**
 * Convert line width from EMU to pixels
 *
 * @param emu - Line width in EMU
 * @returns Line width in pixels
 */
export function lineWidthEmuToPixels(emu: number): number {
  // Line widths are typically small, use more precision
  return emuToPixels(emu, { precision: 4 });
}

/**
 * Convert line width from pixels to EMU
 *
 * @param pixels - Line width in pixels
 * @returns Line width in EMU
 */
export function lineWidthPixelsToEmu(pixels: number): number {
  return pixelsToEmu(pixels);
}

/**
 * Round value to specified precision
 *
 * @param value - Value to round
 * @param precision - Decimal places
 * @returns Rounded value
 */
export function roundToPrecision(value: number, precision: number = 2): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Convert percentage to pixels
 *
 * @param percentage - Percentage value (0-100)
 * @param total - Total value
 * @returns Pixel value
 */
export function percentageToPixels(percentage: number, total: number): number {
  return Math.round((percentage / 100) * total);
}

/**
 * Convert pixels to percentage
 *
 * @param pixels - Pixel value
 * @param total - Total value
 * @returns Percentage value (0-100)
 */
export function pixelsToPercentage(pixels: number, total: number): number {
  if (total === 0) return 0;
  return roundToPrecision((pixels / total) * 100, 2);
}

/**
 * Parse PPTX size string to pixels
 *
 * @param sizeStr - Size string (e.g., "9144000")
 * @returns Size in pixels
 */
export function parseSizeString(sizeStr: string): number {
  const emu = parseInt(sizeStr, 10);
  if (isNaN(emu)) return 0;
  return emuToPixels(emu);
}

/**
 * Format size as EMU string
 *
 * @param pixels - Size in pixels
 * @returns EMU string
 */
export function formatSizeAsEmu(pixels: number): string {
  return pixelsToEmu(pixels).toString();
}

/**
 * Calculate relative position (0-1) from pixels
 *
 * @param pixels - Pixel position
 * @param total - Total size
 * @returns Relative position (0-1)
 */
export function pixelsToRelative(pixels: number, total: number): number {
  if (total === 0) return 0;
  return roundToPrecision(pixels / total, 4);
}

/**
 * Calculate pixel position from relative position (0-1)
 *
 * @param relative - Relative position (0-1)
 * @param total - Total size
 * @returns Pixel position
 */
export function relativeToPixels(relative: number, total: number): number {
  return Math.round(relative * total);
}

/**
 * Clamp value between min and max
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Check if point is within rectangle
 *
 * @param point - Point to check
 * @param rect - Rectangle
 * @returns true if point is within rectangle
 */
export function isPointInRectangle(point: Point, rect: Rectangle): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Calculate distance between two points
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Distance
 */
export function distanceBetweenPoints(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate center point of rectangle
 *
 * @param rect - Rectangle
 * @returns Center point
 */
export function centerOfRectangle(rect: Rectangle): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}
