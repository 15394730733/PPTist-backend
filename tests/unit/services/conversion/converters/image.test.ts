/**
 * Image Converter Unit Tests
 *
 * Tests for image element conversion.
 *
 * @module tests/unit/services/conversion/converters
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ImageConverter } from '../../../../src/services/conversion/converters/image';
import type { ConversionContext } from '../../../../src/types/converters';

describe('Image Converter - Unit Tests', () => {
  let converter: ImageConverter;
  let context: ConversionContext;

  beforeEach(() => {
    converter = new ImageConverter();
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
    it('should return true for image elements', () => {
      const imageElement = {
        type: 'image',
        id: 'test-image',
      };
      expect(converter.canConvert(imageElement)).toBe(true);
    });

    it('should return false for non-image elements', () => {
      const nonImageElements = [
        { type: 'text', id: 'test-id' },
        { type: 'shape', id: 'test-id' },
        { type: 'video', id: 'test-id' },
      ];

      nonImageElements.forEach((element) => {
        expect(converter.canConvert(element as any)).toBe(false);
      });
    });
  });

  describe('convert', () => {
    it('should convert image with base64 data', () => {
      const pptxElement = {
        type: 'image',
        id: 'pptx-image-1',
        left: 100,
        top: 100,
        width: 400,
        height: 300,
        rotate: 0,
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.type).toBe('image');
      expect(result.src).toStartWith('data:image');
      expect(result.left).toBe(100);
      expect(result.top).toBe(100);
      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
    });

    it('should convert image with external URL', () => {
      const pptxElement = {
        type: 'image',
        id: 'pptx-image-1',
        left: 0,
        top: 0,
        width: 200,
        height: 150,
        rotate: 0,
        src: 'https://example.com/image.png',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.type).toBe('image');
      expect(result.src).toBe('https://example.com/image.png');
    });

    it('should set fixedRatio to true', () => {
      const pptxElement = {
        type: 'image',
        id: 'pptx-image-1',
        left: 0,
        top: 0,
        width: 300,
        height: 200,
        rotate: 0,
        src: 'data:image/png;base64,abc123',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.fixedRatio).toBe(true);
    });

    it('should handle rotated images', () => {
      const pptxElement = {
        type: 'image',
        id: 'pptx-image-1',
        left: 150,
        top: 150,
        width: 250,
        height: 250,
        rotate: 90,
        src: 'data:image/jpeg;base64,test123',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.rotate).toBe(90);
    });

    it('should handle flipped images', () => {
      const pptxElement = {
        type: 'image',
        id: 'pptx-image-1',
        left: 0,
        top: 0,
        width: 200,
        height: 200,
        rotate: 0,
        flipH: true,
        flipV: false,
        src: 'data:image/png;base64,test',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.flipH).toBe(true);
      expect(result.flipV).toBe(false);
    });

    it('should add warning for missing src', () => {
      const pptxElement = {
        type: 'image',
        id: 'pptx-image-1',
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        rotate: 0,
        src: '',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(context.warnings.length).toBeGreaterThan(0);
    });

    it('should handle image filters', () => {
      const pptxElement = {
        type: 'image',
        id: 'pptx-image-1',
        left: 0,
        top: 0,
        width: 150,
        height: 100,
        rotate: 0,
        src: 'data:image/png;base64,test',
        filters: {
          blur: '2px',
          brightness: '120%',
          grayscale: '50%',
        },
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.filters).toBeDefined();
      expect(result.filters?.blur).toBe('2px');
      expect(result.filters?.brightness).toBe('120%');
    });

    it('should handle image with shadow', () => {
      const pptxElement = {
        type: 'image',
        id: 'pptx-image-1',
        left: 50,
        top: 50,
        width: 300,
        height: 200,
        rotate: 0,
        src: 'data:image/png;base64,test',
        shadow: {
          h: 5,
          v: 5,
          blur: 10,
          color: '#000000',
        },
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.shadow).toBeDefined();
      expect(result.shadow?.h).toBe(5);
      expect(result.shadow?.v).toBe(5);
    });

    it('should handle image clip', () => {
      const pptxElement = {
        type: 'image',
        id: 'pptx-image-1',
        left: 0,
        top: 0,
        width: 200,
        height: 200,
        rotate: 0,
        src: 'data:image/png;base64,test',
        clip: {
          range: [[10, 10], [90, 90]],
          shape: 'circle',
        },
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.clip).toBeDefined();
      expect(result.clip?.shape).toBe('circle');
    });

    it('should generate valid PPTist image element structure', () => {
      const pptxElement = {
        type: 'image',
        id: 'pptx-image-1',
        left: 100,
        top: 100,
        width: 400,
        height: 300,
        rotate: 0,
        src: 'data:image/png;base64,iVBORw0KGgo',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result).toMatchObject({
        type: 'image',
        left: expect.any(Number),
        top: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
        rotate: expect.any(Number),
        fixedRatio: true,
        src: expect.any(String),
      });
    });

    it('should handle different image formats', () => {
      const formats = ['png', 'jpeg', 'gif', 'webp', 'svg'];

      formats.forEach((format) => {
        const pptxElement = {
          type: 'image',
          id: `pptx-image-${format}`,
          left: 0,
          top: 0,
          width: 100,
          height: 100,
          rotate: 0,
          src: `data:image/${format};base64,test`,
        };

        const result = converter.convert(pptxElement as any, context);
        expect(result.src).toContain(`image/${format}`);
      });
    });
  });
});
