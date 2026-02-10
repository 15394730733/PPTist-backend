/**
 * Warning Model Unit Tests
 *
 * Tests for warning model functionality.
 *
 * @module tests/unit/models
 */

import { describe, it, expect } from 'vitest';
import {
  ConversionWarning,
  WarningSeverity,
  WarningType,
  createUnsupportedElementWarning,
  createDowngradeWarning,
  createMemoryWarning,
  createCriticalMemoryWarning,
  mapToLegacySeverity,
} from '../../../src/models/warning';

describe('Warning Model - Unit Tests', () => {
  describe('ConversionWarning', () => {
    it('should create valid warning object', () => {
      const warning: ConversionWarning = {
        id: 'warning-1',
        type: 'UNSUPPORTED_ELEMENT',
        elementType: 'SmartArt',
        elementId: 'element-123',
        message: 'SmartArt not supported',
        suggestion: 'Convert to image manually',
        severity: 'low',
        timestamp: Date.now(),
      };

      expect(warning.id).toBe('warning-1');
      expect(warning.type).toBe('UNSUPPORTED_ELEMENT');
      expect(warning.elementType).toBe('SmartArt');
      expect(warning.elementId).toBe('element-123');
      expect(warning.message).toBeTruthy();
      expect(warning.suggestion).toBeTruthy();
      expect(warning.severity).toBe('low');
      expect(typeof warning.timestamp).toBe('number');
    });

    it('should accept all severity levels', () => {
      const severities: WarningSeverity[] = ['low', 'medium', 'high', 'critical'];

      severities.forEach((severity) => {
        const warning: ConversionWarning = {
          id: `warning-${severity}`,
          type: 'TEST_WARNING',
          elementType: 'Test',
          elementId: 'test-element',
          message: 'Test message',
          suggestion: 'Test suggestion',
          severity,
          timestamp: Date.now(),
        };

        expect(warning.severity).toBe(severity);
      });
    });

    it('should accept all warning types', () => {
      const types: WarningType[] = [
        'UNSUPPORTED_ELEMENT',
        'DOWNGRADED',
        'MISSING_MEDIA',
        'MEMORY_WARNING',
        'MEMORY_CRITICAL',
        'MACRO_IGNORED',
        'ACTIVEX_IGNORED',
        'FILE_TOO_LARGE',
        'INVALID_FILE_TYPE',
        'ENCRYPTED_FILE',
        'CORRUPTED_FILE',
      ];

      types.forEach((type) => {
        const warning: ConversionWarning = {
          id: `warning-${type}`,
          type,
          elementType: 'Test',
          elementId: 'test-element',
          message: 'Test',
          suggestion: 'Test',
          severity: 'low',
          timestamp: Date.now(),
        };

        expect(warning.type).toBe(type);
      });
    });

    it('should allow optional metadata', () => {
      const warning: ConversionWarning = {
        id: 'warning-meta',
        type: 'UNSUPPORTED_ELEMENT',
        elementType: 'Test',
        elementId: 'test-element',
        message: 'Test message',
        suggestion: 'Test suggestion',
        severity: 'low',
        timestamp: Date.now(),
        metadata: {
          originalType: 'pptxSmartArt',
          fallbackStrategy: 'to_image',
          additionalInfo: 'Could not parse SmartArt structure',
        },
      };

      expect(warning.metadata).toBeDefined();
      expect(warning.metadata?.originalType).toBe('pptxSmartArt');
      expect(warning.metadata?.fallbackStrategy).toBe('to_image');
    });
  });

  describe('Warning Severity Levels', () => {
    it('should order severity correctly', () => {
      const severityOrder: WarningSeverity[] = ['low', 'medium', 'high', 'critical'];

      expect(severityOrder[0]).toBe('low');
      expect(severityOrder[1]).toBe('medium');
      expect(severityOrder[2]).toBe('high');
      expect(severityOrder[3]).toBe('critical');
    });

    it('should compare severity levels', () => {
      const compareSeverity = (a: WarningSeverity, b: WarningSeverity): number => {
        const order = { low: 0, medium: 1, high: 2, critical: 3 };
        return order[a] - order[b];
      };

      expect(compareSeverity('low', 'medium')).toBeLessThan(0);
      expect(compareSeverity('high', 'low')).toBeGreaterThan(0);
      expect(compareSeverity('critical', 'critical')).toBe(0);
    });
  });

  describe('Warning Factory', () => {
    it('should create unsupported element warning', () => {
      const warning = createUnsupportedElementWarning({
        elementId: 'element-1',
        elementType: 'SmartArt',
        message: 'SmartArt is not supported in PPTist',
        suggestion: 'Convert to image',
      });

      expect(warning.type).toBe('UNSUPPORTED_ELEMENT');
      expect(warning.context?.elementType).toBe('SmartArt');
      expect(warning.context?.elementId).toBe('element-1');
      expect(warning.severity).toBe('info');
    });

    it('should create downgrade warning', () => {
      const warning = createDowngradeWarning({
        feature: '3D Model',
        reason: 'PPTist does not support 3D models',
        message: '3D Model 已转换为图片',
        suggestion: 'Review converted image',
      });

      expect(warning.type).toBe('DOWNGRADED');
      expect(warning.context?.feature).toBe('3D Model');
      expect(warning.message).toContain('已转换为图片');
      expect(warning.severity).toBe('info');
    });

    it('should create memory warning', () => {
      const warning = createMemoryWarning({
        usagePercent: 85,
        strategy: 'reduce_concurrency',
        message: 'Memory usage at 85%',
        suggestion: 'Reduce concurrent tasks',
      });

      expect(warning.type).toBe('MEMORY_WARNING');
      expect(warning.message).toContain('85%');
      expect(warning.severity).toBe('info');
    });

    it('should create critical memory warning', () => {
      const warning = createCriticalMemoryWarning({
        usagePercent: 95,
        action: 'abort',
        message: 'Critical memory usage at 95%',
        suggestion: 'System out of memory',
      });

      expect(warning.type).toBe('MEMORY_CRITICAL');
      expect(warning.message).toContain('95%');
      expect(warning.severity).toBe('error');
    });
  });

  describe('Warning Filtering', () => {
    it('should filter warnings by severity', () => {
      const warnings: ConversionWarning[] = [
        {
          id: 'w1',
          type: 'TEST',
          elementType: 'Test',
          elementId: 'e1',
          message: 'Low severity',
          suggestion: 'Fix',
          severity: 'low',
          timestamp: Date.now(),
        },
        {
          id: 'w2',
          type: 'TEST',
          elementType: 'Test',
          elementId: 'e2',
          message: 'High severity',
          suggestion: 'Fix immediately',
          severity: 'high',
          timestamp: Date.now(),
        },
      ];

      const highSeverityWarnings = warnings.filter((w) => w.severity === 'high');
      expect(highSeverityWarnings).toHaveLength(1);
      expect(highSeverityWarnings[0].severity).toBe('high');
    });

    it('should filter warnings by type', () => {
      const warnings: ConversionWarning[] = [
        {
          id: 'w1',
          type: 'UNSUPPORTED_ELEMENT',
          elementType: 'SmartArt',
          elementId: 'e1',
          message: 'Not supported',
          suggestion: 'Convert',
          severity: 'low',
          timestamp: Date.now(),
        },
        {
          id: 'w2',
          type: 'DOWNGRADED',
          elementType: '3D Model',
          elementId: 'e2',
          message: 'Downgraded',
          suggestion: 'Review',
          severity: 'low',
          timestamp: Date.now(),
        },
      ];

      const unsupportedWarnings = warnings.filter((w) => w.type === 'UNSUPPORTED_ELEMENT');
      expect(unsupportedWarnings).toHaveLength(1);
      expect(unsupportedWarnings[0].type).toBe('UNSUPPORTED_ELEMENT');
    });

    it('should filter warnings by element', () => {
      const warnings: ConversionWarning[] = [
        {
          id: 'w1',
          type: 'TEST',
          elementType: 'Test',
          elementId: 'element-1',
          message: 'Warning 1',
          suggestion: 'Fix 1',
          severity: 'low',
          timestamp: Date.now(),
        },
        {
          id: 'w2',
          type: 'TEST',
          elementType: 'Test',
          elementId: 'element-1',
          message: 'Warning 2',
          suggestion: 'Fix 2',
          severity: 'medium',
          timestamp: Date.now(),
        },
        {
          id: 'w3',
          type: 'TEST',
          elementType: 'Test',
          elementId: 'element-2',
          message: 'Warning 3',
          suggestion: 'Fix 3',
          severity: 'low',
          timestamp: Date.now(),
        },
      ];

      const elementWarnings = warnings.filter((w) => w.elementId === 'element-1');
      expect(elementWarnings).toHaveLength(2);
    });
  });

  describe('Warning Sorting', () => {
    it('should sort by severity (critical first)', () => {
      const warnings: ConversionWarning[] = [
        {
          id: 'w1',
          type: 'TEST',
          elementType: 'Test',
          elementId: 'e1',
          message: 'Low',
          suggestion: 'Fix',
          severity: 'low',
          timestamp: Date.now(),
        },
        {
          id: 'w2',
          type: 'TEST',
          elementType: 'Test',
          elementId: 'e2',
          message: 'Critical',
          suggestion: 'Fix now',
          severity: 'critical',
          timestamp: Date.now(),
        },
        {
          id: 'w3',
          type: 'TEST',
          elementType: 'Test',
          elementId: 'e3',
          message: 'Medium',
          suggestion: 'Fix soon',
          severity: 'medium',
          timestamp: Date.now(),
        },
      ];

      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

      const sorted = [...warnings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      expect(sorted[0].severity).toBe('critical');
      expect(sorted[1].severity).toBe('medium');
      expect(sorted[2].severity).toBe('low');
    });

    it('should sort by timestamp (newest first)', () => {
      const now = Date.now();
      const warnings: ConversionWarning[] = [
        {
          id: 'w1',
          type: 'TEST',
          elementType: 'Test',
          elementId: 'e1',
          message: 'Old',
          suggestion: 'Fix',
          severity: 'low',
          timestamp: now - 1000,
        },
        {
          id: 'w2',
          type: 'TEST',
          elementType: 'Test',
          elementId: 'e2',
          message: 'New',
          suggestion: 'Fix',
          severity: 'low',
          timestamp: now,
        },
      ];

      const sorted = [...warnings].sort((a, b) => b.timestamp - a.timestamp);

      expect(sorted[0].id).toBe('w2');
      expect(sorted[1].id).toBe('w1');
    });
  });

  describe('Warning Serialization', () => {
    it('should serialize to JSON', () => {
      const warning: ConversionWarning = {
        id: 'w1',
        type: 'UNSUPPORTED_ELEMENT',
        elementType: 'Test',
        elementId: 'e1',
        message: 'Test message',
        suggestion: 'Test suggestion',
        severity: 'low',
        timestamp: Date.now(),
      };

      const json = JSON.stringify(warning);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual(warning);
    });

    it('should serialize metadata', () => {
      const warning: ConversionWarning = {
        id: 'w1',
        type: 'TEST',
        elementType: 'Test',
        elementId: 'e1',
        message: 'Test',
        suggestion: 'Fix',
        severity: 'low',
        timestamp: Date.now(),
        metadata: {
          originalType: 'SmartArt',
          fallbackStrategy: 'to_image',
        },
      };

      const json = JSON.stringify(warning);
      const parsed = JSON.parse(json);

      expect(parsed.metadata).toEqual(warning.metadata);
    });
  });
});
