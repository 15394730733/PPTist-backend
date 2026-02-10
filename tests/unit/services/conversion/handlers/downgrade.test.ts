/**
 * Downgrade Handler Unit Tests
 *
 * Tests for downgrade handler functionality.
 *
 * @module tests/unit/services/conversion/handlers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DowngradeHandler, UnsupportedElementType, DowngradeStrategy } from '../../../../src/services/conversion/handlers/downgrade';

describe('Downgrade Handler - Unit Tests', () => {
  let handler: DowngradeHandler;
  const mockWarnings: any[] = [];

  beforeEach(() => {
    handler = new DowngradeHandler();
    mockWarnings.length = 0;
  });

  describe('handleUnsupportedElement', () => {
    it('should convert SmartArt to image', () => {
      const element = {
        id: 'smartart-1',
        type: 'smartart',
        left: 100,
        top: 100,
        width: 300,
        height: 200,
      };

      const result = handler.handleUnsupportedElement(
        element as any,
        UnsupportedElementType.SMARTART,
        DowngradeStrategy.TO_IMAGE,
        mockWarnings
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('image');
      expect(result.id).toBe('smartart-1');
      expect(mockWarnings.length).toBe(1);
      expect(mockWarnings[0].type).toBe('DOWNGRADED');
      expect(mockWarnings[0].elementType).toBe('SmartArt');
    });

    it('should remove 3D models', () => {
      const element = {
        id: '3d-model-1',
        type: '3d',
        left: 50,
        top: 50,
        width: 200,
        height: 200,
      };

      const result = handler.handleUnsupportedElement(
        element as any,
        UnsupportedElementType.THREE_D_MODEL,
        DowngradeStrategy.REMOVE,
        mockWarnings
      );

      expect(result).toBeUndefined();
      expect(mockWarnings.length).toBe(1);
    });

    it('should keep but warn about artistic effects', () => {
      const element = {
        id: 'shape-1',
        type: 'shape',
        left: 0,
        top: 0,
        width: 150,
        height: 100,
      };

      const result = handler.handleUnsupportedElement(
        element as any,
        UnsupportedElementType.ARTISTIC_EFFECT,
        DowngradeStrategy.KEEP_WITH_WARNING,
        mockWarnings
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('shape-1');
      expect(mockWarnings.length).toBe(1);
    });

    it('should convert to shape when requested', () => {
      const element = {
        id: 'chart-1',
        type: 'chart',
        left: 100,
        top: 100,
        width: 400,
        height: 300,
      };

      const result = handler.handleUnsupportedElement(
        element as any,
        UnsupportedElementType.DIAGRAM,
        DowngradeStrategy.TO_SHAPE,
        mockWarnings
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('shape');
      expect(result.name).toContain('已简化');
    });
  });

  describe('getRecommendedStrategy', () => {
    it('should recommend TO_IMAGE for SmartArt', () => {
      const strategy = handler.getRecommendedStrategy(UnsupportedElementType.SMARTART);
      expect(strategy).toBe(DowngradeStrategy.TO_IMAGE);
    });

    it('should recommend TO_IMAGE for 3D models', () => {
      const strategy = handler.getRecommendedStrategy(UnsupportedElementType.THREE_D_MODEL);
      expect(strategy).toBe(DowngradeStrategy.TO_IMAGE);
    });

    it('should recommend REMOVE for ink', () => {
      const strategy = handler.getRecommendedStrategy(UnsupportedElementType.INK);
      expect(strategy).toBe(DowngradeStrategy.REMOVE);
    });

    it('should recommend KEEP_WITH_WARNING for artistic effects', () => {
      const strategy = handler.getRecommendedStrategy(UnsupportedElementType.ARTISTIC_EFFECT);
      expect(strategy).toBe(DowngradeStrategy.KEEP_WITH_WARNING);
    });

    it('should recommend TO_IMAGE by default', () => {
      const strategy = handler.getRecommendedStrategy(UnsupportedElementType.MATH_EQUATION);
      expect(strategy).toBe(DowngradeStrategy.TO_IMAGE);
    });
  });

  describe('Warning Generation', () => {
    it('should generate warning with proper structure', () => {
      const element = {
        id: 'test-element',
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      };

      handler.handleUnsupportedElement(
        element as any,
        UnsupportedElementType.SMARTART,
        DowngradeStrategy.TO_IMAGE,
        mockWarnings
      );

      const warning = mockWarnings[0];

      expect(warning).toHaveProperty('id');
      expect(warning).toHaveProperty('type', 'DOWNGRADED');
      expect(warning).toHaveProperty('elementType');
      expect(warning).toHaveProperty('elementId');
      expect(warning).toHaveProperty('message');
      expect(warning).toHaveProperty('suggestion');
      expect(warning).toHaveProperty('severity');
      expect(warning).toHaveProperty('timestamp');
    });

    it('should include helpful suggestion', () => {
      const element = { id: 'test', left: 0, top: 0, width: 100, height: 100 };

      handler.handleUnsupportedElement(
        element as any,
        UnsupportedElementType.SMARTART,
        DowngradeStrategy.TO_IMAGE,
        mockWarnings
      );

      const suggestion = mockWarnings[0].suggestion;

      expect(suggestion).toBeTruthy();
      expect(typeof suggestion).toBe('string');
    });

    it('should set appropriate severity level', () => {
      const element = { id: 'test', left: 0, top: 0, width: 100, height: 100 };

      handler.handleUnsupportedElement(
        element as any,
        UnsupportedElementType.INK,
        DowngradeStrategy.REMOVE,
        mockWarnings
      );

      expect(mockWarnings[0].severity).toBe('high');
    });
  });

  describe('Placeholder Generation', () => {
    it('should generate placeholder image', () => {
      const element = {
        id: 'no-image',
        left: 50,
        top: 50,
        width: 200,
        height: 150,
      };

      const result = handler.handleUnsupportedElement(
        element as any,
        UnsupportedElementType.SMARTART,
        DowngradeStrategy.TO_IMAGE,
        mockWarnings
      );

      expect(result.src).toContain('data:image/svg+xml');
    });

    it('should preserve original element properties', () => {
      const element = {
        id: 'original-1',
        left: 100,
        top: 200,
        width: 300,
        height: 250,
        rotate: 45,
      };

      const result = handler.handleUnsupportedElement(
        element as any,
        UnsupportedElementType.SMARTART,
        DowngradeStrategy.TO_IMAGE,
        mockWarnings
      );

      expect(result.left).toBe(100);
      expect(result.top).toBe(200);
      expect(result.width).toBe(300);
      expect(result.height).toBe(250);
      expect(result.rotate).toBe(45);
    });

    it('should indicate placeholder in name', () => {
      const element = { id: 'test', left: 0, top: 0, width: 100, height: 100 };

      const result = handler.handleUnsupportedElement(
        element as any,
        UnsupportedElementType.THREE_D_MODEL,
        DowngradeStrategy.TO_IMAGE,
        mockWarnings
      );

      expect(result.name).toContain('已转换为图片');
    });
  });
});
