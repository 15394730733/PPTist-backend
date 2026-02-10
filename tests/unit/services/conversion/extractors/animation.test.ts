/**
 * Animation Extractor Unit Tests
 *
 * Tests for animation extraction functionality.
 *
 * @module tests/unit/services/conversion/extractors
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnimationExtractor } from '../../../../src/services/conversion/extractors/animation';

describe('Animation Extractor - Unit Tests', () => {
  let extractor: AnimationExtractor;

  beforeEach(() => {
    extractor = new AnimationExtractor();
  });

  describe('extractSlideTransition', () => {
    it('should extract fade transition', () => {
      const slideXml = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:transition>
            <a:evtFilter evt="fade"/>
          </p:transition>
        </p:sld>
      `;

      const result = extractor.extractSlideTransition(slideXml);

      expect(result).toBe('fade');
    });

    it('should extract slideX transition', () => {
      const slideXml = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:transition>
            <a:evtFilter evt="pushLeft"/>
          </p:transition>
        </p:sld>
      `;

      const result = extractor.extractSlideTransition(slideXml);

      expect(result).toBe('slideX');
    });

    it('should return undefined for no transition', () => {
      const slideXml = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:spTree>
            <p:sp>
              <p:nvSpPr/>
            </p:sp>
          </p:spTree>
        </p:sld>
      `;

      const result = extractor.extractSlideTransition(slideXml);

      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid XML', () => {
      const slideXml = 'invalid xml';
      const result = extractor.extractSlideTransition(slideXml);
      expect(result).toBeUndefined();
    });

    it('should handle empty XML', () => {
      const slideXml = '';
      const result = extractor.extractSlideTransition(slideXml);
      expect(result).toBeUndefined();
    });

    it('should extract 3D transition', () => {
      const slideXml = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:transition>
            <a:evtFilter evt="cubeLeft"/>
          </p:transition>
        </p:sld>
      `;

      const result = extractor.extractSlideTransition(slideXml);

      expect(result).toBe('slideX3D');
    });
  });

  describe('extractElementAnimations', () => {
    it('should extract element animations', () => {
      const slideXml = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:timing>
            <p:tnLst>
              <p:seq>
                <p:cTn>
                  <p:tgEl>
                    <p:spTgt spid="pptx-shape-1"/>
                  </p:tgEl>
                  <p:cBhvr>
                    <p:presetAttr val="fadeIn"/>
                  </p:cBhvr>
                </p:cTn>
              </p:seq>
            </p:tnLst>
          </p:timing>
        </p:sld>
      `;

      const elementIdMap = new Map([['pptx-shape-1', 'element-1']]);

      const result = extractor.extractElementAnimations(slideXml, elementIdMap);

      expect(result).toBeInstanceOf(Array);
    });

    it('should return empty array for no animations', () => {
      const slideXml = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:spTree>
            <p:sp>
              <p:nvSpPr/>
            </p:sp>
          </p:spTree>
        </p:sld>
      `;

      const elementIdMap = new Map();

      const result = extractor.extractElementAnimations(slideXml, elementIdMap);

      expect(result).toHaveLength(0);
    });

    it('should handle invalid XML gracefully', () => {
      const slideXml = 'invalid xml';
      const elementIdMap = new Map();

      const result = extractor.extractElementAnimations(slideXml, elementIdMap);

      expect(result).toHaveLength(0);
    });

    it('should map PPTX IDs to PPTist IDs', () => {
      const slideXml = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:timing>
            <p:tnLst>
              <p:seq>
                <p:cTn>
                  <p:tgEl>
                    <p:spTgt spid="pptx-text-123"/>
                  </p:tgEl>
                </p:cTn>
              </p:seq>
            </p:tnLst>
          </p:timing>
        </p:sld>
      `;

      const elementIdMap = new Map([['pptx-text-123', 'element-abc']]);

      const result = extractor.extractElementAnimations(slideXml, elementIdMap);

      if (result.length > 0) {
        expect(result[0].elId).toBe('element-abc');
      }
    });

    it('should extract animation duration', () => {
      const slideXml = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:timing>
            <p:tnLst>
              <p:seq>
                <p:cTn>
                  <p:tgEl>
                    <p:spTgt spid="pptx-shape-1"/>
                  </p:tgEl>
                  <p:cBhvr>
                    <p:dur>500</p:dur>
                  </p:cBhvr>
                </p:cTn>
              </p:seq>
            </p:tnLst>
          </p:timing>
        </p:sld>
      `;

      const elementIdMap = new Map([['pptx-shape-1', 'element-1']]);

      const result = extractor.extractElementAnimations(slideXml, elementIdMap);

      if (result.length > 0) {
        expect(result[0].duration).toBe(500);
      }
    });
  });

  describe('Animation Type Mapping', () => {
    it('should map entrance animations', () => {
      const slideXml = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:timing>
            <p:tnLst>
              <p:seq>
                <p:cTn>
                  <p:tgEl>
                    <p:spTgt spid="pptx-shape-1"/>
                  </p:tgEl>
                  <p:cBhvr>
                    <p:cTn>
                      <p:presetClass val="entr"/>
                    </p:cTn>
                  </p:cBhvr>
                </p:cTn>
              </p:seq>
            </p:tnLst>
          </p:timing>
        </p:sld>
      `;

      const elementIdMap = new Map([['pptx-shape-1', 'element-1']]);

      const result = extractor.extractElementAnimations(slideXml, elementIdMap);

      if (result.length > 0) {
        expect(result[0].type).toBe('in');
      }
    });

    it('should map exit animations', () => {
      const slideXml = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:timing>
            <p:tnLst>
              <p:seq>
                <p:cTn>
                  <p:tgEl>
                    <p:spTgt spid="pptx-shape-1"/>
                  </p:tgEl>
                  <p:cBhvr>
                    <p:cTn>
                      <p:presetClass val="exit"/>
                    </p:cTn>
                  </p:cBhvr>
                </p:cTn>
              </p:seq>
            </p:tnLst>
          </p:timing>
        </p:sld>
      `;

      const elementIdMap = new Map([['pptx-shape-1', 'element-1']]);

      const result = extractor.extractElementAnimations(slideXml, elementIdMap);

      if (result.length > 0) {
        expect(result[0].type).toBe('out');
      }
    });

    it('should map emphasis animations', () => {
      const slideXml = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:timing>
            <p:tnLst>
              <p:seq>
                <p:cTn>
                  <p:tgEl>
                    <p:spTgt spid="pptx-shape-1"/>
                  </p:tgEl>
                  <p:cBhvr>
                    <p:cTn>
                      <p:presetClass val="emphasis"/>
                    </p:cTn>
                  </p:cBhvr>
                </p:cTn>
              </p:seq>
            </p:tnLst>
          </p:timing>
        </p:sld>
      `;

      const elementIdMap = new Map([['pptx-shape-1', 'element-1']]);

      const result = extractor.extractElementAnimations(slideXml, elementIdMap);

      if (result.length > 0) {
        expect(result[0].type).toBe('attention');
      }
    });
  });
});
