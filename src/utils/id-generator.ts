/**
 * Element ID Generator
 *
 * Generates unique IDs for PPTist elements following the UUID format.
 * Ensures IDs are unique and follow the expected format.
 *
 * @module utils/id-generator
 */

import { randomUUID } from 'crypto';
import { logger } from './logger.js';

/**
 * ID prefix for different element types
 */
export const ID_PREFIXES = {
  SLIDE: 'slide',
  ELEMENT: 'el',
  TEXT: 'txt',
  IMAGE: 'img',
  SHAPE: 'shp',
  LINE: 'ln',
  CHART: 'cht',
  TABLE: 'tbl',
  GROUP: 'grp',
  VIDEO: 'vid',
  AUDIO: 'aud',
  BACKGROUND: 'bg',
  ANIMATION: 'anim',
} as const;

/**
 * ID separator
 */
const ID_SEPARATOR = '_';

/**
 * ID counter for sequential IDs (fallback)
 */
const idCounters: Map<string, number> = new Map();

/**
 * Generate a UUID-based element ID
 *
 * @returns UUID string (no dashes for PPTist compatibility)
 */
export function generateUUID(): string {
  return randomUUID().replace(/-/g, '');
}

/**
 * Generate a PPTist-compatible element ID
 *
 * @param prefix - ID prefix (e.g., 'el', 'txt', 'img')
 * @param suffix - Optional suffix (e.g., slide index)
 * @returns PPTist element ID
 */
export function generateElementId(
  prefix: string = ID_PREFIXES.ELEMENT,
  suffix?: string | number
): string {
  const uuid = generateUUID();

  if (suffix !== undefined) {
    return `${prefix}${ID_SEPARATOR}${suffix}${ID_SEPARATOR}${uuid}`;
  }

  return `${prefix}${ID_SEPARATOR}${uuid}`;
}

/**
 * Generate slide ID
 *
 * @param slideIndex - Slide index (1-based)
 * @returns Slide ID
 */
export function generateSlideId(slideIndex: number): string {
  return generateElementId(ID_PREFIXES.SLIDE, slideIndex);
}

/**
 * Generate text element ID
 *
 * @param index - Text element index
 * @returns Text element ID
 */
export function generateTextElementId(index: number): string {
  return generateElementId(ID_PREFIXES.TEXT, index);
}

/**
 * Generate image element ID
 *
 * @param index - Image element index
 * @returns Image element ID
 */
export function generateImageElementId(index: number): string {
  return generateElementId(ID_PREFIXES.IMAGE, index);
}

/**
 * Generate shape element ID
 *
 * @param index - Shape element index
 * @returns Shape element ID
 */
export function generateShapeElementId(index: number): string {
  return generateElementId(ID_PREFIXES.SHAPE, index);
}

/**
 * Generate line element ID
 *
 * @param index - Line element index
 * @returns Line element ID
 */
export function generateLineElementId(index: number): string {
  return generateElementId(ID_PREFIXES.LINE, index);
}

/**
 * Generate chart element ID
 *
 * @param index - Chart element index
 * @returns Chart element ID
 */
export function generateChartElementId(index: number): string {
  return generateElementId(ID_PREFIXES.CHART, index);
}

/**
 * Generate table element ID
 *
 * @param index - Table element index
 * @returns Table element ID
 */
export function generateTableElementId(index: number): string {
  return generateElementId(ID_PREFIXES.TABLE, index);
}

/**
 * Generate group element ID
 *
 * @param index - Group element index
 * @returns Group element ID
 */
export function generateGroupElementId(index: number): string {
  return generateElementId(ID_PREFIXES.GROUP, index);
}

/**
 * Generate video element ID
 *
 * @param index - Video element index
 * @returns Video element ID
 */
export function generateVideoElementId(index: number): string {
  return generateElementId(ID_PREFIXES.VIDEO, index);
}

/**
 * Generate audio element ID
 *
 * @param index - Audio element index
 * @returns Audio element ID
 */
export function generateAudioElementId(index: number): string {
  return generateElementId(ID_PREFIXES.AUDIO, index);
}

/**
 * Generate background ID
 *
 * @param slideIndex - Slide index
 * @returns Background ID
 */
export function generateBackgroundId(slideIndex: number): string {
  return generateElementId(ID_PREFIXES.BACKGROUND, slideIndex);
}

/**
 * Generate animation ID
 *
 * @param index - Animation index
 * @returns Animation ID
 */
export function generateAnimationId(index: number): string {
  return generateElementId(ID_PREFIXES.ANIMATION, index);
}

