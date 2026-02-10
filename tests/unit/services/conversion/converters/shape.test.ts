/**
 * Shape Converter Unit Tests
 *
 * Tests for shape element conversion.
 *
 * @module tests/unit/services/conversion/converters
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ShapeConverter } from '../../../../src/services/conversion/converters/shape';
import type { ConversionContext } from '../../../../src/types/converters';

describe('Shape Converter - Unit Tests', () => {
  let converter: ShapeConverter;
  let context: ConversionContext;

  beforeEach(() => {
    converter = new ShapeConverter();
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
    it('should return true for shape elements', () => {
      const shapeElement = {
        type: 'shape',
        id: 'test-shape',
      };
      expect(converter.canConvert(shapeElement)).toBe(true);
    });

    it('should return false for non-shape elements', () => {
      const nonShapeElements = [
        { type: 'text', id: 'test-id' },
        { type: 'image', id: 'test-id' },
        { type: 'line', id: 'test-id' },
      ];

      nonShapeElements.forEach((element) => {
        expect(converter.canConvert(element as any)).toBe(false);
      });
    });
  });

  describe('convert', () => {
    it('should convert basic rectangle shape', () => {
      const pptxElement = {
        type: 'shape',
        id: 'pptx-shape-1',
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        rotate: 0,
        shapeType: 'rectangle',
        path: 'M0,0H200V150H0Z',
        viewBox: [200, 150],
        fill: '#ff0000',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.type).toBe('shape');
      expect(result.path).toBe('M0,0H200V150H0Z');
      expect(result.viewBox).toEqual([200, 150]);
      expect(result.fill).toBe('#ff0000');
    });

    it('should convert shape with gradient', () => {
      const pptxElement = {
        type: 'shape',
        id: 'pptx-shape-1',
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        rotate: 0,
        shapeType: 'ellipse',
        path: 'M50,0C77.6,0,100,22.4,100,50C100,77.6,77.6,100,50,100C22.4,100,0,77.6,0,50C0,22.4,22.4,0,50,0Z',
        viewBox: [100, 100],
        fill: '#ffffff',
        gradient: {
          type: 'linear',
          colors: [
            { pos: 0, color: '#ff0000' },
            { pos: 100, color: '#0000ff' },
          ],
          rotate: 45,
        },
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.gradient).toBeDefined();
      expect(result.gradient?.type).toBe('linear');
      expect(result.gradient?.colors).toHaveLength(2);
    });

    it('should convert shape with outline', () => {
      const pptxElement = {
        type: 'shape',
        id: 'pptx-shape-1',
        left: 50,
        top: 50,
        width: 150,
        height: 100,
        rotate: 0,
        shapeType: 'rectangle',
        path: 'M0,0H150V100H0Z',
        viewBox: [150, 100],
        fill: '#00ff00',
        outline: {
          style: 'solid',
          width: 2,
          color: '#000000',
        },
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.outline).toBeDefined();
      expect(result.outline?.style).toBe('solid');
      expect(result.outline?.width).toBe(2);
      expect(result.outline?.color).toBe('#000000');
    });

    it('should convert shape with shadow', () => {
      const pptxElement = {
        type: 'shape',
        id: 'pptx-shape-1',
        left: 0,
        top: 0,
        width: 120,
        height: 80,
        rotate: 0,
        shapeType: 'rectangle',
        path: 'M0,0H120V80H0Z',
        viewBox: [120, 80],
        fill: '#0000ff',
        shadow: {
          h: 3,
          v: 3,
          blur: 6,
          color: '#808080',
        },
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.shadow).toBeDefined();
      expect(result.shadow?.h).toBe(3);
      expect(result.shadow?.v).toBe(3);
    });

    it('should convert shape with text inside', () => {
      const pptxElement = {
        type: 'shape',
        id: 'pptx-shape-1',
        left: 100,
        top: 100,
        width: 200,
        height: 100,
        rotate: 0,
        shapeType: 'rectangle',
        path: 'M0,0H200V100H0Z',
        viewBox: [200, 100],
        fill: '#ffff00',
        text: {
          content: 'Shape Text',
          defaultFontName: 'Arial',
          defaultColor: '#000000',
          align: 'middle',
        },
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.text).toBeDefined();
      expect(result.text?.content).toBe('Shape Text');
      expect(result.text?.align).toBe('middle');
    });

    it('should handle flipped shapes', () => {
      const pptxElement = {
        type: 'shape',
        id: 'pptx-shape-1',
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        rotate: 0,
        shapeType: 'rectangle',
        path: 'M0,0H100V100H0Z',
        viewBox: [100, 100],
        fill: '#00ffff',
        flipH: true,
        flipV: false,
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.flipH).toBe(true);
      expect(result.flipV).toBe(false);
    });

    it('should handle shape opacity', () => {
      const pptxElement = {
        type: 'shape',
        id: 'pptx-shape-1',
        left: 50,
        top: 50,
        width: 150,
        height: 100,
        rotate: 0,
        shapeType: 'rectangle',
        path: 'M0,0H150V100H0Z',
        viewBox: [150, 100],
        fill: '#ff00ff',
        opacity: 0.5,
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.opacity).toBe(0.5);
    });

    it('should handle rotated shapes', () => {
      const pptxElement = {
        type: 'shape',
        id: 'pptx-shape-1',
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        rotate: 30,
        shapeType: 'rectangle',
        path: 'M0,0H100V100H0Z',
        viewBox: [100, 100],
        fill: '#ffffff',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.rotate).toBe(30);
    });

    it('should add warning for missing path', () => {
      const pptxElement = {
        type: 'shape',
        id: 'pptx-shape-1',
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        rotate: 0,
        shapeType: 'rectangle',
        path: '',
        viewBox: [100, 100],
        fill: '#000000',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(context.warnings.length).toBeGreaterThan(0);
    });

    it('should generate valid PPTist shape element structure', () => {
      const pptxElement = {
        type: 'shape',
        id: 'pptx-shape-1',
        left: 50,
        top: 50,
        width: 200,
        height: 150,
        rotate: 0,
        shapeType: 'rectangle',
        path: 'M0,0H200V150H0Z',
        viewBox: [200, 150],
        fill: '#ff0000',
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result).toMatchObject({
        type: 'shape',
        viewBox: expect.any(Array),
        path: expect.any(String),
        fixedRatio: expect.any(Boolean),
        fill: expect.any(String),
      });
    });

    it('should handle complex shapes with keypoints', () => {
      const pptxElement = {
        type: 'shape',
        id: 'pptx-shape-1',
        left: 0,
        top: 0,
        width: 200,
        height: 200,
        rotate: 0,
        shapeType: 'star',
        path: 'complex path',
        viewBox: [200, 200],
        fill: '#ffff00',
        keypoints: [0, 25, 50, 75, 100],
      };

      const result = converter.convert(pptxElement as any, context);

      expect(result.keypoints).toBeDefined();
      expect(result.keypoints).toHaveLength(5);
    });
  });
});
