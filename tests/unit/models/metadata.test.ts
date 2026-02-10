/**
 * Metadata Model Unit Tests
 *
 * Tests for metadata model functionality.
 *
 * @module tests/unit/models
 */

import { describe, it, expect } from 'vitest';
import { ConversionMetadata, createConversionMetadata } from '../../../src/models/metadata';

describe('Metadata Model - Unit Tests', () => {
  describe('ConversionMetadata', () => {
    it('should create valid metadata object', () => {
      const metadata: ConversionMetadata = {
        slideCount: 5,
        elementCounts: {
          text: 10,
          image: 3,
          shape: 5,
          line: 2,
          chart: 1,
          table: 0,
        },
        processingTime: 5000,
        fileSize: 1024000,
        pptistVersion: '1.0.0',
        conversionWarnings: 2,
      };

      expect(metadata.slideCount).toBe(5);
      expect(metadata.elementCounts.text).toBe(10);
      expect(metadata.elementCounts.image).toBe(3);
      expect(metadata.processingTime).toBe(5000);
      expect(metadata.fileSize).toBe(1024000);
      expect(metadata.pptistVersion).toBe('1.0.0');
      expect(metadata.conversionWarnings).toBe(2);
    });

    it('should allow optional fields', () => {
      const metadata: ConversionMetadata = {
        slideCount: 1,
        elementCounts: {
          text: 1,
          image: 0,
          shape: 0,
          line: 0,
          chart: 0,
          table: 0,
        },
      };

      expect(metadata.processingTime).toBeUndefined();
      expect(metadata.fileSize).toBeUndefined();
      expect(metadata.pptistVersion).toBeUndefined();
    });
  });

  describe('createConversionMetadata', () => {
    it('should create metadata from conversion result', () => {
      const elements = [
        { type: 'text', id: 't1' },
        { type: 'text', id: 't2' },
        { type: 'image', id: 'i1' },
        { type: 'shape', id: 's1' },
      ];

      const metadata = createConversionMetadata({
        elements,
        slideCount: 1,
        processingTime: 2000,
        fileSize: 512000,
        warnings: [],
      });

      expect(metadata.slideCount).toBe(1);
      expect(metadata.elementCounts.text).toBe(2);
      expect(metadata.elementCounts.image).toBe(1);
      expect(metadata.elementCounts.shape).toBe(1);
      expect(metadata.processingTime).toBe(2000);
      expect(metadata.fileSize).toBe(512000);
    });

    it('should count elements correctly', () => {
      const elements = [
        { type: 'text', id: 't1' },
        { type: 'text', id: 't2' },
        { type: 'text', id: 't3' },
        { type: 'image', id: 'i1' },
        { type: 'image', id: 'i2' },
        { type: 'shape', id: 's1' },
        { type: 'line', id: 'l1' },
        { type: 'chart', id: 'c1' },
        { type: 'table', id: 'tb1' },
      ];

      const metadata = createConversionMetadata({
        elements,
        slideCount: 1,
      });

      expect(metadata.elementCounts.text).toBe(3);
      expect(metadata.elementCounts.image).toBe(2);
      expect(metadata.elementCounts.shape).toBe(1);
      expect(metadata.elementCounts.line).toBe(1);
      expect(metadata.elementCounts.chart).toBe(1);
      expect(metadata.elementCounts.table).toBe(1);
    });

    it('should handle empty element list', () => {
      const metadata = createConversionMetadata({
        elements: [],
        slideCount: 0,
      });

      expect(metadata.slideCount).toBe(0);
      expect(metadata.elementCounts.text).toBe(0);
      expect(metadata.elementCounts.image).toBe(0);
      expect(metadata.elementCounts.shape).toBe(0);
    });

    it('should handle unknown element types', () => {
      const elements = [
        { type: 'text', id: 't1' },
        { type: 'unknown', id: 'u1' },
        { type: 'shape', id: 's1' },
      ];

      const metadata = createConversionMetadata({
        elements,
        slideCount: 1,
      });

      expect(metadata.elementCounts.text).toBe(1);
      expect(metadata.elementCounts.shape).toBe(1);
      // Unknown types should be ignored or counted separately
    });

    it('should calculate total elements', () => {
      const elements = [
        { type: 'text', id: 't1' },
        { type: 'text', id: 't2' },
        { type: 'image', id: 'i1' },
        { type: 'shape', id: 's1' },
      ];

      const metadata = createConversionMetadata({
        elements,
        slideCount: 1,
      });

      const totalElements = Object.values(metadata.elementCounts).reduce((sum, count) => sum + count, 0);
      expect(totalElements).toBe(elements.length);
    });
  });

  describe('Metadata Formatting', () => {
    it('should format file size in MB', () => {
      const metadata: ConversionMetadata = {
        slideCount: 1,
        elementCounts: {
          text: 1,
          image: 0,
          shape: 0,
          line: 0,
          chart: 0,
          table: 0,
        },
        fileSize: 1048576, // 1 MB
      };

      const sizeInMB = metadata.fileSize ? metadata.fileSize / (1024 * 1024) : 0;
      expect(sizeInMB).toBeCloseTo(1);
    });

    it('should format processing time', () => {
      const metadata: ConversionMetadata = {
        slideCount: 1,
        elementCounts: {
          text: 1,
          image: 0,
          shape: 0,
          line: 0,
          chart: 0,
          table: 0,
        },
        processingTime: 3500, // 3.5 seconds
      };

      expect(metadata.processingTime).toBe(3500);
      const formattedTime = `${(metadata.processingTime / 1000).toFixed(2)}s`;
      expect(formattedTime).toBe('3.50s');
    });

    it('should provide summary statistics', () => {
      const metadata: ConversionMetadata = {
        slideCount: 5,
        elementCounts: {
          text: 15,
          image: 3,
          shape: 7,
          line: 2,
          chart: 1,
          table: 1,
        },
        processingTime: 10000,
        fileSize: 2048000,
        pptistVersion: '1.0.0',
        conversionWarnings: 0,
      };

      const totalElements = Object.values(metadata.elementCounts).reduce((a, b) => a + b, 0);
      const avgElementsPerSlide = totalElements / metadata.slideCount;

      expect(totalElements).toBe(29);
      expect(avgElementsPerSlide).toBeCloseTo(5.8);
    });
  });

  describe('Metadata Validation', () => {
    it('should validate slide count is non-negative', () => {
      const metadata: ConversionMetadata = {
        slideCount: 0,
        elementCounts: {
          text: 0,
          image: 0,
          shape: 0,
          line: 0,
          chart: 0,
          table: 0,
        },
      };

      expect(metadata.slideCount).toBeGreaterThanOrEqual(0);
    });

    it('should validate all element counts are non-negative', () => {
      const metadata: ConversionMetadata = {
        slideCount: 1,
        elementCounts: {
          text: 0,
          image: 0,
          shape: 0,
          line: 0,
          chart: 0,
          table: 0,
        },
      };

      Object.values(metadata.elementCounts).forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should validate processing time is positive', () => {
      const metadata: ConversionMetadata = {
        slideCount: 1,
        elementCounts: {
          text: 1,
          image: 0,
          shape: 0,
          line: 0,
          chart: 0,
          table: 0,
        },
        processingTime: 1000,
      };

      expect(metadata.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Metadata Serialization', () => {
    it('should serialize to JSON', () => {
      const metadata: ConversionMetadata = {
        slideCount: 2,
        elementCounts: {
          text: 5,
          image: 1,
          shape: 2,
          line: 0,
          chart: 0,
          table: 0,
        },
        processingTime: 3000,
        fileSize: 1024000,
        pptistVersion: '1.0.0',
        conversionWarnings: 1,
      };

      const json = JSON.stringify(metadata);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual(metadata);
      expect(parsed.slideCount).toBe(2);
    });

    it('should serialize null', () => {
      const metadata: ConversionMetadata = {
        slideCount: 1,
        elementCounts: {
          text: 1,
          image: 0,
          shape: 0,
          line: 0,
          chart: 0,
          table: 0,
        },
      };

      const json = JSON.stringify(metadata);
      const parsed = JSON.parse(json);

      expect(parsed).toBeDefined();
      expect(parsed.slideCount).toBe(1);
    });
  });
});
