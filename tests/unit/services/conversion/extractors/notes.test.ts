/**
 * Notes Extractor Unit Tests
*
 * Tests for notes extraction functionality.
 *
 * @module tests/unit/services/conversion/extractors
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NotesExtractor } from '../../../../src/services/conversion/extractors/notes';

describe('Notes Extractor - Unit Tests', () => {
  let extractor: NotesExtractor;

  beforeEach(() => {
    extractor = new NotesExtractor();
  });

  describe('extractNotes', () => {
    it('should extract notes from notes slide XML', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p>
                  <a:r>
                    <a:t>These are speaker notes for this slide.</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractNotes(notesSlideXml);

      expect(result).toBe('These are speaker notes for this slide.');
    });

    it('should return undefined for empty notes', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p>
                  <a:r>
                    <a:t>Click to add notes</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractNotes(notesSlideXml);

      expect(result).toBeUndefined();
    });

    it('should extract multi-paragraph notes', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p>
                  <a:r><a:t>First paragraph.</a:t></a:r>
                </a:p>
                <a:p>
                  <a:r><a:t>Second paragraph.</a:t></a:r>
                </a:p>
                <a:p>
                  <a:r><a:t>Third paragraph.</a:t></a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractNotes(notesSlideXml);

      expect(result).toContain('First paragraph.');
      expect(result).toContain('Second paragraph.');
      expect(result).toContain('Third paragraph.');
    });

    it('should handle invalid XML', () => {
      const notesSlideXml = 'invalid xml';
      const result = extractor.extractNotes(notesSlideXml);
      expect(result).toBeUndefined();
    });

    it('should handle empty XML', () => {
      const notesSlideXml = '';
      const result = extractor.extractNotes(notesSlideXml);
      expect(result).toBeUndefined();
    });

    it('should filter out placeholder text', () => {
      const placeholderTexts = [
        'Click to add notes',
        'Click to add note',
        'Add notes',
        'Notes',
      ];

      placeholderTexts.forEach((text) => {
        const notesSlideXml = `
          <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                   xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <p:spTree>
              <p:sp>
                <p:txBody>
                  <a:p>
                    <a:r><a:t>${text}</a:t></a:r>
                  </a:p>
                </p:txBody>
              </p:sp>
            </p:spTree>
          </p:notes>
        `;

        const result = extractor.extractNotes(notesSlideXml);
        expect(result).toBeUndefined();
      });
    });

    it('should preserve text formatting in notes', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p>
                  <a:r>
                    <a:rPr>
                      <a:b val="1"/>
                      <a:i val="0"/>
                    </a:rPr>
                    <a:t>Bold notes</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractNotes(notesSlideXml);

      expect(result).toContain('Bold notes');
    });
  });

  describe('extractStructuredNotes', () => {
    it('should extract structured notes with paragraphs', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p>
                  <a:r><a:t>Paragraph 1</a:t></a:r>
                </a:p>
                <a:p>
                  <a:r><a:t>Paragraph 2</a:t></a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractStructuredNotes(notesSlideXml);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.paragraphs).toHaveLength(2);
      expect(result.paragraphs[0].text).toBe('Paragraph 1');
      expect(result.paragraphs[1].text).toBe('Paragraph 2');
    });

    it('should include formatting info in paragraphs', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p>
                  <a:pPr>
                    <a:lnSpc>
                      <a:spcPct val="20000"/>
                    </a:lnSpc>
                  </a:pPr>
                  <a:r><a:t>Text with spacing</a:t></a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractStructuredNotes(notesSlideXml);

      expect(result.paragraphs).toBeDefined();
      expect(result.paragraphs.length).toBeGreaterThan(0);
    });

    it('should return undefined for placeholder notes', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p>
                  <a:r><a:t>Click to add notes</a:t></a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractStructuredNotes(notesSlideXml);

      expect(result).toBeUndefined();
    });

    it('should handle notes with lists', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p>
                  <a:pPr>
                    <a:buChar val="•"/>
                  </a:pPr>
                  <a:r><a:t>List item 1</a:t></a:r>
                </a:p>
                <a:p>
                  <a:pPr>
                    <a:buChar val="•"/>
                  </a:pPr>
                  <a:r><a:t>List item 2</a:t></a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractStructuredNotes(notesSlideXml);

      expect(result).toBeDefined();
      expect(result.paragraphs.some(p => p.hasBullet)).toBe(true);
    });

    it('should indicate hasFormatting correctly', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p><a:r><a:t>Single paragraph</a:t></a:r></a:p>
                <a:p><a:r><a:t>Another paragraph</a:t></a:r></a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractStructuredNotes(notesSlideXml);

      expect(result.hasFormatting).toBe(true);
      expect(result.paragraphs.length).toBeGreaterThan(1);
    });
  });

  describe('Text Validation', () => {
    it('should validate very short text as invalid', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p><a:r><a:t>a</a:t></a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractNotes(notesSlideXml);

      expect(result).toBeUndefined();
    });

    it('should validate empty text as invalid', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p><a:r></a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractNotes(notesSlideXml);

      expect(result).toBeUndefined();
    });

    it('should accept text longer than 1 character', () => {
      const notesSlideXml = `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spTree>
            <p:sp>
              <p:txBody>
                <a:p><a:r><a:t>Valid note</a:t></a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:notes>
      `;

      const result = extractor.extractNotes(notesSlideXml);

      expect(result).toBe('Valid note');
    });
  });
});
