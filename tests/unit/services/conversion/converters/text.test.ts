/**
 * Text Converter Unit Tests
 *
 * Tests for text element conversion.
 *
 * @module tests/unit/services/conversion/converters
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TextConverter } from '../../../../src/services/conversion/converters/text';
import type { ConversionContext } from '../../../../src/types/converters';

describe('Text Converter - Unit Tests', () => {
  let converter: TextConverter;
  let context: ConversionContext;

  beforeEach(() => {
    converter = new TextConverter();
    context = {
      elementIdMap: new Map(),
      warnings: [],
      metadata: {
        slideNumber: 1,
        sourceFilename: 'test.pptx',
      },
    };
  });

  describe('canConvert', () => {
    it('should return true for text elements', () => {
      const pptxElement = {
        type: 'text',
        id: 'test-id',
      };
      expect(converter.canConvert(pptxElement)).toBe(true);
    });

    it('should return false for non-text elements', () => {
      const nonTextElements = [
        { type: 'image', id: 'test-id' },
        { type: 'shape', id: 'test-id' },
        { type: 'line', id: 'test-id' },
        { type: null },
        { type: undefined },
      ];

      nonTextElements.forEach((element) => {
        expect(converter.canConvert(element as any)).toBe(false);
      });
    });

    it('should handle missing type property', () => {
      const element = { id: 'test-id' };
      expect(converter.canConvert(element as any)).toBe(false);
    });
  });

  describe('convert', () => {
    it('should convert basic text element', () => {
      const pptxElement = {
        type: 'text',
        id: 'pptx-text-1',
        left: 100,
        top: 200,
        width: 300,
        height: 100,
        rotate: 0,
        content: 'Hello World',
        fontName: 'Arial',
        fontSize: 24,
        color: '#ff0000',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('type', 'text');
      expect(result).toHaveProperty('left', 100);
      expect(result).toHaveProperty('top', 200);
      expect(result).toHaveProperty('width', 300);
      expect(result).toHaveProperty('height', 100);
      expect(result).toHaveProperty('content');
    });

    it('should convert text with HTML content', () => {
      const pptxElement = {
        type: 'text',
        id: 'pptx-text-1',
        left: 0,
        top: 0,
        width: 100,
        height: 50,
        rotate: 0,
        content: '<p>Bold text</p>',
        fontName: 'Arial',
        fontSize: 18,
        color: '#000000',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.content).toContain('Bold text');
    });

    it('should handle text with multiple paragraphs', () => {
      const pptxElement = {
        type: 'text',
        id: 'pptx-text-1',
        left: 0,
        top: 0,
        width: 200,
        height: 100,
        rotate: 0,
        content: '<p>Paragraph 1</p><p>Paragraph 2</p>',
        fontName: 'Arial',
        fontSize: 14,
        color: '#333333',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.content).toContain('Paragraph 1');
      expect(result.content).toContain('Paragraph 2');
    });

    it('should preserve text styling', () => {
      const pptxElement = {
        type: 'text',
        id: 'pptx-text-1',
        left: 0,
        top: 0,
        width: 150,
        height: 50,
        rotate: 0,
        content: 'Styled text',
        fontName: 'Times New Roman',
        fontSize: 32,
        color: '#0000ff',
        bold: true,
        italic: true,
        underline: true,
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.defaultFontName).toBe('Times New Roman');
      expect(result.defaultColor).toBe('#0000ff');
    });

    it('should handle text alignment', () => {
      const alignments = ['left', 'center', 'right', 'justify'];

      alignments.forEach((alignment) => {
        const pptxElement = {
          type: 'text',
          id: `pptx-text-${alignment}`,
          left: 0,
          top: 0,
          width: 100,
          height: 50,
          rotate: 0,
          content: 'Aligned text',
          fontName: 'Arial',
          fontSize: 16,
          color: '#000000',
          align: alignment,
        };

        const result = converter.convert(pptxElement as any, context);
        expect(result).toHaveProperty('id');
      });
    });

    it('should handle rotated text', () => {
      const pptxElement = {
        type: 'text',
        id: 'pptx-text-1',
        left: 100,
        top: 100,
        width: 200,
        height: 50,
        rotate: 45, // 45 degrees
        content: 'Rotated text',
        fontName: 'Arial',
        fontSize: 20,
        color: '#000000',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.rotate).toBe(45);
    });

    it('should add warning for missing content', () => {
      const pptxElement = {
        type: 'text',
        id: 'pptx-text-1',
        left: 0,
        top: 0,
        width: 100,
        height: 50,
        rotate: 0,
        content: '',
        fontName: 'Arial',
        fontSize: 16,
        color: '#000000',
      };

      const result = converter.convert(pptxElement as any, context);

      // Should add warning about empty content
      expect(context.warnings.length).toBeGreaterThan(0);
    });

    it('should handle text with line breaks', () => {
      const pptxElement = {
        type: 'text',
        id: 'pptx-text-1',
        left: 0,
        top: 0,
        width: 150,
        height: 100,
        rotate: 0,
        content: 'Line 1\nLine 2\nLine 3',
        fontName: 'Arial',
        fontSize: 14,
        color: '#000000',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.content).toContain('Line 1');
      expect(result.content).toContain('Line 2');
      expect(result.content).toContain('Line 3');
    });

    it('should generate valid PPTist text element structure', () => {
      const pptxElement = {
        type: 'text',
        id: 'pptx-text-1',
        left: 50,
        top: 50,
        width: 300,
        height: 150,
        rotate: 0,
        content: 'Test content',
        fontName: 'Arial',
        fontSize: 18,
        color: '#333333',
      };

      const result = converter.convert(pptxElement as any, context);

      // Verify all required properties
      expect(result).toMatchObject({
        type: 'text',
        left: expect.any(Number),
        top: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
        rotate: expect.any(Number),
        content: expect.any(String),
        defaultFontName: expect.any(String),
        defaultColor: expect.any(String),
      });
    });
  });
});
