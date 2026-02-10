/**
 * Color Utility Unit Tests
 *
 * Tests for color conversion utilities.
 *
 * @module tests/unit/utils/color
 */

import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, rgbToCss } from '../../../src/utils/color';

describe('Color Utility - Unit Tests', () => {
  describe('hexToRgb', () => {
    it('should convert hex to RGB', () => {
      const result = hexToRgb('#ff0000');
      expect(result).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should convert short hex format', () => {
      const result = hexToRgb('#f00');
      expect(result).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should return null for invalid hex', () => {
      const result = hexToRgb('invalid');
      expect(result).toBeNull();
    });

    it('should expand 3-character hex to 6-character', () => {
      const result = hexToRgb('#ff0');
      expect(result).toEqual({ r: 255, g: 255, b: 0 });
    });
  });

  describe('rgbToHex', () => {
    it('should convert RGB to hex', () => {
      const rgb = { r: 255, g: 0, b: 0 };
      const result = rgbToHex(rgb);
      expect(result).toBe('#ff0000');
    });

    it('should ignore alpha channel', () => {
      const rgb = { r: 255, g: 0, b: 0, a: 0.5 };
      const result = rgbToHex(rgb);
      // rgbToHex ignores alpha, returns 6-digit hex
      expect(result).toBe('#ff0000');
      expect(result).toHaveLength(7); // # + 6 digits
    });

    it('should clamp values to valid range', () => {
      const rgb = { r: 300, g: -10, b: 128 };
      const result = rgbToHex(rgb);
      // Should be clamped: (255, 0, 128)
      expect(result).toBe('#ff0080');
    });

    it('should handle zero values', () => {
      const rgb = { r: 0, g: 0, b: 0 };
      const result = rgbToHex(rgb);
      expect(result).toBe('#000000');
    });

    it('should handle max values', () => {
      const rgb = { r: 255, g: 255, b: 255 };
      const result = rgbToHex(rgb);
      expect(result).toBe('#ffffff');
    });
  });

  describe('rgbToCss', () => {
    it('should convert RGB to CSS string', () => {
      const rgb = { r: 255, g: 0, b: 0 };
      const result = rgbToCss(rgb);
      expect(result).toBe('rgb(255, 0, 0)');
    });

    it('should convert RGB with alpha to rgba', () => {
      const rgb = { r: 255, g: 0, b: 0, a: 0.5 };
      const result = rgbToCss(rgb);
      expect(result).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should clamp values to valid range', () => {
      const rgb = { r: 300, g: -10, b: 150 };
      const result = rgbToCss(rgb);
      expect(result).toBe('rgb(255, 0, 150)');
    });
  });
});