/**
 * Generate sequential ID (fallback for deterministic IDs)
 *
 * @param prefix - ID prefix
 * @returns Sequential ID
 */
export function generateSequentialId(prefix: string): string {
  const counter = idCounters.get(prefix) || 0;
  idCounters.set(prefix, counter + 1);
  return `${prefix}${ID_SEPARATOR}${counter}`;
}

/**
 * Reset ID counter for a prefix
 *
 * @param prefix - ID prefix
 */
export function resetIdCounter(prefix: string): void {
  idCounters.set(prefix, 0);
}

/**
 * Reset all ID counters
 */
export function resetAllIdCounters(): void {
  idCounters.clear();
}

/**
 * Validate PPTist element ID format
 *
 * @param id - ID to validate
 * @returns true if valid
 */
export function isValidElementId(id: string): boolean {
  // PPTist IDs should be alphanumeric with underscores
  return /^[a-zA-Z0-9_]+$/.test(id);
}

/**
 * Extract prefix from PPTist element ID
 *
 * @param id - Element ID
 * @returns ID prefix or empty string
 */
export function extractIdPrefix(id: string): string {
  const parts = id.split(ID_SEPARATOR);
  return parts[0] || '';
}

/**
 * Check if ID is a UUID (without dashes)
 *
 * @param id - ID to check
 * @returns true if UUID format
 */
export function isUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{32}$/i;
  return uuidRegex.test(id.replace(/-/g, ''));
}

/**
 * Shorten ID for logging/display purposes
 *
 * @param id - Full ID
 * @param maxLength - Maximum length (default: 20)
 * @returns Shortened ID
 */
export function shortenId(id: string, maxLength: number = 20): string {
  if (id.length <= maxLength) return id;

  // Keep prefix and last few characters
  const parts = id.split(ID_SEPARATOR);
  const prefix = parts[0];
  const uuid = parts[parts.length - 1];

  if (uuid && uuid.length >= 8) {
    const shortUuid = uuid.substring(0, 8);
    return `${prefix}_${shortUuid}`;
  }

  return id.substring(0, maxLength);
}

/**
 * Generate batch of unique IDs
 *
 * @param count - Number of IDs to generate
 * @param prefix - ID prefix
 * @returns Array of unique IDs
 */
export function generateBatchIds(count: number, prefix: string = ID_PREFIXES.ELEMENT): string[] {
  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    ids.push(generateElementId(prefix, i));
  }

  return ids;
}

/**
 * Create an ID tracker to ensure uniqueness across a conversion
 */
export class IdTracker {
  private usedIds: Set<string> = new Set();
  private idMap: Map<string, string> = new Map();

  /**
   * Generate a unique ID, ensuring no duplicates
   *
   * @param prefix - ID prefix
   * @param suffix - Optional suffix
   * @param originalId - Original PPTX ID to track
   * @returns Unique ID
   */
  generateUnique(
    prefix: string,
    suffix?: string | number,
    originalId?: string
  ): string {
    let id: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      id = generateElementId(prefix, suffix);
      attempts++;

      if (attempts > maxAttempts) {
        logger.warn(`Failed to generate unique ID after ${maxAttempts} attempts`, {
          prefix,
          suffix,
        });
        // Fall back to sequential ID
        id = generateSequentialId(prefix);
        break;
      }
    } while (this.usedIds.has(id));

    this.usedIds.add(id);

    if (originalId) {
      this.idMap.set(originalId, id);
    }

    return id;
  }

  /**
   * Get mapped ID for original PPTX ID
   *
   * @param originalId - Original PPTX ID
   * @returns Mapped ID or undefined
   */
  getMappedId(originalId: string): string | undefined {
    return this.idMap.get(originalId);
  }

  /**
   * Check if ID has been used
   *
   * @param id - ID to check
   * @returns true if already used
   */
  isUsed(id: string): boolean {
    return this.usedIds.has(id);
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.usedIds.clear();
    this.idMap.clear();
  }

  /**
   * Get statistics
   */
  getStats(): { totalIds: number; mappedIds: number } {
    return {
      totalIds: this.usedIds.size,
      mappedIds: this.idMap.size,
    };
  }
}

/**
 * Global ID tracker instance
 */
export const globalIdTracker = new IdTracker();

/**
 * Generate unique ID using global tracker
 *
 * @param prefix - ID prefix
 * @param suffix - Optional suffix
 * @param originalId - Original PPTX ID to track
 * @returns Unique ID
 */
export function generateTrackedId(
  prefix: string,
  suffix?: string | number,
  originalId?: string
): string {
  return globalIdTracker.generateUnique(prefix, suffix, originalId);
}
