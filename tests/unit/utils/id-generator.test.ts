/**
 * ID Generator Unit Tests
 *
 * Tests for ID generation utilities.
 *
 * @module tests/unit/utils/id-generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateElementId,
  generateSlideId,
  generateUUID,
  isValidElementId,
  isUUID,
  extractIdPrefix,
  shortenId,
  IdTracker,
  ID_PREFIXES,
} from '../../../src/utils/id-generator';

describe('ID Generator - Unit Tests', () => {
  describe('generateUUID', () => {
    it('should generate a UUID without dashes', () => {
      const uuid = generateUUID();
      expect(uuid).not.toContain('-');
      expect(uuid).toHaveLength(32);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate valid hexadecimal characters', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{32}$/i);
    });
  });

  describe('generateElementId', () => {
    it('should generate element ID with default prefix', () => {
      const id = generateElementId();
      expect(id).toMatch(/^el_/);
    });

    it('should generate element ID with custom prefix', () => {
      const id = generateElementId('text');
      expect(id).toMatch(/^text_/);
    });

    it('should generate element ID with suffix', () => {
      const id = generateElementId('slide', 1);
      expect(id).toMatch(/^slide_1_/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateElementId();
      const id2 = generateElementId();
      expect(id1).not.toBe(id2);
    });

    it('should include UUID in ID', () => {
      const id = generateElementId('test');
      const parts = id.split('_');
      expect(parts.length).toBeGreaterThanOrEqual(2);
      const uuid = parts[parts.length - 1];
      expect(uuid).toHaveLength(32);
    });
  });

  describe('generateSlideId', () => {
    it('should generate slide ID with correct prefix', () => {
      const id = generateSlideId(1);
      expect(id).toMatch(/^slide_1_/);
    });

    it('should handle slide index 0', () => {
      const id = generateSlideId(0);
      expect(id).toMatch(/^slide_0_/);
    });

    it('should handle large slide numbers', () => {
      const id = generateSlideId(999);
      expect(id).toMatch(/^slide_999_/);
    });

    it('should generate unique slide IDs', () => {
      const id1 = generateSlideId(1);
      const id2 = generateSlideId(1);
      expect(id1).not.toBe(id2);
    });
  });

  describe('ID_PREFIXES', () => {
    it('should have all expected prefixes', () => {
      expect(ID_PREFIXES.SLIDE).toBe('slide');
      expect(ID_PREFIXES.ELEMENT).toBe('el');
      expect(ID_PREFIXES.TEXT).toBe('txt');
      expect(ID_PREFIXES.IMAGE).toBe('img');
      expect(ID_PREFIXES.SHAPE).toBe('shp');
      expect(ID_PREFIXES.LINE).toBe('ln');
      expect(ID_PREFIXES.CHART).toBe('cht');
      expect(ID_PREFIXES.TABLE).toBe('tbl');
      expect(ID_PREFIXES.GROUP).toBe('grp');
      expect(ID_PREFIXES.VIDEO).toBe('vid');
      expect(ID_PREFIXES.AUDIO).toBe('aud');
      expect(ID_PREFIXES.BACKGROUND).toBe('bg');
      expect(ID_PREFIXES.ANIMATION).toBe('anim');
    });
  });

  describe('isValidElementId', () => {
    it('should accept valid element IDs', () => {
      expect(isValidElementId('el_123')).toBe(true);
      expect(isValidElementId('txt_abc123')).toBe(true);
      expect(isValidElementId('slide_1_test')).toBe(true);
      expect(isValidElementId('test_id_123')).toBe(true);
    });

    it('should accept IDs with UUIDs', () => {
      const id = generateElementId();
      expect(isValidElementId(id)).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(isValidElementId('')).toBe(false);
      expect(isValidElementId('test-id')).toBe(false); // dash not allowed
      expect(isValidElementId('test.id')).toBe(false); // dot not allowed
      expect(isValidElementId('test id')).toBe(false); // space not allowed
      expect(isValidElementId('test@id')).toBe(false); // special char not allowed
    });
  });

  describe('isUUID', () => {
    it('should accept valid UUIDs without dashes', () => {
      expect(isUUID('123e4567e89b12d3a456426614174000')).toBe(true);
      expect(isUUID(generateUUID())).toBe(true);
    });

    it('should accept valid UUIDs with dashes', () => {
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('123e4567')).toBe(false);
      expect(isUUID('')).toBe(false);
      expect(isUUID('g23e4567e89b12d3a456426614174000')).toBe(false); // invalid char
    });
  });

  describe('extractIdPrefix', () => {
    it('should extract prefix from ID', () => {
      expect(extractIdPrefix('el_123')).toBe('el');
      expect(extractIdPrefix('txt_abc123')).toBe('txt');
      expect(extractIdPrefix('slide_1_test')).toBe('slide');
    });

    it('should handle IDs without separator', () => {
      expect(extractIdPrefix('test')).toBe('test');
    });

    it('should handle empty string', () => {
      expect(extractIdPrefix('')).toBe('');
    });
  });

  describe('shortenId', () => {
    it('should return short IDs unchanged', () => {
      const shortId = 'el_123';
      expect(shortenId(shortId)).toBe(shortId);
    });

    it('should shorten long IDs', () => {
      const longId = 'el_' + 'a'.repeat(32);
      const shortened = shortenId(longId, 20);
      expect(shortened.length).toBeLessThanOrEqual(20);
    });

    it('should preserve prefix in shortened ID', () => {
      const id = 'text_' + 'a'.repeat(32);
      const shortened = shortenId(id, 20);
      expect(shortened).toMatch(/^text_/);
    });

    it('should allow custom max length', () => {
      const id = 'img_' + 'a'.repeat(32);
      const shortened = shortenId(id, 15);
      expect(shortened.length).toBeLessThanOrEqual(15);
    });
  });

  describe('IdTracker', () => {
    let tracker: IdTracker;

    beforeEach(() => {
      tracker = new IdTracker();
    });

    describe('generateUnique', () => {
      it('should generate unique IDs', () => {
        const id1 = tracker.generateUnique('el');
        const id2 = tracker.generateUnique('el');
        expect(id1).not.toBe(id2);
      });

      it('should track original IDs', () => {
        const originalId = 'pptx-id-123';
        const newId = tracker.generateUnique('el', undefined, originalId);
        expect(tracker.getMappedId(originalId)).toBe(newId);
      });

      it('should mark IDs as used', () => {
        const id = tracker.generateUnique('el');
        expect(tracker.isUsed(id)).toBe(true);
        expect(tracker.isUsed('el_notused')).toBe(false);
      });

      it('should generate ID with suffix', () => {
        const id = tracker.generateUnique('slide', 1);
        expect(id).toMatch(/^slide_1_/);
      });
    });

    describe('getMappedId', () => {
      it('should return undefined for unmapped IDs', () => {
        expect(tracker.getMappedId('unknown')).toBeUndefined();
      });

      it('should return mapped ID for known original IDs', () => {
        const originalId = 'pptx-1';
        const newId = tracker.generateUnique('el', undefined, originalId);
        expect(tracker.getMappedId(originalId)).toBe(newId);
      });
    });

    describe('reset', () => {
      it('should clear all tracked data', () => {
        tracker.generateUnique('el', undefined, 'original1');
        tracker.generateUnique('el', undefined, 'original2');

        tracker.reset();

        expect(tracker.getMappedId('original1')).toBeUndefined();
        expect(tracker.getMappedId('original2')).toBeUndefined();
        expect(tracker.isUsed('el_123')).toBe(false);
      });
    });

    describe('getStats', () => {
      it('should return zero stats initially', () => {
        const stats = tracker.getStats();
        expect(stats.totalIds).toBe(0);
        expect(stats.mappedIds).toBe(0);
      });

      it('should track total IDs generated', () => {
        tracker.generateUnique('el');
        tracker.generateUnique('el');
        tracker.generateUnique('txt');

        const stats = tracker.getStats();
        expect(stats.totalIds).toBe(3);
      });

      it('should track mapped IDs', () => {
        tracker.generateUnique('el', undefined, 'pptx1');
        tracker.generateUnique('el', undefined, 'pptx2');
        tracker.generateUnique('el'); // no original ID

        const stats = tracker.getStats();
        expect(stats.mappedIds).toBe(2);
      });
    });
  });
});
